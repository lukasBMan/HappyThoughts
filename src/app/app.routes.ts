// app.routes.ts
// super small routes file, i liked loadComponent pattern (lazy)
// source i used: https://angular.dev/guide/standalone-components#lazy-loading

import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' }, // simple redirect
  { path: 'home', loadComponent: () => import('./home/home.page').then(m => m.HomePage) },
  { path: 'history', loadComponent: () => import('./history/history.page').then(m => m.HistoryPage) }
];
