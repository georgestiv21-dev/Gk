import React, { useState, useEffect } from "react";
import axios from "axios";
import { User, Smartphone, Laptop, Tv, Globe, Trash2, RefreshCw, CheckCircle2, LogOut, Film, Send, Clock, XCircle } from "lucide-react";

interface ConnectedDevice {
  deviceId: string;
  deviceName: string;
  ip: string;
  lastActive: number;
  isCurrent?: boolean;
}

interface UserSuggestion {
  id: string;
  username: string;
  title: string;
  note?: string;
  timestamp: number;
  status: "pending" | "completed" | "rejected";
}

interface UserProfileDevicesProps {
  username: string;
  licenseKey: string;
  onLogout: () => void;
}

export default function UserProfileDevices({ username, licenseKey, onLogout }: UserProfileDevicesProps) {
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Movie / Series Suggestion State
  const [suggestionTitle, setSuggestionTitle] = useState("");
  const [suggestionNote, setSuggestionNote] = useState("");
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  const [suggestionSuccess, setSuggestionSuccess] = useState<string | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const getDeviceId = () => {
    let devId = localStorage.getItem("gc_device_id");
    if (!devId) {
      devId = "dev_" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem("gc_device_id", devId);
    }
    return devId;
  };

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await axios.post("/api/user/devices", {
        username,
        licenseKey,
        deviceId: getDeviceId()
      });
      setDevices(res.data.devices || []);
    } catch (err) {
      console.error("Error fetching connected devices:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMySuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await axios.post("/api/user/suggestions/my", { username });
      setUserSuggestions(res.data.suggestions || []);
    } catch (err) {
      console.error("Error fetching suggestions:", err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchMySuggestions();
  }, [username, licenseKey]);

  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionTitle.trim()) {
      setSuggestionError("Παρακαλούμε πληκτρολογήστε τον τίτλο της ταινίας ή της σειράς.");
      return;
    }

    setSubmittingSuggestion(true);
    setSuggestionError(null);
    setSuggestionSuccess(null);

    try {
      const res = await axios.post("/api/user/suggestions", {
        username,
        licenseKey,
        title: suggestionTitle.trim(),
        note: suggestionNote.trim()
      });

      setSuggestionSuccess("Η πρότασή σας στάλθηκε επιτυχώς στον διαχειριστή!");
      setSuggestionTitle("");
      setSuggestionNote("");
      fetchMySuggestions();

      setTimeout(() => {
        setSuggestionSuccess(null);
      }, 4000);
    } catch (err: any) {
      setSuggestionError(err.response?.data?.error || "Αποτυχία υποβολής της πρότασης.");
    } finally {
      setSubmittingSuggestion(false);
    }
  };

  const handleDeleteDevice = async (deviceIdToDelete: string, isCurrent?: boolean) => {
    if (!confirm(isCurrent ? "Είστε σίγουρος ότι θέλετε να αποσυνδεθείτε από αυτή τη συσκευή;" : "Είστε σίγουρος ότι θέλετε να διαγράψετε αυτή τη συσκευή;")) {
      return;
    }

    setDeletingId(deviceIdToDelete);
    try {
      const res = await axios.post("/api/user/devices/delete", {
        username,
        licenseKey,
        deviceId: getDeviceId(),
        deviceIdToDelete
      });

      if (res.data.deletedCurrent) {
        alert("Αποσυνδεθήκατε από τη τρέχουσα συσκευή.");
        onLogout();
        return;
      }

      setMessage("Η συσκευή διαγράφηκε επιτυχώς.");
      setTimeout(() => setMessage(null), 3000);
      setDevices(res.data.devices || []);
    } catch (err: any) {
      alert(err.response?.data?.error || "Σφάλμα κατά τη διαγραφή της συσκευής.");
    } finally {
      setDeletingId(null);
    }
  };

  const getDeviceIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("android") || lower.includes("iphone") || lower.includes("phone")) {
      return <Smartphone className="w-5 h-5 text-primary" />;
    }
    if (lower.includes("mac") || lower.includes("windows") || lower.includes("pc") || lower.includes("linux")) {
      return <Laptop className="w-5 h-5 text-primary" />;
    }
    if (lower.includes("tv")) {
      return <Tv className="w-5 h-5 text-primary" />;
    }
    return <Globe className="w-5 h-5 text-primary" />;
  };

  const libraryAccess = localStorage.getItem("libraryAccess") || "both";

  const getLibraryTierName = () => {
    if (libraryAccess === "gctunes") return "🧸 Greek Cartoons (GC Tunes)";
    if (libraryAccess === "greek_streaming") return "🎬 Greek Streaming";
    return "🌟 Πλήρης Πρόσβαση (Greek Cartoons & Greek Streaming)";
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* User Account Info Card */}
      <div className="p-6 sm:p-8 bg-panel/90 backdrop-blur-xl border border-gray-800 rounded-3xl space-y-6 shadow-2xl text-center">
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-full border border-primary/30 flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
          <User className="w-10 h-10" />
        </div>

        <div>
          <h3 className="text-xl font-black text-white">Ο Λογαριασμός σας ({username || "Χρήστης"})</h3>
          <p className="text-xs text-gray-400 mt-1">Ενεργή συνδρομή Greek Streaming</p>
        </div>

        <div className="p-4 bg-dark rounded-2xl border border-gray-800 text-left space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-gray-400">
            <span>License Key:</span>
            <span className="font-mono text-primary font-bold">{licenseKey}</span>
          </div>
          <div className="flex justify-between items-center text-gray-400">
            <span>Κατάσταση:</span>
            <span className="text-green-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Ενεργό
            </span>
          </div>
          <div className="flex justify-between items-center text-gray-400 pt-2 border-t border-gray-800/80">
            <span>Δικαιοδοσία / Βιβλιοθήκη:</span>
            <span className="text-amber-400 font-bold">
              {getLibraryTierName()}
            </span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Αποσύνδεση
        </button>
      </div>

      {/* Connected Devices Card */}
      <div className="p-6 bg-panel/90 backdrop-blur-xl border border-gray-800 rounded-3xl space-y-5 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 text-primary border border-primary/30 rounded-xl flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Συνδεδεμένες Συσκευές ({devices.length})</h3>
              <p className="text-xs text-gray-400">Διαχειριστείτε τις συσκευές που έχουν πρόσβαση στον λογαριασμό σας</p>
            </div>
          </div>

          <button
            onClick={fetchDevices}
            disabled={loading}
            className="p-2 bg-dark hover:bg-gray-800 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Ανανέωση συσκευών"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {message && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{message}</span>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-gray-400 flex items-center justify-center gap-2 font-bold text-xs">
            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
            <span>Φόρτωση συνδεδεμένων συσκευών...</span>
          </div>
        ) : devices.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-xs">
            Δεν βρέθηκαν συνδεδεμένες συσκευές.
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.deviceId}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  device.isCurrent
                    ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/5"
                    : "bg-dark border-gray-800 hover:border-gray-700"
                }`}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <div className="p-2.5 bg-dark border border-gray-800 rounded-xl shrink-0 mt-0.5 sm:mt-0">
                    {getDeviceIcon(device.deviceName)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-black text-white truncate max-w-[200px] sm:max-w-xs">{device.deviceName}</span>
                      {device.isCurrent && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary/20 text-primary border border-primary/30 shrink-0 whitespace-nowrap">
                          Τρέχουσα Συσκευή
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400 flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className="truncate max-w-[180px] sm:max-w-[240px] font-mono text-[10px] sm:text-[11px]" title={`IP: ${device.ip || "127.0.0.1"}`}>
                        IP: {device.ip || "127.0.0.1"}
                      </span>
                      <span className="text-gray-600 hidden sm:inline">•</span>
                      <span className={`shrink-0 font-bold ${device.isCurrent ? "text-emerald-400" : "text-gray-400"}`}>
                        {device.isCurrent ? "• Ενεργή τώρα" : `Τελευταία σύνδεση: ${new Date(device.lastActive).toLocaleDateString('el-GR')}`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-gray-800/60">
                  <button
                    onClick={() => handleDeleteDevice(device.deviceId, device.isCurrent)}
                    disabled={deletingId === device.deviceId}
                    className="w-full sm:w-auto px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    title="Διαγραφή / Αποσύνδεση συσκευής"
                  >
                    {deletingId === device.deviceId ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>{device.isCurrent ? "Αποσύνδεση" : "Διαγραφή"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggest Movie or Series Card */}
      <div className="p-6 bg-panel/90 backdrop-blur-xl border border-gray-800 rounded-3xl space-y-5 shadow-2xl">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
          <div className="w-10 h-10 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl flex items-center justify-center shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">Προτείνετε Ταινία ή Σειρά 🍿</h3>
            <p className="text-xs text-gray-400">Γράψτε τον τίτλο που θέλετε να προστεθεί στην πλατφόρμα</p>
          </div>
        </div>

        {suggestionSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{suggestionSuccess}</span>
          </div>
        )}

        {suggestionError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{suggestionError}</span>
          </div>
        )}

        <form onSubmit={handleSubmitSuggestion} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300">Τίτλος Ταινίας / Σειράς:</label>
            <input
              type="text"
              value={suggestionTitle}
              onChange={(e) => setSuggestionTitle(e.target.value)}
              placeholder="π.χ. Avatar 3, Peppa Pig, Breaking Bad S2..."
              className="w-full px-4 py-2.5 bg-dark border border-gray-800 focus:border-amber-500/80 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300">Σχόλια / Σημεία Προτίμησης (Προαιρετικό):</label>
            <input
              type="text"
              value={suggestionNote}
              onChange={(e) => setSuggestionNote(e.target.value)}
              placeholder="π.χ. Με ελληνική μεταγλώττιση, HD ποιότητα..."
              className="w-full px-4 py-2.5 bg-dark border border-gray-800 focus:border-amber-500/80 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={submittingSuggestion || !suggestionTitle.trim()}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submittingSuggestion ? (
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
            ) : (
              <Send className="w-4 h-4 text-black" />
            )}
            <span>{submittingSuggestion ? "Αποστολή..." : "Αποστολή Πρότασης"}</span>
          </button>
        </form>

        {/* My Past Suggestions */}
        {userSuggestions.length > 0 && (
          <div className="pt-4 border-t border-gray-800/80 space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Οι Προτάσεις μου ({userSuggestions.length})</span>
            </h4>

            <div className="space-y-2">
              {userSuggestions.map((sug) => (
                <div
                  key={sug.id}
                  className="p-3 bg-dark border border-gray-800 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{sug.title}</p>
                    {sug.note && <p className="text-[11px] text-gray-400 truncate mt-0.5">{sug.note}</p>}
                    <p className="text-[10px] text-gray-500 mt-1">
                      {new Date(sug.timestamp).toLocaleDateString("el-GR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {sug.status === "completed" ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Προστέθηκε! 🍿
                      </span>
                    ) : sug.status === "rejected" ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-700/50 text-gray-400 border border-gray-600">
                        Απορρίφθηκε
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Εκκρεμεί ⏳
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
