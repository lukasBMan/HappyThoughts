import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export const appConfig: ApplicationConfig = {
  providers: [
    // Router setup for standalone Angular
    // (Angular Docs - Standalone APIs)
    provideRouter(routes),

    // HttpClient for API requests
    // (Angular Docs - HttpClient)
    provideHttpClient(),

    // Minimal global providers for Ionic + common Angular modules
    // (Ionic Docs - Standalone with IonicModule.forRoot())
    importProvidersFrom(
      IonicModule.forRoot(),
      CommonModule,
      FormsModule
    )
  ]
};
