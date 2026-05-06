# BizTrack

[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

BizTrack is a cross-platform mobile application (Android and iOS) designed for freelancers. It allows for advanced management of work activities, time tracking, income recording, and monitoring of operating expenses, providing real-time calculation of net profit.

## System Architecture

The application is developed following a client-serverless architecture, optimized for mobile device performance and real-time synchronization.

```mermaid
graph TD
    subgraph Frontend ["Frontend (Presentation Layer)"]
        UI["React Native (View, Text, Modal, ScrollView)"]
        Routing["Expo Router (File-based)"]
        Icons["Vectors (lucide-react-native)"]
    end

    subgraph Backend ["Backend & Servizi Cloud (Data Layer)"]
        Auth["Firebase Authentication"]
        DB[("Cloud Firestore (NoSQL)")]
    end

    UI --> Routing
    UI --> Icons
    Frontend <-->|"onSnapshot (Real-Time Synchronization & Offline Cache)"| DB
    Frontend <-->|Access Management (Hybrid/Guest)| Auth
```

### Frontend (Presentation Layer)

- **Framework:** React Native managed through the Expo ecosystem.
- **Routing:** File-based routing provided by Expo Router.
- **User Interface:** Developed using native components (`View`, `Text`, `Modal`, `ScrollView`) and styled with the React Native `StyleSheet` API to ensure a constant 60 FPS.
- **Iconography:** Vector-based, implemented via `lucide-react-native` and `react-native-svg`.

### Backend & Cloud Services (Data Layer)

- **Infrastructure:** Firebase (Google Cloud).
- **Authentication:** Firebase Authentication. Implements a hybrid system that supports anonymous login (temporary sessions based on device ID) and credential-based authentication (Email/Password) for long-term persistence.
- **Database:** Cloud Firestore. A NoSQL document-oriented database. Data is isolated per user through the following path structure:
  - `artifacts/{appId}/users/{userId}/jobs/{jobId}`
  - `artifacts/{appId}/users/{userId}/expenses/{expenseId}`
- **State Management:** Data is synchronized in real-time via Firestore `onSnapshot` listeners, ensuring that financial dashboards and the calendar instantly reflect changes both online and offline (via local caching).

## Main Features

- **Job Calendar:** Dynamic monthly view with quick entry of worksites/clients, hours worked, and agreed compensation.
- **Financial Management:** Tracking of categorized expenses (e.g., Van, Material, Other) with automatic calculation of the monthly balance.
- **Cloud Synchronization:** Encrypted and real-time saving on Firebase servers.
- **Guest Mode:** Ability to test the application without prior registration.

## Prerequisites

To run the project in a local development environment, you must have the following tools installed:

- Node.js (version 18.x or higher)
- Git
- Android Studio (for the Android emulator) or Xcode (for the iOS simulator on macOS)
- An active Firebase account.

## Installation and Configuration

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/BizTrack.git
   cd BizTrack
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Firebase Configuration: Update the `firebaseConfig` object inside the main file (`app/_layout.jsx` or a dedicated configuration file) with your Firebase project keys:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID",
   };
   ```

## Starting in Development Environment

Start the local Expo server:

```bash
npx expo start
```

From the terminal menu, press `a` to open the Android emulator, `i` for the iOS simulator, or scan the QR code with the Expo Go app on a physical device.

## Build and Deploy

The project uses Expo Application Services (EAS) for native compilation.

1. Install EAS CLI:

   ```bash
   npm install -g eas-cli
   ```

2. Autentication on Expo:

   ```bash
   eas login
   ```

3. Android (`.apk`):

   ```bash
   eas build -p android --profile preview
   ```

4. iOS (`.ipa`):
   _(requires an Apple Developer account )_
   ```bash
   eas build -p ios
   ```

## Credits

Developed by **Probjot Singh**.
