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
    // Simple read-only view of stored notes
    // (Capacitor Preferences Docs)
    const stored = await Preferences.get({ key: this.NOTES_KEY });
    this.notes = stored.value ? JSON.parse(stored.value) : [];
  }
}
