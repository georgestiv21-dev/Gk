import React from 'react';
import { ShieldAlert, MonitorX, Smartphone, Tv, AlertTriangle } from 'lucide-react';

export default function EmulatorBlockedScreen({ reason }: { reason?: string }) {
  return (
    <div className="min-h-screen bg-[#090a0c] text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none">
      <div className="max-w-md w-full bg-[#14171f] border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden">
        {/* Glow background */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Warning Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-red-500/10">
          <MonitorX className="w-8 h-8" />
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">
          Απαγορεύεται η χρήση Android Emulator
        </h1>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-xs font-semibold mb-4">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>DRM & Anti-Recording Protection</span>
        </div>

        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-6">
          Για λόγους προστασίας περιεχομένου και πνευματικών δικαιωμάτων, η εφαρμογή <b>Greek Streaming</b> δεν επιτρέπεται να εκτελείται σε εξομοιωτές υπολογιστή ή Windows Android Launchers (π.χ. BlueStacks, Nox, LDPlayer, WSA).
        </p>

        {reason && (
          <div className="bg-[#090a0c] border border-white/10 rounded-xl p-3 mb-6 text-left">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 mb-1">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              <span>Αιτία Αποκλεισμού:</span>
            </div>
            <p className="text-xs font-mono text-gray-300 break-words">{reason}</p>
          </div>
        )}

        {/* Permitted Devices */}
        <div className="bg-[#1a1d26] border border-white/10 rounded-2xl p-4 text-left mb-6">
          <p className="text-xs font-bold text-white mb-2">Υποστηριζόμενες Αυθεντικές Συσκευές:</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-primary" />
              <span>Smart TV & TV Box</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary" />
              <span>Android Smartphone</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-gray-400">
          Παρακαλούμε εγκαταστήστε το επίσημο APK απευθείας στην τηλεόραση ή στο κινητό σας τηλέφωνο.
        </p>
      </div>
    </div>
  );
}
