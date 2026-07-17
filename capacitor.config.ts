import type { CapacitorConfig } from "@capacitor/cli";

// Native wrapper config. See CAPACITOR.md to build the Android/iOS apps.
// Background audio, lock-screen controls and always-on playback (that
// survives swiping the app from Recents) require running inside the
// native shell — a browser tab is killed by the OS.
const config: CapacitorConfig = {
  appId: "app.sonic.music",
  appName: "Sonic",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  android: {
    // Allow HTTP in dev only if you need it
    allowMixedContent: false,
  },
  plugins: {
    // Keeps the Chromium WebView alive as a foreground service while
    // audio is playing. Uses @anuradev/capacitor-background-mode
    // together with the FOREGROUND_SERVICE permissions declared in
    // AndroidManifest.xml.
    BackgroundMode: {
      title: "Sonic",
      text: "Playing music",
      silent: false,
      hidden: false,
      bigText: true,
      resume: true,
    },
  },
};

export default config;
