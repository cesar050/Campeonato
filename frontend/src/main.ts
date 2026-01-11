import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';  // ← SIN Component

bootstrapApplication(App, appConfig)  // ← App, no AppComponent
  .catch((err) => console.error(err));