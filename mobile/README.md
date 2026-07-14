# Lyam Biometric Gate - React Native Mobile Application

This is the fully functioning React Native / Expo codebase for the Lyam Biometric Attendance Gate entry application, designed to run directly on physical smartphones in the field.

---

## 📱 How to Run on your Mobile Phone (Under 5 Minutes)

You do not need Xcode, Android Studio, or USB cables to test this on a real device. We use **Expo Go**, a free developer sandbox app.

### Step 1: Install Expo Go on your Phone
* **iOS (iPhone)**: Download **[Expo Go](https://apps.apple.com/us/app/expo-go/id984021028)** from the Apple App Store.
* **Android**: Download **[Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)** from the Google Play Store.

### Step 2: Install Dependencies & Boot Server
In your computer's terminal, navigate to this `mobile` folder and install packages:
```bash
cd "d:/Face Recognition App/mobile"
npm install
npm start
```
This will start the Expo developer bundle server and print a large QR code directly in your terminal.

### Step 3: Scan and Run!
* **Android**: Open the **Expo Go** app on your phone, tap **"Scan QR Code"**, and scan the code on your computer screen.
* **iOS (iPhone)**: Open your phone's native **Camera App**, point it at the QR code, and tap the **"Open in Expo Go"** link.

The application will build in 10 seconds and launch on your phone screen!

---

## 🛠️ Testing Features on Your Mobile Screen

1. **Supervisor Login**: Enter the PIN passcode **`1234`** on the loading lock screen.
2. **Camera Biometrics**: Click **"Open Camera Gate"** (grant camera permission prompts) to activate your front/rear camera.
   - Click **"Verify Face Match"** to trigger a simulated scan check. It will take a frame snap, process matching vectors, log geotags, and auto-stop the camera feed on completion.
3. **Register New Employees**:
   - Tap **"Enroll Face"** in the bottom navigation tab.
   - Input a name (e.g., your name), turn on the camera, and tap **"Snap Face"**.
   - Tap **"Register Candidate Biometrics"** to save your profile into the local storage database (`AsyncStorage`).
4. **Offline Queue Syncing**:
   - Toggle **"Offline Simulation Mode"** to ON.
   - Scan faces. They will be cached safely in the device storage.
   - Toggle **Offline Mode** to OFF, and tap **"Sync Offline Logs"** to transmit your logs to the server.
