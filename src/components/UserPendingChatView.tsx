import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Clock, Check, Copy, ExternalLink } from "lucide-react";

interface UserPendingChatProps {
  licenseKey: string;
  onActivated: () => void;
}

export default function UserPendingChatView({ licenseKey, onActivated }: UserPendingChatProps) {
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [copiedUser, setCopiedUser] = useState<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);

  const username = localStorage.getItem("username") || licenseKey;
  const conversationsAddress = "gctoons@conversations.im";

  const getDeviceId = () => {
    let devId = localStorage.getItem("gc_device_id");
    if (!devId) {
      devId = "dev_" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem("gc_device_id", devId);
    }
    return devId;
  };

  // Initialize and poll status cleanly
  useEffect(() => {
    const checkStatus = async () => {
      if (isCheckingRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

      isCheckingRef.current = true;
      try {
        const deviceId = getDeviceId();
        const res = await axios.post("/api/user-status", {
          username,
          licenseKey,
          deviceId
        });

        if (res.data.status === "active") {
          onActivated();
        }
      } catch (err) {
        console.error("Status check error:", err);
      } finally {
        isCheckingRef.current = false;
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 7000);
    return () => clearInterval(interval);
  }, [licenseKey, username, onActivated]);

  const copyUsername = () => {
    navigator.clipboard.writeText(username);
    setCopiedUser(true);
    setTimeout(() => setCopiedUser(false), 2000);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(conversationsAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  return (
    <div className="w-full max-w-lg mx-auto animate-in fade-in duration-300 relative z-10 px-4 text-center space-y-5 py-4">
      {/* Yellow / Amber Clock Icon with ambient glow */}
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto flex items-center justify-center">
        <div className="absolute inset-0 bg-amber-500/30 rounded-full blur-2xl animate-pulse"></div>
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-500/10 rounded-full border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-xl relative z-10">
          <Clock className="w-8 h-8 sm:w-10 sm:h-10 animate-spin" style={{ animationDuration: "10s" }} />
        </div>
      </div>

      {/* Main instruction in Yellow/Amber text */}
      <div className="space-y-2">
        <p className="text-base sm:text-lg font-bold text-amber-400 leading-relaxed px-2">
          Για να ενεργοποιηθεί ο λογαριασμός σας, επικοινωνήστε μαζί μας μέσω της εφαρμογής Conversations
        </p>
        <p className="text-xs sm:text-sm text-gray-300 font-medium px-2">
          Στείλτε μας το όνομα του λογαριασμού σας στη διεύθυνσή μας στο Conversations
        </p>
      </div>

      {/* Copy Fields: Username and Conversations Address */}
      <div className="space-y-2.5 text-left max-w-md mx-auto">
        {/* Username copy box */}
        <div className="bg-panel/90 px-3.5 py-2.5 rounded-2xl border border-white/10 flex items-center justify-between gap-3 shadow-md">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] uppercase font-bold text-gray-400">Όνομα Λογαριασμού:</span>
            <span className="font-mono text-xs sm:text-sm font-bold text-amber-400 truncate">{username}</span>
          </div>
          <button
            type="button"
            onClick={copyUsername}
            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border border-amber-500/40"
            title="Αντιγραφή Ονόματος"
          >
            {copiedUser ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedUser ? "Αντιγράφηκε" : "Copy"}</span>
          </button>
        </div>

        {/* Conversations address copy box */}
        <div className="bg-panel/90 px-3.5 py-2.5 rounded-2xl border border-white/10 flex items-center justify-between gap-3 shadow-md">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] uppercase font-bold text-gray-400">Διεύθυνση Conversations:</span>
            <span className="font-mono text-xs sm:text-sm font-bold text-white truncate">{conversationsAddress}</span>
          </div>
          <button
            type="button"
            onClick={copyAddress}
            className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border border-emerald-500/40"
            title="Αντιγραφή Διεύθυνσης"
          >
            {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedAddress ? "Αντιγράφηκε" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Download App links with small helper text */}
      <div className="pt-2 space-y-2.5 max-w-md mx-auto">
        <p className="text-[11px] text-gray-400">
          Πατήστε το link για να την κατεβάσετε
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <a
            href="https://play.google.com/store/apps/details?id=eu.siacs.conversations"
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Google Play</span>
          </a>

          <a
            href="https://conversations.im"
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3.5 bg-white/5 hover:bg-white/10 text-gray-200 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all border border-white/10"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Ιστοσελίδα</span>
          </a>
        </div>
      </div>
    </div>
  );
}
