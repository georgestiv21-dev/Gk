import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  minDurationMs?: number;
}

export default function SplashScreen({ onComplete, minDurationMs = 1800 }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Αρχικοποίηση συστήματος...');

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / minDurationMs) * 100));
      setProgress(pct);

      if (pct > 30 && pct < 70) {
        setStatusText('Έλεγχος ασφαλείας & DRM...');
      } else if (pct >= 70) {
        setStatusText('Φόρτωση περιβάλλοντος...');
      }

      if (elapsed >= minDurationMs) {
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 200);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [minDurationMs, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 bg-[#060709] flex flex-col items-center justify-center p-6 select-none overflow-hidden"
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col items-center max-w-xs w-full text-center">
        {/* Animated GS Icon */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-6"
        >
          {/* Outer Pulsing Aura */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -inset-2 bg-gradient-to-r from-primary to-amber-500 rounded-3xl blur-md opacity-50"
          />

          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-primary via-primary-dark to-amber-600 p-0.5 shadow-2xl shadow-primary/40 flex items-center justify-center border border-white/20">
            <span className="text-4xl sm:text-5xl font-black text-white tracking-tighter drop-shadow-lg">
              GS
            </span>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Greek <span className="text-primary">Streaming</span>
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-1 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Η απόλυτη εμπειρία Streaming</span>
          </p>
        </motion.div>

        {/* Animated Progress Bar */}
        <div className="w-full bg-white/5 border border-white/10 rounded-full h-1.5 p-0.5 overflow-hidden mb-3 shadow-inner">
          <motion.div
            className="bg-gradient-to-r from-primary to-amber-400 h-full rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ ease: 'linear' }}
          />
        </div>

        {/* Status Text & DRM Badge */}
        <div className="flex items-center justify-between w-full text-[11px] text-gray-400 font-medium px-1">
          <span className="truncate">{statusText}</span>
          <span className="font-mono text-primary font-bold">{progress}%</span>
        </div>

        <div className="mt-8 inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-gray-400">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>DRM & Anti-Recording Active</span>
        </div>
      </div>
    </motion.div>
  );
}
