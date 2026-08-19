/**
 * Anti-Emulator & Anti-VM / Windows Android Launcher Detection
 * 
 * Protects Greek Streaming content from being captured on Windows/macOS/Linux
 * via Android emulators (BlueStacks, Nox, LDPlayer, MEmu, WSA, Genymotion, VirtualBox, QEMU).
 */

export interface EmulatorCheckResult {
  isEmulator: boolean;
  reason?: string;
  details?: {
    renderer?: string;
    vendor?: string;
    platform?: string;
    userAgent?: string;
  };
}

export function detectAndroidEmulator(): EmulatorCheckResult {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { isEmulator: false };
  }

  const ua = (navigator.userAgent || '').toLowerCase();
  const platform = (navigator.platform || '').toLowerCase();

  // 1. User Agent Suspicious Keywords for PC Emulators
  const emulatorKeywords = [
    'bluestacks',
    'nox',
    'bignox',
    'memu',
    'ldplayer',
    'genymotion',
    'andy',
    'koplayer',
    'droid4x',
    'ttvm',
    'tiantian',
    'vbox',
    'virtualbox',
    'qemu',
    'goldfish',
    'ranchu',
    'microvirt',
    'wsa',
    'subsystem for android'
  ];

  for (const keyword of emulatorKeywords) {
    if (ua.includes(keyword)) {
      return {
        isEmulator: true,
        reason: `Εντοπίστηκε εξομοιωτής (${keyword}) στο User Agent`,
        details: { userAgent: ua, platform }
      };
    }
  }

  // 2. CPU Architecture Mismatch (x86 / x86_64 architecture claiming to be mobile Android)
  const isAndroidUA = /android/i.test(ua);
  const isX86Platform = /x86_64|i686|i386|x86|win32|win64|macintel/i.test(platform) || /x86_64|i686|x86/i.test(ua);

  // If UA claims Android, but platform is Windows/Mac or x86_64 PC architecture
  if (isAndroidUA && (/win32|win64|macintel/i.test(platform))) {
    return {
      isEmulator: true,
      reason: 'Εντοπίστηκε περιβάλλον Windows/Mac κάτω από Android Wrapper',
      details: { userAgent: ua, platform }
    };
  }

  // 3. WebGL GPU / Renderer Fingerprint Check (Most accurate)
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = ((gl as any).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '').toString().toLowerCase();
        const renderer = ((gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '').toString().toLowerCase();

        // Check for known PC graphics cards / VM renderers running inside Android
        const pcRenderers = [
          'swiftshader',
          'llvmpipe',
          'virtualbox',
          'vmware',
          'mesa offscreen',
          'microsoft basic render',
          'direct3d',
          'angle (nvidia',
          'angle (intel',
          'angle (amd',
          'angle (microsoft',
          'geforce',
          'radeon',
          'intel(r) uhd',
          'intel(r) hd',
          'intel(r) iris',
          'nvidia',
          'glshim',
          'softpipe'
        ];

        // Valid mobile GPUs: Adreno (Qualcomm), Mali (ARM/Exynos), PowerVR (Imagination), Xclipse (Samsung AMD Mobile), Tegra (Shield)
        const isMobileGpu = /adreno|mali|powervr|xclipse|tegra|broadcom|videocore/i.test(renderer);

        for (const pcRenderer of pcRenderers) {
          if (renderer.includes(pcRenderer) && !isMobileGpu) {
            return {
              isEmulator: true,
              reason: `Εντοπίστηκε κάρτα γραφικών υπολογιστή (${renderer}) σε περιβάλλον Android`,
              details: { renderer, vendor, platform, userAgent: ua }
            };
          }
        }

        // Generic Virtualization renderer names
        if (/emulator|goldfish|ranchu|qemu|vmware|vbox|genymotion/i.test(renderer) || /emulator|google inc\./i.test(vendor) && /swiftshader/i.test(renderer)) {
          return {
            isEmulator: true,
            reason: 'Εντοπίστηκε Virtual Machine / Emulator GPU',
            details: { renderer, vendor, platform, userAgent: ua }
          };
        }
      }
    }
  } catch (e) {
    // webgl check fallback
  }

  // 4. Touch Points check: If Android phone but 0 touch points
  if (isAndroidUA && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints === 0) {
    // Check if not Smart TV (Smart TVs may have 0 touch points, so only flag if not TV)
    const isSmartTv = /tv|googletv|smarttv|box|crkey|aft|firetv/i.test(ua);
    if (!isSmartTv && isX86Platform) {
      return {
        isEmulator: true,
        reason: 'Εντοπίστηκε συσκευή χωρίς οθόνη αφής με επεξεργαστή PC',
        details: { userAgent: ua, platform }
      };
    }
  }

  return { isEmulator: false };
}
