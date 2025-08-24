// app.config.ts
// i followed angular standalone setup here: https://angular.dev/guide/standalone-components
// also used ionic docs to provide IonicModule globally: https://ionicframework.com/docs/angular/your-first-app

import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export const appConfig: ApplicationConfig = {
  providers: [
    // router for tabs + pages
    provideRouter(routes),

    // http client for api calls (prompts)
    // i used this guide: https://angular.io/guide/http
    provideHttpClient(),

    // ionic + common angular modules (standalone style)
    // i had a blank screen until i added IonicModule.forRoot()
    importProvidersFrom(
      IonicModule.forRoot(),
      CommonModule,
      FormsModule
    )
  ]
};
