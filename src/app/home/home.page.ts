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
  // Current prompt content
  prompt = '';
  promptAuthor = '';
  loading = false;

  // Journal state
  noteText = '';
  notes: Note[] = [];
  private NOTES_KEY = 'notes';

  // Cache quotes after first fetch (Type.fit)
  // (Found via "free quotes api" searches; Type.fit is simple + CORS-friendly)
  private quotesCache: Quote[] | null = null;

  // Offline fallback prompts (my own brief list)
  private fallback: Quote[] = [
    { text: 'Take a deep breath. What is one small thing you can do today for yourself?', author: 'Wellness Prompt' },
    { text: 'Name three things you are grateful for right now.', author: 'Wellness Prompt' },
    { text: 'What is one thought you can reframe more kindly?', author: 'Wellness Prompt' },
    { text: 'Write a short message to your future self in one month.', author: 'Wellness Prompt' },
    { text: 'What boundary do you want to practice this week?', author: 'Wellness Prompt' },
  ];

  // Daily local notification settings
  reminderEnabled = false;
  reminderTime = '20:00'; // default 8:00 PM
  private REMINDER_ENABLED_KEY = 'reminder.enabled';
  private REMINDER_TIME_KEY    = 'reminder.time';
  private REMINDER_ID = 1001; // stable ID for repeat schedule

  constructor(private http: HttpClient, private toast: ToastController) {}

  async ngOnInit() {
    await this.loadNotes();
    await this.loadReminderPrefs();
  }

  // -------------------- PROMPTS --------------------
  async getPrompt() {
    this.loading = true;

    // If we already fetched, just randomize locally
    if (this.quotesCache?.length) {
      this.pickRandomFrom(this.quotesCache);
      this.loading = false;
      return;
    }

    // Load once (Type.fit JSON)
    // (Docs: https://type.fit/api/quotes)
    this.http.get<Quote[]>('https://type.fit/api/quotes').subscribe({
      next: async (arr) => {
        const filtered = (arr || []).filter(q => q && q.text?.trim().length);
        this.quotesCache = filtered.length ? filtered : this.fallback;
        if (!filtered.length) {
          // Tiny UX tip to show we recovered
          const t = await this.toast.create({ message: 'Using built-in prompts (API empty).', duration: 1500, color: 'medium' });
          t.present();
        }
        this.pickRandomFrom(this.quotesCache);
        this.loading = false;
      },
      error: async () => {
        // If network/CORS fails, we still demo smoothly
        this.quotesCache = this.fallback;
        this.pickRandomFrom(this.fallback);
        this.loading = false;
        // Short, informal note:
        // *YouTube* – “Ionic HttpClient basics” helped me see how to .subscribe() and handle error fallback.
        const t = await this.toast.create({ message: 'Offline mode: using built-in prompts.', duration: 1800, color: 'warning' });
        t.present();
      }
    });
  }

  private pickRandomFrom(arr: Quote[]) {
    // *StackOverflow* – random array pick pattern (simple)
    const i = Math.floor(Math.random() * arr.length);
    const q = arr[i];
    this.prompt = q?.text || 'Take a deep breath and reflect for a minute.';
    this.promptAuthor = q?.author || '';
  }

  // -------------------- NOTES ---------------------
  async loadNotes() {
    // (Capacitor Preferences Docs – simple key/value storage)
    // https://capacitorjs.com/docs/apis/preferences
    const stored = await Preferences.get({ key: this.NOTES_KEY });
    this.notes = stored.value ? JSON.parse(stored.value) : [];
  }

  async saveNote() {
    const txt = this.noteText.trim();
    if (!txt) return;

    const newNote: Note = {
      id: Date.now(),                   // *StackOverflow* – quick unique id trick for demos
      text: txt,
      date: new Date().toLocaleString(),
      prompt: this.prompt || '(no prompt)',
      author: this.promptAuthor || undefined
    };

    this.notes.unshift(newNote);
    await Preferences.set({ key: this.NOTES_KEY, value: JSON.stringify(this.notes) });
    this.noteText = '';

    const t = await this.toast.create({ message: 'Saved', duration: 1200, color: 'success' });
    t.present();
  }

  async deleteNote(id: number) {
    this.notes = this.notes.filter(n => n.id !== id);
    await Preferences.set({ key: this.NOTES_KEY, value: JSON.stringify(this.notes) });
    // *Ionic Docs* – ion-item-sliding for swipe-to-delete UI
    // https://ionicframework.com/docs/api/item-sliding
    const t = await this.toast.create({ message: 'Deleted', duration: 900, color: 'medium' });
    t.present();
  }

  // --------------- DAILY NOTIFICATION -------------
  private async requestNotifPermission(): Promise<boolean> {
    // Capacitor Local Notifications (asks at runtime)
    // https://capacitorjs.com/docs/apis/local-notifications
    const perm: PermissionStatus = await LocalNotifications.requestPermissions();
    return perm.display === 'granted';
  }

  private parseHourMinute(t: string): {hour: number, minute: number} {
    // "HH:mm" to numbers (keep simple)
    const [h, m] = (t || '20:00').split(':').map(n => parseInt(n, 10));
    const hour   = isNaN(h) ? 20 : h;
    const minute = isNaN(m) ? 0  : m;
    return { hour, minute };
  }

  async toggleReminder() {
    if (this.reminderEnabled) {
      const granted = await this.requestNotifPermission();
      if (!granted) {
        this.reminderEnabled = false;
        const t = await this.toast.create({ message: 'Notification permission denied.', duration: 1500, color: 'danger' });
        t.present();
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
    const { hour, minute } = this.parseHourMinute(this.reminderTime);

    const opts: ScheduleOptions = {
      notifications: [{
        id: this.REMINDER_ID,
        title: 'Daily Wellness Journal',
        body: 'Take a minute to write your reflection for today.',
        smallIcon: 'ic_stat_icon_config', // Android fallback-safe
        schedule: { repeats: true, on: { hour, minute } }
      }]
    };

    // *Capacitor Docs* – schedule repeating notifications
    await LocalNotifications.schedule(opts);
    await Preferences.set({ key: this.REMINDER_TIME_KEY, value: this.reminderTime });
  }

  async cancelDailyReminder() {
    await LocalNotifications.cancel({ notifications: [{ id: this.REMINDER_ID }] });
  }

  async loadReminderPrefs() {
    const en = await Preferences.get({ key: this.REMINDER_ENABLED_KEY });
    const tm = await Preferences.get({ key: this.REMINDER_TIME_KEY });
    this.reminderEnabled = en.value ? JSON.parse(en.value) : false;
    this.reminderTime = tm.value || this.reminderTime;

    // Reschedule if user had it on
    const hasPerm = await LocalNotifications.checkPermissions();
    if (this.reminderEnabled && hasPerm.display === 'granted') {
      await this.scheduleDailyReminder();
    }
  }

  // Quick test helper (fires in 5s)
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
    // *YouTube* – “Capacitor Local Notifications quick demo” helped understand how to do this 
    const t = await this.toast.create({ message: 'Test in ~5 seconds.', duration: 1200, color: 'medium' });
    t.present();
  }
}
