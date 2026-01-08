# Soil - Multiplayer Resource Management

Soil is a web-based agricultural simulation game built on the Firebase platform. It features a real-time multiplayer environment where players manage parcels of land, plant crops, and compete or cooperate.

## ✨ Features

- **Real-time Multiplayer**: Synchronized game state across all players using Firestore.
- **Agricultural Simulation**: Manage parcels of land, select crops, and deal with environmental factors like weather and vermin.
- **Admin Dashboard**: Create and manage games, monitor player progress, and trigger game events.
- **Localization**: Supports multiple languages (currently English and German).
- **AI Players**: Automated players that make decisions based on the current game state.

## 🚀 Tech Stack

- **Frontend**: Angular (v21), TailwindCSS (v4), RxJS
- **Backend**: Firebase Cloud Functions (v2, Node.js 24)
- **Database**: Cloud Firestore
- **Authentication**: Firebase Auth (Anonymous & Google Sign-In)
- **Testing**: Jasmine + Vitest (Unit), Cypress (E2E)

## 🛠️ Getting Started

### Prerequisites

- Node.js (v24 LTS)
- Firebase CLI (`npm install -g firebase-tools`)
- Angular CLI (`npm install -g @angular/cli`)

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd soil
   ```

2. Install dependencies:
   ```bash
   npm install
   cd functions && npm install && cd ..
   ```

### Local Development

1. Start the Angular development server:

   ```bash
   npm start
   ```

   Open `http://localhost:4200/` in your browser.

2. Run Firebase emulators for backend development:
   ```bash
   firebase emulators:start
   ```

### Building

To build the project for production:

```bash
npm run build
```

This will compile the Angular app and store the artifacts in the `dist/` directory.

### Testing

#### Unit Tests (Frontend)

```bash
npm run test:unit
```

#### E2E Tests (Cypress)

```bash
npm run test:e2e
```

## 📜 License

This project is licensed under the Apache License 2.0 - see the [LICENSE.md](LICENSE.md) file for details.

## 👥 Contributing

For information on how to contribute to this project, please see the [DEVELOPER.md](DEVELOPER.md) file.
