import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { LogOut, PlayCircle, Plus, UploadCloud, Home, Search, User, ArrowLeft, Settings, X, Search as SearchIcon, Shield, Download, CheckCircle2, Film, Sparkles, Key, Tv, ListVideo, Copy, Trash2, RefreshCw, Clock, PlusCircle, ShieldCheck, Smartphone, Calendar, AlertCircle, MessageSquare } from "lucide-react";
import type { Video } from "../types";
import Logo from "../components/Logo";
import AppBar from "../components/AppBar";
import FloatingNavBar from "../components/FloatingNavBar";
import UserPendingChatView from "../components/UserPendingChatView";
import AdminChatManager from "../components/AdminChatManager";
import UserProfileDevices from "../components/UserProfileDevices";

export default function Dashboard() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(true);
  const [activeTab, setActiveTab] = useState<"home" | "search" | "profile">("home");
  const [typeFilter, setTypeFilter] = useState<"all" | "series" | "movie">("all");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [userStatus, setUserStatus] = useState<"active" | "pending">("pending");
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const navigate = useNavigate();

  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const licenseKey = localStorage.getItem("licenseKey") || "";
  const username = localStorage.getItem("username") || "";

  useEffect(() => {
    if (!licenseKey && !username) {
      navigate("/login");
      return;
    }

    const getDeviceId = () => {
      let devId = localStorage.getItem("gc_device_id");
      if (!devId) {
        devId = "dev_" + Math.random().toString(36).substring(2, 11);
        localStorage.setItem("gc_device_id", devId);
      }
      return devId;
    };

    // Check account activation status
    axios.post("/api/user-status", { username, licenseKey, deviceId: getDeviceId() })
      .then(res => {
        const isUserAdmin = Boolean(res.data.isAdmin);
        if (isUserAdmin) {
          localStorage.setItem("isAdmin", "true");
          localStorage.setItem("isReadOnlyAdmin", res.data.isReadOnlyAdmin ? "true" : "false");
          setUserStatus("active");
        } else {
          localStorage.setItem("isAdmin", "false");
          localStorage.setItem("isReadOnlyAdmin", "false");
          if (res.data.status === "pending") {
            setUserStatus("pending");
          } else {
            setUserStatus("active");
          }
        }
      })
      .catch(() => {
        setUserStatus("pending");
      })
      .finally(() => {
        axios.get("/api/videos")
          .then(res => {
            const sorted = res.data.sort((a: Video, b: Video) => a.title.localeCompare(b.title, 'el', { sensitivity: 'base' }));
            setVideos(sorted);
          })
          .catch(err => console.error(err))
          .finally(() => setLoading(false));
      });
  }, [navigate, licenseKey, username]);

  // Global Anti-Screen Capture & Recording Alert Listener
  useEffect(() => {
    const triggerScreenRecordAlert = (reason: string) => {
      let devId = localStorage.getItem("gc_device_id");
      if (!devId) {
        devId = "dev_" + Math.random().toString(36).substring(2, 11);
        localStorage.setItem("gc_device_id", devId);
      }

      axios.post("/api/security/screen-record-alert", {
        username,
        licenseKey,
        deviceId: devId,
        details: reason
      }).catch(() => {});

      setSecurityWarning(`🚨 ΑΠΑΓΟΡΕΥΕΤΑΙ Η ΚΑΤΑΓΡΑΦΗ ΟΘΟΝΗΣ! Η προσπάθεια (${reason}) εστάλη στον διαχειριστή.`);
    };

    const handleContext = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handleContext);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "PrintScreen" ||
        (e.key === "P" && (e.metaKey || e.ctrlKey) && e.shiftKey) ||
        (e.key === "S" && (e.metaKey || e.ctrlKey) && e.shiftKey) ||
        (e.key === "3" && e.metaKey && e.shiftKey) ||
        (e.key === "4" && e.metaKey && e.shiftKey) ||
        (e.key === "5" && e.metaKey && e.shiftKey)
      ) {
        triggerScreenRecordAlert(`Πλήκτρο ${e.key} (Screenshot / Screen Capture)`);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
      navigator.mediaDevices.getDisplayMedia = function(...args) {
        triggerScreenRecordAlert("Screen Share / Capture (getDisplayMedia)");
        return originalGetDisplayMedia.apply(this, args);
      };
    }

    return () => {
      document.removeEventListener("contextmenu", handleContext);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [username, licenseKey]);

  const handleLogout = () => {
    localStorage.removeItem("licenseKey");
    localStorage.removeItem("isAdmin");
    navigate("/login");
  };

  const displayedVideos = videos
    .filter((v) => {
      if (typeFilter === "series") return v.type === "series";
      if (typeFilter === "movie") return v.type === "movie";
      return true;
    })
    .reverse();

  const filteredVideos = videos
    .filter(v => v.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .reverse();

  if (loading) {
    return (
      <div className="min-h-screen bg-darker flex flex-col items-center justify-center text-white gap-4">
        <Logo size="lg" />
        <div className="flex items-center gap-2 text-primary text-sm font-bold">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          Φόρτωση περιεχομένου...
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-darker text-white flex flex-col relative select-none ${userStatus === "pending" && !isAdmin ? "h-[100dvh] overflow-hidden bg-gradient-to-br from-darker via-amber-950/20 to-darker" : "min-h-[100dvh] overflow-x-hidden pb-28"}`}>
      
      {/* Warm Amber Glow Background Ambient Orbs */}
      {userStatus === "pending" && !isAdmin && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: "6s" }} />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/5 rounded-full blur-[140px]" />
        </div>
      )}

      {/* Security Warning Toast */}
      {securityWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[90%] bg-red-600/95 text-white border-2 border-red-400 p-4 rounded-2xl shadow-2xl backdrop-blur-xl flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black/30 rounded-xl shrink-0">
              <Shield className="w-6 h-6 text-yellow-300 animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-yellow-300">Ειδοποίηση Ασφαλείας</p>
              <p className="text-xs font-bold mt-0.5">{securityWarning}</p>
            </div>
          </div>
          <button
            onClick={() => setSecurityWarning(null)}
            className="p-1 hover:bg-black/20 rounded-lg text-white/80 hover:text-white shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Universal Application Bar */}
      <AppBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedVideo(null);
        }}
        showAdminBtn={false}
        isAdmin={isAdmin}
        isLoggedIn={true}
      />

      {/* Main Body */}
      <main className={`flex-1 max-w-7xl mx-auto w-full ${userStatus === "pending" && !isAdmin ? "px-3 py-2 flex items-center justify-center overflow-hidden my-auto" : "px-4 sm:px-8 py-6"}`}>
        {userStatus === "pending" && !isAdmin ? (
          <UserPendingChatView
            licenseKey={licenseKey}
            onActivated={() => setUserStatus("active")}
          />
        ) : selectedVideo ? (
          <TitleDetails
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
          />
        ) : activeTab === "home" ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div>
              {/* Grid of Videos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {displayedVideos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => setSelectedVideo(video)}
                    className="group cursor-pointer flex flex-col gap-2"
                  >
                    <div className="relative aspect-[2/3] bg-dark rounded-2xl overflow-hidden border border-gray-800/80 group-hover:border-primary/50 transition-all duration-300 shadow-xl group-hover:shadow-primary/10">
                      <img
                        src={video.thumbnail || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop"}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs">
                        <PlayCircle className="w-12 h-12 text-white drop-shadow-xl transform group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <span>{video.type === "movie" ? "Ταινία" : "Σειρά"}</span>
                        {video.year && <span className="text-gray-300">• {video.year}</span>}
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-xs sm:text-sm font-bold text-white leading-tight drop-shadow-md">
                          {video.title} {video.year ? `(${video.year})` : ""}
                        </h3>
                      </div>
                    </div>
                  </div>
                ))}

                {displayedVideos.length === 0 && (
                  <div className="col-span-full py-16 text-center text-gray-500">
                    Δεν βρέθηκε περιεχόμενο για αυτή την κατηγορία.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === "search" ? (
          <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                inputMode="none"
                placeholder="Αναζήτηση σειράς ή ταινίας..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors text-base"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
              {filteredVideos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => setSelectedVideo(video)}
                  className="group cursor-pointer flex flex-col gap-2"
                >
                  <div className="relative aspect-[2/3] bg-dark rounded-2xl overflow-hidden border border-gray-800 group-hover:border-primary/50 transition-all duration-300 shadow-xl">
                    <img
                      src={video.thumbnail || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop"}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs">
                      <PlayCircle className="w-12 h-12 text-white drop-shadow-xl" />
                    </div>
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <span>{video.type === "movie" ? "Ταινία" : "Σειρά"}</span>
                      {video.year && <span className="text-gray-300">• {video.year}</span>}
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight">
                        {video.title} {video.year ? `(${video.year})` : ""}
                      </h3>
                    </div>
                  </div>
                </div>
              ))}

              {filteredVideos.length === 0 && (
                <div className="col-span-full py-20 text-center text-gray-500">
                  Δεν βρέθηκαν αποτελέσματα για "{searchQuery}".
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "profile" ? (
          <div className="max-w-4xl mx-auto py-6 space-y-6 animate-in fade-in duration-300">
            {isAdmin ? (
              <AdminPanel onVideoAdded={(v) => {
                setVideos(prev => {
                  const exists = prev.findIndex(pv => pv.id === v.id);
                  if (exists !== -1) {
                    const newVideos = [...prev];
                    newVideos[exists] = v;
                    return newVideos;
                  }
                  return [v, ...prev];
                });
              }} />
            ) : (
              <UserProfileDevices
                username={username}
                licenseKey={licenseKey}
                onLogout={handleLogout}
              />
            )}
          </div>
        ) : null}
      </main>

      {/* Floating Bottom Navigation Bar */}
      {(userStatus !== "pending" || isAdmin) && (
        <FloatingNavBar
          activeTab={activeTab}
          typeFilter={typeFilter}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setSelectedVideo(null);
          }}
          onSelectType={(type) => {
            setTypeFilter(type);
            setSelectedVideo(null);
          }}
          onCenterClick={() => {
            setActiveTab("home");
            setTypeFilter("all");
            setSelectedVideo(null);
          }}
        />
      )}
    </div>
  );
}

// --- Detail View Component ---
function TitleDetails({ video, onClose }: { video: Video; onClose: () => void }) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePlay = (episodeNumber?: number) => {
    navigate('/player', { state: { video: { ...video, currentEpisode: episodeNumber || 1 } } });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-10 space-y-6">
      <button
        onClick={onClose}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-bold bg-panel px-4 py-2 rounded-xl border border-gray-800 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Πίσω στο Κατάλογο
      </button>

      {/* Hero Header Banner (Clickable to start playback) */}
      <div 
        onClick={() => handlePlay(1)}
        className="relative aspect-video sm:aspect-[21/9] rounded-3xl overflow-hidden border border-gray-800 shadow-2xl bg-dark group cursor-pointer"
      >
        <img
          src={video.thumbnail || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop"}
          alt={video.title}
          className="w-full h-full object-cover opacity-60 group-hover:opacity-50 transition-opacity duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-darker via-darker/60 to-transparent"></div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-xs">
          <PlayCircle className="w-16 h-16 text-white drop-shadow-2xl transform group-hover:scale-110 transition-transform" />
        </div>

        <div className="absolute bottom-0 left-0 p-6 sm:p-10 w-full" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-primary/30">
              {video.type === "movie" ? "Ταινία" : "Σειρά"}
            </span>
            {video.year && (
              <span className="bg-gray-800/90 text-gray-200 text-xs font-bold px-3 py-1 rounded-full border border-gray-700/80">
                {video.year}
              </span>
            )}
          </div>
          
          {/* Full Title (Olokliros Titlos) */}
          <h1 className="text-2xl sm:text-4xl font-black text-white mb-3 tracking-tight drop-shadow-lg leading-tight">
            {video.title} {video.year ? `(${video.year})` : ""}
          </h1>

          {/* Expandable Scrollable Description Container */}
          <div className="space-y-2 max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div
              className={`text-gray-100 text-xs sm:text-sm leading-relaxed transition-all ${
                isExpanded
                  ? 'max-h-56 overflow-y-auto pr-3 p-4 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl cursor-text'
                  : 'line-clamp-2 sm:line-clamp-3 drop-shadow-md'
              }`}
            >
              {video.description}
            </div>
            {video.description && video.description.length > 80 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1 cursor-pointer bg-black/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-primary/40 shadow-lg"
              >
                {isExpanded ? "Σύμπτυξη ▲" : "Περισσότερα (Σκρολ) ▼"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Episode / Details List */}
      {video.type === "series" && video.episodes && video.episodes.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Επεισόδια ({video.episodes.length})</h3>
          <div className="grid gap-3">
            {video.episodes.map((ep) => (
              <div
                key={ep.id}
                onClick={() => handlePlay(ep.episodeNumber)}
                className="flex items-center gap-4 p-3 rounded-2xl bg-panel hover:bg-gray-800/80 border border-gray-800/80 transition-all cursor-pointer group"
              >
                <div className="relative w-32 sm:w-40 aspect-video bg-gray-900 rounded-xl overflow-hidden shrink-0">
                  <img src={ep.thumbnail || "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?q=80&w=800&auto=format&fit=crop"} alt={ep.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircle className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white group-hover:text-primary transition-colors text-sm sm:text-base">{ep.title}</h4>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1 line-clamp-2">{ep.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

import { parseFilename } from "../parse-utils";

// --- Admin Upload & License Management Panel ---
interface LicenseItem {
  key: string;
  expiresAt: number;
  daysRemaining: number;
  isInfinite: boolean;
  status: "active" | "expired";
  deviceCount: number;
  maxDevices: number;
  deviceIds: string[];
  isAdminKey: boolean;
}

interface UserAccountItem {
  username: string;
  licenseKey: string;
  status: "pending" | "active";
  createdAt: number;
  expiresAt: number;
  daysRemaining: number;
  renewalsCount?: number;
  isAdmin: boolean;
  screenRecordAlertsCount?: number;
  lastScreenRecordAlert?: number;
  screenRecordDetails?: string;
}

function AdminPanel({ onVideoAdded }: { onVideoAdded: (v: Video) => void }) {
  // User Accounts State
  const [users, setUsers] = useState<UserAccountItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [approvingUser, setApprovingUser] = useState<string | null>(null);

  // Video Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Επεξεργασία...");

  const adminKey = localStorage.getItem("licenseKey") || "ADMIN-XMR-9999";
  const currentUsername = localStorage.getItem("username") || "";
  const isReadOnly = localStorage.getItem("isReadOnlyAdmin") === "true" || currentUsername.toLowerCase() === "adminvlassis";

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await axios.get(`/api/admin/users?adminKey=${encodeURIComponent(adminKey)}`);
      setUsers(res.data.users || []);
    } catch (err) {
      console.error("Error fetching user accounts:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleClearUserAlerts = async (targetUsername: string) => {
    if (isReadOnly) return;
    try {
      await axios.post("/api/admin/users/clear-alerts", {
        adminKey,
        username: targetUsername
      });
      fetchUsers();
    } catch (err) {
      console.error("Error clearing security alerts:", err);
    }
  };

  const handleApproveUser = async (username: string, days: number = 30) => {
    if (isReadOnly) return;
    if (!confirm(`Είστε σίγουρος ότι θέλετε να ορίσετε τη συνδρομή του χρήστη [${username}] σε ${days} ημέρες;`)) {
      return;
    }
    setApprovingUser(username);
    try {
      await axios.post("/api/admin/users/approve", {
        adminKey,
        username,
        days
      });
      alert(`🎉 Η συνδρομή του χρήστη '${username}' ορίστηκε επιτυχώς σε ${days} ημέρες!`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || "Σφάλμα κατά την έγκριση.");
    } finally {
      setApprovingUser(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!file) {
      alert("Επιλέξτε ένα αρχείο βίντεο.");
      return;
    }

    const parsed = parseFilename(file.name);

    setUploadLoading(true);
    setProgress(0);
    setStatusText("Μεταφόρτωση & Μετατροπή HLS στο παρασκήνιο (Μην κλείσετε τη σελίδα)...");

    // Start a fake progress for UI feel while waiting for the heavy ffmpeg task
    const fakeInterval = setInterval(() => {
      setProgress(p => (p < 85 ? p + 2 : p));
    }, 1000);

    try {
      // 1. Upload & Transcode via backend
      const formData = new FormData();
      formData.append("video", file);
      
      const uploadRes = await axios.post("/api/admin/videos/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "x-admin-key": adminKey
        }
      });

      const hlsUrl = uploadRes.data.hlsUrl;
      clearInterval(fakeInterval);
      setProgress(90);
      setStatusText("Αυτόματη ανάκτηση Metadata & Poster...");

      // 2. Fetch AI Metadata & Poster using the parsed title
      let fetchedDesc = "";
      let fetchedThumb = "";
      
      try {
        const aiRes = await axios.post("/api/admin/autofill", {
          title: parsed.title,
          adminKey
        });
        fetchedDesc = aiRes.data.description;
        fetchedThumb = aiRes.data.thumbnail;
      } catch (aiErr) {
        console.error("AI auto-fill failed, proceeding without metadata", aiErr);
      }

      setProgress(98);
      setStatusText("Αποθήκευση στη βάση δεδομένων...");

      // 3. Save to database
      const saveRes = await axios.post("/api/videos", {
        licenseKey: adminKey,
        title: parsed.title,
        year: parsed.year,
        type: parsed.type,
        episodeNumber: parsed.episodeNumber,
        url: hlsUrl,
        description: fetchedDesc || "Αυτόματα ανεβασμένο βίντεο",
        thumbnail: fetchedThumb || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop"
      });

      setProgress(100);
      setStatusText("Ολοκληρώθηκε!");
      onVideoAdded(saveRes.data.video);
      setFile(null);
      setTimeout(() => {
        setUploadLoading(false);
      }, 1000);

    } catch (err: any) {
      clearInterval(fakeInterval);
      setUploadLoading(false);
      console.error(err);
      alert(err.response?.data?.error || "Αποτυχία ανεβάσματος βίντεο");
    }
  };

  const filteredUsers = users.filter(u =>
    !u.isAdmin && u.username.toLowerCase() !== "admin" &&
    (u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
     u.licenseKey.toLowerCase().includes(userSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="text-right text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">
        Διαχειριστης: {currentUsername}
      </div>
      {/* Top Card: Upload Video Form (Hidden for Read-Only Admin) */}
      {!isReadOnly && (
        <div className="bg-panel p-6 sm:p-8 rounded-3xl border border-gray-800 shadow-xl space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
            <div className="w-10 h-10 bg-primary/20 text-primary border border-primary/30 rounded-xl flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Προσθήκη Βίντεο / Σειράς</h3>
              <p className="text-xs text-gray-400">Επιλέξτε αρχείο βίντεο &mdash; ο τίτλος και το poster ανακτώνται αυτόματα</p>
            </div>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="bg-dark p-6 rounded-2xl border border-gray-800 border-dashed text-center relative overflow-hidden group hover:border-primary/50 transition-colors cursor-pointer">
              <input
                required
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <UploadCloud className="w-8 h-8 text-gray-500 group-hover:text-primary transition-colors mx-auto mb-2" />
              <p className="text-xs sm:text-sm font-extrabold text-white">
                {file ? file.name : "Πατήστε εδώ ή σύρετε το αρχείο βίντεο (.mp4, .mkv, .m3u8)"}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Αυτόματη αναγνώριση τίτλου, σεζόν & επεισοδίου από το όνομα αρχείου</p>
            </div>

            {uploadLoading && (
              <div className="space-y-2 bg-dark p-4 rounded-xl border border-gray-800">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-primary">{statusText}</span>
                  <span className="text-gray-400">{progress}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploadLoading}
              className="w-full py-3.5 bg-primary hover:bg-primary-dark font-black text-white text-xs sm:text-sm rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ανέβασμα & Προσθήκη στον Κατάλογο</span>
            </button>
          </form>
        </div>
      )}

      {/* Bottom Card: User Accounts List */}
      <div className="bg-panel rounded-3xl border border-gray-800 shadow-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-400" />
              <span>Ενεργές συνδρομές ({filteredUsers.length})</span>
            </h3>
          </div>

          <div className="relative min-w-[240px]">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Αναζήτηση με Όνομα Χρήστη..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full bg-dark pl-10 pr-4 py-2.5 rounded-xl border border-gray-800 text-xs focus:border-primary focus:outline-none text-white placeholder-gray-500"
            />
          </div>
        </div>

        {loadingUsers ? (
          <div className="py-12 text-center text-gray-400 flex items-center justify-center gap-2 font-bold">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <span>Φόρτωση εγγεγραμμένων χρηστών...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">
            {isReadOnly ? "Δεν υπάρχουν ενεργές συνδρομές αυτή τη στιγμή." : "Δεν βρέθηκαν εγγεγραμμένοι χρήστες."}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((u) => {
              const isPending = u.status === "pending";

              return (
                <div
                  key={u.username}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    (u.screenRecordAlertsCount && u.screenRecordAlertsCount > 0)
                      ? "bg-red-950/30 border-red-500/60 shadow-lg shadow-red-500/10"
                      : isPending
                      ? "bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5"
                      : "bg-dark border-gray-800 hover:border-gray-700"
                  }`}
                >
                  {/* Renewal Dots at the top-left of the user bar */}
                  {(u.renewalsCount || 0) > 0 && (
                    <div className="flex items-center gap-1.5 pb-2 border-b border-gray-800/50" title={`Ανανεώσεις συνδρομής: ${u.renewalsCount}`}>
                      <span className="text-[10px] font-extrabold text-gray-500 mr-1 uppercase tracking-wider">Ανανεώσεις:</span>
                      {Array.from({ length: Math.min(u.renewalsCount || 1, 30) }).map((_, idx) => (
                        <span
                          key={idx}
                          className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse inline-block shrink-0"
                        />
                      ))}
                    </div>
                  )}

                  {/* Security Warning Badge if Screen Recording Attempted */}
                  {u.screenRecordAlertsCount && u.screenRecordAlertsCount > 0 ? (
                    <div className="w-full bg-red-500/15 border border-red-500/40 p-3 rounded-xl flex items-center justify-between gap-3 animate-pulse">
                      <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                        <span>
                          🚨 <strong>Ειδοποίηση Καταγραφής Οθόνης:</strong> {u.screenRecordAlertsCount} προσπάθεια(ες)!
                          {u.lastScreenRecordAlert ? ` (${new Date(u.lastScreenRecordAlert).toLocaleTimeString('el-GR')})` : ""}
                        </span>
                      </div>
                      {!isReadOnly && (
                        <button
                          onClick={() => handleClearUserAlerts(u.username)}
                          className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 text-[11px] font-extrabold rounded-lg transition-colors border border-red-500/30 cursor-pointer shrink-0"
                        >
                          Εκκαθάριση
                        </button>
                      )}
                    </div>
                  ) : null}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Account Details */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/20 text-primary border border-primary/30 rounded-xl flex items-center justify-center font-black text-sm shrink-0">
                        {u.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-white">{u.username}</span>
                          {u.isAdmin && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              🛡️ ADMIN
                            </span>
                          )}
                        </div>

                        <div className="text-xs mt-0.5 flex items-center gap-2">
                          <span className="text-gray-400">Απομένουν:</span>
                          {isPending ? (
                            <span className="text-amber-400 font-extrabold flex items-center gap-1">
                              🔴 0 ημέρες (Σε αναμονή)
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                              🟢 {u.daysRemaining} ημέρες συνδρομής
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: APPROVAL BUTTON FOR NEW ACCOUNTS (Hidden in Read-Only) */}
                    {!u.isAdmin && !isReadOnly && (
                      <div className="flex items-center gap-2 shrink-0">
                        {isPending ? (
                          <button
                            onClick={() => handleApproveUser(u.username, 30)}
                            disabled={approvingUser === u.username}
                            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            {approvingUser === u.username ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 fill-black text-emerald-400" />
                            )}
                            <span>⚡ Έγκριση (30 Ημέρες)</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleApproveUser(u.username, 30)}
                            disabled={approvingUser === u.username}
                            className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-emerald-400 font-bold text-xs rounded-xl transition-colors border border-gray-700 cursor-pointer flex items-center gap-1"
                          >
                            <span>+30 Μέρες</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
