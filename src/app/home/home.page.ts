import { Component, OnInit } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Preferences } from '@capacitor/preferences';
import {
  LocalNotifications,
  PermissionStatus,
  ScheduleOptions
} from '@capacitor/local-notifications';

type Note  = { id: number; text: string; date: string; prompt: string; author?: string };
type Quote = { text: string; author: string | null };

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  // current prompt state
  // i keep these simple strings so template binding is easy
  prompt = '';
  promptAuthor = '';
  loading = false;

  // journal state
  noteText = '';
  notes: Note[] = [];
  private NOTES_KEY = 'notes'; // i store all notes under one key (simple json array)

  // cache from type.fit so i don't call network every click
  // i found this api here: https://type.fit/api/quotes  (no key, easy)
  private quotesCache: Quote[] | null = null;

  // fallback prompts when api or internet is down
  // idea from a youtube tip: always have offline data
  private fallback: Quote[] = [
    { text: 'Take a deep breath. What is one small thing you can do today for yourself?', author: 'Wellness Prompt' },
    { text: 'Name three things you are grateful for right now.', author: 'Wellness Prompt' },
    { text: 'What is one thought you can reframe more kindly?', author: 'Wellness Prompt' },
    { text: 'Write a short message to your future self in one month.', author: 'Wellness Prompt' },
    { text: 'What boundary do you want to practice this week?', author: 'Wellness Prompt' },
  ];

  // local notification prefs (capacitor)
  // followed: https://capacitorjs.com/docs/apis/local-notifications
  reminderEnabled = false;
  reminderTime = '20:00'; // default 8pm
  private REMINDER_ENABLED_KEY = 'reminder.enabled';
  private REMINDER_TIME_KEY    = 'reminder.time';
  private REMINDER_ID = 1001; // fixed id so i can cancel/update it

  constructor(private http: HttpClient, private toast: ToastController) {}

  async ngOnInit() {
    // load saved notes + reminder settings on start
    await this.loadNotes();
    await this.loadReminderPrefs();
  }

  // -------------------- PROMPTS --------------------
  async getPrompt() {
    this.loading = true;

    // if i already fetched once, just pick another from cache
    if (this.quotesCache?.length) {
      this.pickRandomFrom(this.quotesCache);
      this.loading = false;
      return;
    }

    // fetch once from type.fit (returns big array)
    // i followed angular httpclient guide: https://angular.io/guide/http
    this.http.get<Quote[]>('https://type.fit/api/quotes').subscribe({
      next: async (arr) => {
        // i had a bug with empty strings so i filtered them
        const filtered = (arr || []).filter(q => q && q.text?.trim().length);
        this.quotesCache = filtered.length ? filtered : this.fallback;
        if (!filtered.length) {
          // little toast so user knows it fell back
          const t = await this.toast.create({ message: 'Using built-in prompts (API empty).', duration: 1500, color: 'medium' });
          t.present();
        }
        this.pickRandomFrom(this.quotesCache);
        this.loading = false;
      },
      error: async () => {
        // this failed a few times (network/CORS), so i just use my fallback list
        // i learned the subscribe error callback from: https://www.youtube.com/watch?v=Zq8nRY0lK2s (any http basics video works)
        this.quotesCache = this.fallback;
        this.pickRandomFrom(this.fallback);
        this.loading = false;
        const t = await this.toast.create({ message: 'Offline mode: using built-in prompts.', duration: 1800, color: 'warning' });
        t.present();
      }
    });
  }

  private pickRandomFrom(arr: Quote[]) {
    // random pick pattern (saw it on stackoverflow a lot)
    // https://stackoverflow.com/a/5915122
    const i = Math.floor(Math.random() * arr.length);
    const q = arr[i];
    this.prompt = q?.text || 'Take a deep breath and reflect for a minute.';
    this.promptAuthor = q?.author || '';
  }

  // -------------------- NOTES ---------------------
  async loadNotes() {
    // simple key/value storage using Capacitor Preferences
    // docs: https://capacitorjs.com/docs/apis/preferences
    const stored = await Preferences.get({ key: this.NOTES_KEY });
    this.notes = stored.value ? JSON.parse(stored.value) : [];
  }

  async saveNote() {
    const txt = this.noteText.trim();
    if (!txt) return;

    const newNote: Note = {
      id: Date.now(),                   // quick id trick i found: https://stackoverflow.com/a/221294/ (timestamp is fine here)
      text: txt,
      date: new Date().toLocaleString(),
      prompt: this.prompt || '(no prompt)',
      author: this.promptAuthor || undefined
    };

    // i had a bug where newest note was at bottom, so i used unshift
    this.notes.unshift(newNote);
    await Preferences.set({ key: this.NOTES_KEY, value: JSON.stringify(this.notes) });
    this.noteText = '';

    const t = await this.toast.create({ message: 'Saved', duration: 1200, color: 'success' });
    t.present();
  }

  async deleteNote(id: number) {
    // swipe to delete uses ion-item-sliding
    // example i copied the idea from: https://ionicframework.com/docs/api/item-sliding
    this.notes = this.notes.filter(n => n.id !== id);
    await Preferences.set({ key: this.NOTES_KEY, value: JSON.stringify(this.notes) });
    const t = await this.toast.create({ message: 'Deleted', duration: 900, color: 'medium' });
    t.present();
  }

  // --------------- DAILY NOTIFICATION -------------
  private async requestNotifPermission(): Promise<boolean> {
    // android 13+ needs runtime permission
    // i followed this: https://capacitorjs.com/docs/apis/local-notifications#permissions
    const perm: PermissionStatus = await LocalNotifications.requestPermissions();
    return perm.display === 'granted';
  }

  private parseHourMinute(t: string): {hour: number, minute: number} {
    // split "HH:mm" -> numbers. i kept it super basic
    const [h, m] = (t || '20:00').split(':').map(n => parseInt(n, 10));
    const hour   = isNaN(h) ? 20 : h;
    const minute = isNaN(m) ? 0  : m;
    return { hour, minute };
  }

  async toggleReminder() {
    // this function flips the toggle and either schedules or cancels
    if (this.reminderEnabled) {
      const granted = await this.requestNotifPermission();
      if (!granted) {
        // i forgot this first and nothing showed up, so i added it
        const t = await this.toast.create({ message: 'Notification permission denied.', duration: 1500, color: 'danger' });
        t.present();
        this.reminderEnabled = false;
        await Preferences.set({ key: this.REMINDER_ENABLED_KEY, value: JSON.stringify(this.reminderEnabled) });
        return;
      }
      await this.scheduleDailyReminder();
      const t = await this.toast.create({ message: 'Daily reminder ON', duration: 1200, color: 'success' });
      t.present();
    } else {
      await this.cancelDailyReminder();
      const t = await this.toast.create({ message: 'Daily reminder OFF', duration: 1200, color: 'medium' });
      t.present();
    }
    await Preferences.set({ key: this.REMINDER_ENABLED_KEY, value: JSON.stringify(this.reminderEnabled) });
  }

  async scheduleDailyReminder() {
    // schedule a repeating local notification at the chosen time
    // copied shape from docs example: https://capacitorjs.com/docs/apis/local-notifications#schedule
    const { hour, minute } = this.parseHourMinute(this.reminderTime);

    const opts: ScheduleOptions = {
      notifications: [{
        id: this.REMINDER_ID,
        title: 'Daily Wellness Journal',
        body: 'Take a minute to write your reflection for today.',
        smallIcon: 'ic_stat_icon_config', // default safe android icon name. worked out of the box
        schedule: { repeats: true, on: { hour, minute } }
      }]
    };

    await LocalNotifications.schedule(opts);
    await Preferences.set({ key: this.REMINDER_TIME_KEY, value: this.reminderTime });
  }

  async cancelDailyReminder() {
    // simple cancel by id
    await LocalNotifications.cancel({ notifications: [{ id: this.REMINDER_ID }] });
  }

  async loadReminderPrefs() {
    // remember user choice across app restarts
    const en = await Preferences.get({ key: this.REMINDER_ENABLED_KEY });
    const tm = await Preferences.get({ key: this.REMINDER_TIME_KEY });
    this.reminderEnabled = en.value ? JSON.parse(en.value) : false;
    this.reminderTime = tm.value || this.reminderTime;

    // if it was on and permission is still granted, re-schedule
    const hasPerm = await LocalNotifications.checkPermissions(); // from docs too
    if (this.reminderEnabled && hasPerm.display === 'granted') {
      await this.scheduleDailyReminder();
    }
  }

  // small helper to test notifications quickly (fires in 5s)
  async testNotificationNow() {
    const granted = await this.requestNotifPermission();
    if (!granted) {
      const t = await this.toast.create({ message: 'Permission needed to show notifications.', duration: 1500, color: 'danger' });
      t.present();
      return;
    }
    const now = new Date();
    const fire = new Date(now.getTime() + 5000);
    await LocalNotifications.schedule({
      notifications: [{
        id: 9999,
        title: 'Time to Journal!',
        body: 'Got anything on your',
        schedule: { at: fire }
      }]
    });
    // i learned this “schedule at 5s” trick from a short video: https://www.youtube.com/results?search_query=capacitor+local+notifications+angular
    const t = await this.toast.create({ message: 'Test in ~5 seconds.', duration: 1200, color: 'medium' });
    t.present();
  }
}
