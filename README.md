# Wielermanager - Cycling Manager Game

Een interactieve wielermanager game gebouwd met React en Firebase.

## Features

- 🏁 **Race Kalender**: 959 wedstrijden uit het 2026 wielerseizoen
- 📊 **Uitslagen**: Bekijk resultaten per maand, race en etappe
- 👥 **Team Samenstellen**: Stel je eigen team samen met een budget van €10 miljoen
- 🔐 **Authenticatie**: Veilig inloggen met Firebase Authentication
- 💾 **Cloud Opslag**: Teams worden opgeslagen in Firestore database

## Installatie

```bash
# Clone de repository
git clone <jouw-repository-url>

# Installeer dependencies
npm install
```

## Firebase Setup

### Stap 1: Firebase Project Aanmaken

1. Ga naar [Firebase Console](https://console.firebase.google.com/)
2. Klik op "Add project"
3. Geef je project een naam (bijv. "wielermanager")
4. Volg de stappen om het project aan te maken

### Stap 2: Web App Registreren

1. In de Firebase console, klik op het web icoon (</>)
2. Registreer je app met een naam
3. Kopieer de Firebase configuratie (firebaseConfig object)

### Stap 3: Configuratie Toevoegen

1. Open `src/firebase/config.js`
2. Vervang de placeholder waarden met jouw Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "jouw-api-key-hier",
  authDomain: "jouw-project.firebaseapp.com",
  projectId: "jouw-project-id",
  storageBucket: "jouw-project.appspot.com",
  messagingSenderId: "jouw-sender-id",
  appId: "jouw-app-id"
};
```

### Stap 4: Authentication Inschakelen

1. In Firebase Console, ga naar "Authentication"
2. Klik op "Get started"
3. Klik op "Email/Password"
4. Schakel "Email/Password" in
5. Sla op

### Stap 5: Firestore Database Aanmaken

1. In Firebase Console, ga naar "Firestore Database"
2. Klik op "Create database"
3. Kies "Start in production mode" (of test mode voor development)
4. Selecteer een locatie (bijv. "europe-west1")

### Stap 6: Firestore Rules Instellen

Ga naar "Firestore Database" → "Rules" en gebruik deze regels:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users kunnen alleen hun eigen team lezen/schrijven
    match /teams/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Development

```bash
# Start development server
npm run dev
```

De app draait op `http://localhost:5173`

## Deployment

### Optie 1: Vercel (Aanbevolen)

1. Installeer Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Volg de prompts en je app is live!

### Optie 2: Firebase Hosting

1. Installeer Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login:
```bash
firebase login
```

3. Initialiseer:
```bash
firebase init hosting
```
- Kies je project
- Public directory: `dist`
- Single-page app: `Yes`
- GitHub actions: `No` (tenzij je dit wilt)

4. Build en deploy:
```bash
npm run build
firebase deploy
```

### Optie 3: GitHub Pages

1. Installeer gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Voeg scripts toe aan `package.json`:
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

3. Voeg base toe aan `vite.config.js`:
```javascript
export default defineConfig({
  base: '/wielermanager/',
  // ... rest van config
})
```

4. Deploy:
```bash
npm run deploy
```

## Project Structuur

```
wielermanager/
├── src/
│   ├── components/
│   │   ├── Home.jsx          # Home pagina
│   │   ├── Results.jsx       # Uitslagen pagina
│   │   ├── Login.jsx         # Login/Registratie
│   │   ├── TeamBuilder.jsx   # Team samenstellen
│   │   ├── Nav.jsx           # Navigatie
│   │   └── Footer.jsx        # Footer
│   ├── css/                  # Styling
│   ├── data/
│   │   ├── races.js          # 959 races
│   │   ├── raceCategories.js # 27 categorieën
│   │   ├── pointsPerRaceCategorie.js
│   │   └── results.js
│   ├── firebase/
│   │   └── config.js         # Firebase configuratie
│   └── App.jsx
└── package.json
```

## Technologieën

- **React 18.3.1** - UI Framework
- **Vite 5.4.2** - Build Tool
- **Firebase 11.1.0** - Backend as a Service
  - Authentication - Gebruikersbeheer
  - Firestore - Database
- **CSS3** - Styling

## Gebruik

1. **Home**: Lees hoe het spel werkt
2. **Uitslag**: Bekijk race resultaten
3. **Inloggen**: Maak een account aan
4. **Jouw Team**: Stel je team samen (max 8 renners, budget €10M)
5. Teams worden automatisch opgeslagen in de cloud

## Toekomstige Features

- [ ] Punten berekening per race
- [ ] Klassementen/rankings
- [ ] Meer renners toevoegen
- [ ] Renner statistieken
- [ ] Live race updates
- [ ] Competities tussen gebruikers

## Licentie

MIT
