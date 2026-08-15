import React, { useState, useEffect } from "react";
import axios from "axios";
import { User, Smartphone, Laptop, Tv, Globe, Trash2, RefreshCw, CheckCircle2, LogOut, ShieldAlert, AlertTriangle } from "lucide-react";

interface ConnectedDevice {
  deviceId: string;
  deviceName: string;
  ip: string;
  lastActive: number;
  isCurrent?: boolean;
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

  useEffect(() => {
    fetchDevices();
  }, [username, licenseKey]);

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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* User Account Info Card */}
      <div className="p-6 sm:p-8 bg-panel/90 backdrop-blur-xl border border-gray-800 rounded-3xl space-y-6 shadow-2xl text-center">
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-full border border-primary/30 flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
          <User className="w-10 h-10" />
        </div>

        <div>
          <h3 className="text-xl font-black text-white">Ο Λογαριασμός σας ({username || "Χρήστης"})</h3>
          <p className="text-xs text-gray-400 mt-1">Ενεργή συνδρομή Greek Cartoons</p>
        </div>

        <div className="p-4 bg-dark rounded-2xl border border-gray-800 text-left space-y-2 text-xs">
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
    </div>
  );
}
