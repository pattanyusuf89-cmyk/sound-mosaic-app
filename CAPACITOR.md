# Sonic — Native wrapper (Android + iOS) via Capacitor

The web app already:

- uses the **MediaSession API** so lock-screen controls and Bluetooth
  buttons work while the browser tab is alive,
- keeps a hidden YouTube IFrame player mounted globally so audio doesn't
  stop when you navigate between routes.

What a browser tab **cannot** do:

- keep playing after you swipe the app away from Recents,
- reliably keep playing when the screen locks on iOS Safari,
- run as a foreground media service.

For all of that, wrap this build with Capacitor.

## One-time setup (on your own machine)

You need Node 20+, Android Studio (for Android), and Xcode (for iOS —
macOS only). The Lovable preview cannot compile native binaries.

```bash
bun add -d @capacitor/cli
bun add @capacitor/core @capacitor/android @capacitor/ios
bun add @capgo/capacitor-background-mode

bun run build           # produces .output/public
npx cap init sonic app.sonic.music --web-dir=.output/public
npx cap add android
npx cap add ios
```

`capacitor.config.ts` in the project root is already configured.

## Android — background audio that survives Recents swipe

1. `npx cap sync android`
2. Open `android/` in Android Studio.
3. In `android/app/src/main/AndroidManifest.xml` add inside `<manifest>`:
   ```xml
   <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
   <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
   <uses-permission android:name="android.permission.WAKE_LOCK" />
   <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
   ```
4. In `MainActivity.java` request the background mode plugin to start a
   foreground media notification whenever playback starts. The
   `@capgo/capacitor-background-mode` README has the exact snippet.
5. Build and install: `npx cap run android`.

Because the WebView now lives inside a foreground service with a media
notification, Android will keep it alive even after the user swipes the
task away — as long as the notification is present.

## iOS — background audio + lock-screen art

1. `npx cap sync ios`
2. Open `ios/App/App.xcworkspace` in Xcode.
3. Target → Signing & Capabilities → **+ Capability → Background Modes**,
   tick **Audio, AirPlay, and Picture in Picture**.
4. Build and run on a device (`npx cap run ios`).

MediaSession metadata (title, artist, artwork) is already emitted, so the
iOS lock screen and Control Center will show the current song.

## Updating the app

After any web change:

```bash
bun run build
npx cap copy
```

Rebuild the native binary in Android Studio / Xcode.

## Legal note on YouTube playback

Streaming YouTube audio through a hidden IFrame in a standalone music
app is against the YouTube Terms of Service. This is fine for personal /
prototype use, but the app **cannot be published** to the Play Store or
the App Store using this audio source. For a distributable app, switch
the audio layer to a licensed source (Audius, Spotify Web Playback SDK
with Premium login, a licensed catalog API, or user-owned audio files).
The player, lyrics, library and UI are all source-agnostic.