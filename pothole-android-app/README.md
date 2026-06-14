# Pothole Detection (Android App)

This is a **native Android app** (Kotlin + Jetpack Compose) that:

- Captures a photo using **CameraX** or picks from **Gallery**
- Uploads the image to the existing FastAPI backend in `pothole-detection-app/`
- Displays the **annotated image** and a **detections list**
- Lets you tune **confidence** and **IoU** thresholds from the UI

## Backend requirement

Start the backend first on your PC (from `pothole-detection-app/`):

```powershell
.\.venv\Scripts\Activate.ps1
$env:POTHOLE_MODEL_PATH="runs\detect\train\weights\best.pt"
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Emulator vs phone base URL

- Android Emulator (backend on your PC): use `http://10.0.2.2:8000`
- Physical phone: use your PC LAN IP, e.g. `http://192.168.1.50:8000`
  - Ensure Windows Firewall allows inbound on port `8000` (or temporarily test with firewall off).

## Android Studio setup

1. Open Android Studio → **New Project** → **Empty Activity (Compose)** (min SDK 24+ recommended).
2. If Gradle sync complains about a missing wrapper (because this repo doesn’t include `gradle-wrapper.jar`), keep the wizard-generated project and then copy these paths into it:
   - `app/src/main/AndroidManifest.xml`
   - `app/src/main/java/com/example/potholedetector/`
   - `app/build.gradle.kts`
3. Update the backend base URL in `app/src/main/java/com/example/potholedetector/config/AppConfig.kt`.
4. Run on emulator/phone.

## Notes

- This app is **not on-device ML**. It’s a real Android app, but inference runs on your FastAPI server.
- If you want fully offline/on-device detection, we can convert the trained model to **TFLite** and run it with the **TFLite Task Library** (bigger scope).
