* Happy Thoughts  
A journaling app I built for my coursework. The main idea is to give people a daily wellness prompt so they know what to write about, and also a reminder to actually do it.

* Features  
- Random wellness prompts from https://type.fit/api/quotes (free api i found online)  
- Offline fallback list i wrote myself  
- Save reflections/notes and they stay even if you close the app (capacitor preferences)  
- Swipe left to delete notes (ionic ion-item-sliding)  
- History tab that shows all saved reflections  
- Daily notification reminder with capacitor local notifications (you can toggle it and set the time, also test button)  

* Tech used  
Ionic + Angular (standalone components)  
Capacitor (for native features like storage and notifications)  
Android Studio to build the apk  
Typescript / HTML / SCSS  

* How to run  
npm install  
ionic serve  (runs in browser)  
ionic build && npx cap sync android && npx cap open android  (opens in android studio to run apk)  

* Challenges i had  
- tried another quotes api at first but got cors errors, fixed it by using type.fit  
- notes weren’t saving properly at first, figured out i had to load them in ngOnInit from capacitor preferences  
- android studio was really slow with gradle the first time, fixed it by enabling virtualization in bios and letting studio install missing sdk tools  
- notifications didn’t show up until i added permission request for android 13+  

* Repo notes  
src/app/home = main page (prompts, notes, reminders)  
src/app/history = history tab  
app.config.ts and app.routes.ts = routing and app setup  
i added comments in the code showing links/tutorials i used and where i struggled a bit
