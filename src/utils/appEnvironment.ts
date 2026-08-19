/**
 * App Environment & APK / Desktop App Verification
 * Ensures authentication and streaming are ONLY allowed inside
 * native APKs (Android/Smart TV) or Native Desktop wrappers (Electron/Tauri/WebView2).
 * 
 * Blocks standard desktop and mobile web browsers (Chrome, Safari, Firefox, Edge),
 * while supporting explicit Studio Preview testing toggle.
 */

export function isNativeAppEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  // Studio inspection toggle (for development / reviewing inside AI Studio)
  if (localStorage.getItem('gc_studio_preview_mode') === 'app') {
    return true;
  }

  // Explicit query parameter support (e.g. https://greek-streaming.com/?app=true or ?native=1)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('app') === 'true' || urlParams.get('native') === '1' || urlParams.get('env') === 'app' || urlParams.get('mode') === 'app') {
      return true;
    }
  } catch (e) {
    // ignore search params error
  }

  const ua = navigator.userAgent || navigator.vendor || '';

  // 1. Android WebView detection (Standard APK wrappers like WebToApp, Median, WebView, app-uq)
  const isAndroidWebView = (
    /wv|Android.*Version\/[0-9.]+/i.test(ua) ||
    /WebToApp|GreekStreaming|AppUQ|app-uq|App-UQ|NativeApp/i.test(ua) ||
    Boolean((window as any).webtoapp) ||
    Boolean((window as any).AndroidInterface) ||
    Boolean((window as any).Android) ||
    Boolean((window as any).median) ||
    Boolean((window as any).gonative) ||
    Boolean((window as any).Capacitor)
  );

  // 2. Windows / macOS Native Desktop Wrapper (Electron / Tauri / Native .exe)
  const isNativeDesktop = (
    /Electron/i.test(ua) ||
    Boolean((window as any).process?.type === 'renderer') ||
    Boolean((window as any).__TAURI__) ||
    Boolean((window as any).chrome?.webview) // Microsoft Edge WebView2 native app
  );

  // 3. Standalone TWA / Installed App mode
  const isStandaloneApp = (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );

  return isAndroidWebView || isNativeDesktop || isStandaloneApp;
}

export function getDeviceId(): string {
  let devId = localStorage.getItem("gc_device_id");
  if (!devId) {
    devId = "dev_" + Math.random().toString(36).substring(2, 11);
    localStorage.setItem("gc_device_id", devId);
  }
  return devId;
}
