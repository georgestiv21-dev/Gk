import React, { useState, useEffect } from "react";
import axios from "axios";
import { Clock, Check, Copy, MessageSquare, ExternalLink } from "lucide-react";

interface UserPendingChatProps {
  licenseKey: string;
  onActivated: () => void;
}

export default function UserPendingChatView({ licenseKey, onActivated }: UserPendingChatProps) {
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [copiedUser, setCopiedUser] = useState<boolean>(false);

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

  // Initialize and poll status every 3 seconds
  useEffect(() => {
    const checkStatus = async () => {
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
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
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
    <div className="w-full max-w-xl mx-auto animate-in fade-in duration-300 relative z-10 px-4 text-center space-y-6">
      {/* Spinning Clock Icon */}
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto flex items-center justify-center">
        <div className="absolute inset-0 bg-amber-500/30 rounded-full blur-2xl animate-pulse"></div>
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-500/10 rounded-full border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-xl relative z-10">
          <Clock className="w-8 h-8 sm:w-10 sm:h-10 animate-spin" style={{ animationDuration: "10s" }} />
        </div>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Η Αίτησή σας Βρίσκεται σε Αναμονή Έγκρισης
        </h1>
        <p className="text-sm sm:text-base text-amber-400 font-bold mt-1.5">
          Παρακαλούμε επικοινωνήστε μαζί μας για άμεση ενεργοποίηση
        </p>
        <div className="mt-3 inline-flex items-center gap-2 bg-amber-500/10 px-4 py-2 rounded-2xl border border-amber-500/30 text-xs sm:text-sm text-gray-200 shadow-sm">
          <span>Λογαριασμός: <strong className="font-mono text-amber-400 font-bold">{username}</strong></span>
          <button
            onClick={copyUsername}
            className="p-1 hover:bg-amber-500/20 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Αντιγραφή"
          >
            {copiedUser ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* CONVERSATIONS APP CONTACT SECTION DIRECTLY ON BACKGROUND */}
      <div className="pt-2 text-left space-y-3.5 max-w-md mx-auto">
        <div className="flex items-center justify-center gap-2.5 text-center">
          <div className="w-7 h-7 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center border border-emerald-500/30 shrink-0 font-extrabold text-sm">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-xs sm:text-sm font-bold text-white">Επικοινωνία μέσω Conversations</h3>
        </div>

        <p className="text-xs text-center text-gray-300">
          Στείλτε μας το όνομα χρήστη σας (<span className="font-mono text-amber-400 font-bold">{username}</span>) στη διεύθυνση:
        </p>

        <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 bg-teal-600 text-white font-black text-xs rounded-lg flex items-center justify-center shrink-0">
              G
            </div>
            <span className="font-mono text-xs sm:text-sm text-white font-bold tracking-wide truncate">
              {conversationsAddress}
            </span>
          </div>

          <button
            onClick={copyAddress}
            className="p-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-500/40"
            title="Αντιγραφή Διεύθυνσης"
          >
            {copiedAddress ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copiedAddress ? "Αντιγράφηκε" : "Αντιγραφή"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <a
            href="https://play.google.com/store/apps/details?id=eu.siacs.conversations"
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Google Play Store</span>
          </a>

          <a
            href="https://conversations.im"
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3.5 bg-white/5 hover:bg-white/10 text-gray-200 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all border border-white/10"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Ιστοσελίδα Conversations.im</span>
          </a>
        </div>
      </div>
    </div>
  );
}
