/**
 * WebToApp & Native WebView Security Bridge
 * Controls Screen Recording, Screenshots & FLAG_SECURE dynamically.
 * 
 * - Super Admin (admings / isAdmin): allowRecording = true (Screenshots & Screen Recording ALLOWED)
 * - Subscribers / Guests / Read-only: allowRecording = false (FLAG_SECURE ON - Screen Recording BLOCKED)
 */

declare global {
  interface Window {
    webtoapp?: {
      setScreenshotsAllowed?: (allowed: boolean) => void;
      setScreenRecordingAllowed?: (allowed: boolean) => void;
      postMessage?: (msg: string) => void;
    };
    AndroidInterface?: {
      setScreenshotsAllowed?: (allowed: boolean) => void;
      setFlagSecure?: (enabled: boolean) => void;
      postMessage?: (msg: string) => void;
    };
    Android?: {
      setScreenshotsAllowed?: (allowed: boolean) => void;
      setFlagSecure?: (enabled: boolean) => void;
      postMessage?: (msg: string) => void;
    };
    median?: {
      screenCapture?: {
        enable?: () => void;
        disable?: () => void;
      };
    };
    gonative?: {
      screenCapture?: {
        enable?: () => void;
        disable?: () => void;
      };
    };
    Capacitor?: {
      Plugins?: {
        PrivacyScreen?: {
          enable?: () => Promise<void>;
          disable?: () => Promise<void>;
        };
      };
    };
    __ALLOW_SCREEN_RECORDING__?: boolean;
  }
}

export function updateScreenRecordingProtection(allowRecording: boolean) {
  try {
    window.__ALLOW_SCREEN_RECORDING__ = allowRecording;

    // 1. WebToApp.design Bridge
    if (window.webtoapp) {
      if (typeof window.webtoapp.setScreenshotsAllowed === 'function') {
        window.webtoapp.setScreenshotsAllowed(allowRecording);
      }
      if (typeof window.webtoapp.setScreenRecordingAllowed === 'function') {
        window.webtoapp.setScreenRecordingAllowed(allowRecording);
      }
      if (typeof window.webtoapp.postMessage === 'function') {
        window.webtoapp.postMessage(JSON.stringify({
          action: 'setScreenshotsAllowed',
          allowed: allowRecording
        }));
      }
    }

    // 2. Generic Android WebView Interfaces
    if (window.AndroidInterface) {
      if (typeof window.AndroidInterface.setScreenshotsAllowed === 'function') {
        window.AndroidInterface.setScreenshotsAllowed(allowRecording);
      }
      if (typeof window.AndroidInterface.setFlagSecure === 'function') {
        window.AndroidInterface.setFlagSecure(!allowRecording);
      }
    }

    if (window.Android) {
      if (typeof window.Android.setScreenshotsAllowed === 'function') {
        window.Android.setScreenshotsAllowed(allowRecording);
      }
      if (typeof window.Android.setFlagSecure === 'function') {
        window.Android.setFlagSecure(!allowRecording);
      }
    }

    // 3. Median.co (GoNative)
    if (window.median?.screenCapture) {
      if (allowRecording && typeof window.median.screenCapture.disable === 'function') {
        // Disabling screen capture prevention = allowing capture
        window.median.screenCapture.disable();
      } else if (!allowRecording && typeof window.median.screenCapture.enable === 'function') {
        // Enabling screen capture prevention = blocking capture
        window.median.screenCapture.enable();
      }
    }

    if (window.gonative?.screenCapture) {
      if (allowRecording && typeof window.gonative.screenCapture.disable === 'function') {
        window.gonative.screenCapture.disable();
      } else if (!allowRecording && typeof window.gonative.screenCapture.enable === 'function') {
        window.gonative.screenCapture.enable();
      }
    }

    // 4. Capacitor Privacy Screen Plugin
    if (window.Capacitor?.Plugins?.PrivacyScreen) {
      if (allowRecording && typeof window.Capacitor.Plugins.PrivacyScreen.disable === 'function') {
        window.Capacitor.Plugins.PrivacyScreen.disable().catch(() => {});
      } else if (!allowRecording && typeof window.Capacitor.Plugins.PrivacyScreen.enable === 'function') {
        window.Capacitor.Plugins.PrivacyScreen.enable().catch(() => {});
      }
    }

    // 5. Dispatch Custom Event for internal React components
    window.dispatchEvent(
      new CustomEvent('app:security-bridge-changed', {
        detail: { allowRecording }
      })
    );

    console.log(`[Security Bridge] Screen recording & screenshots allowed: ${allowRecording}`);
  } catch (err) {
    console.warn('[Security Bridge] Error updating screen recording flags:', err);
  }
}
