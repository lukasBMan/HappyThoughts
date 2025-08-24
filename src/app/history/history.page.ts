// history.page.ts
// super small: just reads notes from preferences and displays them
// i reused types so it stays consistent with home.page.ts

import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Preferences } from '@capacitor/preferences';

type Note = { id: number; text: string; date: string; prompt: string; author?: string };

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: 'history.page.html',
  styleUrls: ['history.page.scss'],
})
export class HistoryPage implements OnInit {
  notes: Note[] = [];
  private NOTES_KEY = 'notes';

  async ngOnInit() {
    // simple load on init (read-only page)
    // preferences doc i used: https://capacitorjs.com/docs/apis/preferences
    const stored = await Preferences.get({ key: this.NOTES_KEY });
    this.notes = stored.value ? JSON.parse(stored.value) : [];
  }
}
