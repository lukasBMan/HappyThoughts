import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';   // <-- add this

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonicModule, CommonModule],          // <-- include it here
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  prompt: string = '';

  constructor(private http: HttpClient) {}

  getPrompt() {
    this.http.get<any>('https://api.adviceslip.com/advice')
      .subscribe(res => this.prompt = res?.slip?.advice || 'No prompt received.');
  }
}
