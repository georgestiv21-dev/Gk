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
    if (
      urlParams.get('app') === 'true' || 
      urlParams.get('native') === '1' || 
      urlParams.get('apk') === '1' ||
      urlParams.get('env') === 'app' || 
      urlParams.get('mode') === 'app'
    ) {
      return true;
    }
  } catch (e) {
    // ignore search params error
  }

  const ua = navigator.userAgent || navigator.vendor || '';

  // 1. Explicit native APK wrapper markers (AppCreator24, WebToApp, Capacitor, Cordova, etc.)
  const isExplicitNativeApp = (
    /GreekStreaming|AppCreator24|WebToApp|AppUQ|app-uq|App-UQ|NativeApp|Capacitor|Cordova|GoNative|Median/i.test(ua) ||
    Boolean((window as any).AndroidInterface) ||
    Boolean((window as any).Android) ||
    Boolean((window as any).webtoapp) ||
    Boolean((window as any).median) ||
    Boolean((window as any).gonative) ||
    Boolean((window as any).Capacitor) ||
    Boolean((window as any).JSInterface)
  );

  if (isExplicitNativeApp) return true;

  // 2. Windows / macOS Native Desktop Wrapper (Electron / Tauri / Native .exe)
  const isNativeDesktop = (
    /Electron/i.test(ua) ||
    Boolean((window as any).process?.type === 'renderer') ||
    Boolean((window as any).__TAURI__) ||
    Boolean((window as any).chrome?.webview) // Microsoft Edge WebView2 native app
  );

  if (isNativeDesktop) return true;

  // 3. Standalone Installed App mode (PWA / TWA / APK installed on device)
  const isStandaloneApp = (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );

  if (isStandaloneApp) return true;

  // 4. Android WebView (ONLY if strictly embedded in an APK, not a standard browser)
  // Standard TV and mobile browsers (Chrome, Firefox, Safari, Edge, Opera, SamsungBrowser, Silk, Puffin, TV Bro) MUST show Landing Page
  const isStandardBrowser = /Chrome\/[0-9.]+\s+(Mobile\s+)?Safari\/[0-9.]+$|Firefox\/[0-9.]+|Safari\/[0-9.]+|Edg\/[0-9.]+|OPR\/[0-9.]+|SamsungBrowser\/[0-9.]+|Silk\/[0-9.]+|Puffin\/[0-9.]+|TV\s*Bro|AFT/i.test(ua);
  
  const hasAndroidWebViewToken = /;\s*wv[\);]/i.test(ua);

  if (hasAndroidWebViewToken && !isStandardBrowser) {
    return true;
  }

  return false;
}

export function getDeviceId(): string {
  let devId = localStorage.getItem("gc_device_id");
  if (!devId) {
    devId = "dev_" + Math.random().toString(36).substring(2, 11);
    localStorage.setItem("gc_device_id", devId);
  }
  return devId;
}
