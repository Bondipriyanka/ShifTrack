# Lyam Biometric Gate - Flutter Mobile Application

This is the complete cross-platform Flutter mobile application codebase for the Lyam Biometric Attendance Gate entry system.

---

## 🛠️ Flutter Development Setup

To compile and run this app on your physical mobile phone, make sure you have the **Flutter SDK** installed on your computer.

### Step 1: Install Flutter SDK
* Download and install Flutter for your OS from **[flutter.dev](https://docs.flutter.dev/get-started/install)**.
* Ensure `flutter` is added to your system environment variables.
* Run `flutter doctor` in your terminal to verify dependencies are met.

### Step 2: Install Project Packages
Navigate to this `flutter_app` folder in your terminal and fetch the pubspec dependencies:
```bash
cd "d:/Face Recognition App/flutter_app"
flutter pub get
```

### Step 3: Run on Physical Phone or Simulator
1. Connect your physical smartphone via USB (enable "USB Debugging" on Android, or "Developer Mode" on iOS).
2. Or open an iOS Simulator / Android Virtual Device (AVD).
3. Run the application:
   ```bash
   flutter run
   ```
4. If multiple devices are connected, select your target device ID from the printed list.

---

## 📦 How to Compile Release Apps

### 🤖 Android (Generate .apk Install File)
To generate an installable Android Package (APK) that you can transfer and install on any Android phone directly:
```bash
flutter build apk --release
```
* The compiled file will be saved at:
  `build/app/outputs/flutter-apk/app-release.apk`

### 🍎 iOS (Generate Apple App)
To compile the project for iPhones (requires a macOS computer with Xcode installed):
```bash
flutter build ios --release
```
* Open the `ios/Runner.xcworkspace` in Xcode to configure your Apple developer certificate profile, build, and deploy to physical iPhones or publish via TestFlight.

---

## 📱 Interactive Mobile App Features

* **Authorized Entry**: Supervisor logs in with security code **`1234`**.
* **Gate Attendance camera**: Clicking **"Open Attendance Camera"** calls device hardware. Custom canvas painters overlay biometric guide boundaries on the camera screen.
* **Camera Auto-Stop**: When you trigger a scan and verify the employee, the Flutter controller **immediately disposes of the camera hardware**, shutting off the camera feed and returning the screen to a safe static preview.
* **Employee Enrollment**: Enroll a custom employee name and shift in the "Enroll Face" tab. Take a real selfie photo using the camera, and save the biometric profile. It writes records into `SharedPreferences` database cache storage.
* **Offline queueing**: Turn on Offline Simulation. Scans will queue inside local storage. Turn off Offline, and sync queue to push to the ZyngHR endpoint.
