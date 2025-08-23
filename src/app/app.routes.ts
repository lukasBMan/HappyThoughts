import { Routes } from '@angular/router';

export const routes: Routes = [
  // Simple redirect to Home
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  // Lazy-load standalone pages
  // (Angular Docs - Standalone components + loadComponent)
  { path: 'home', loadComponent: () => import('./home/home.page').then(m => m.HomePage) },
  { path: 'history', loadComponent: () => import('./history/history.page').then(m => m.HistoryPage) }
];
