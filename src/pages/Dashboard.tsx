import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { LogOut, PlayCircle, Plus, UploadCloud, Home, Search, User, ArrowLeft, Settings, X, Search as SearchIcon, Shield, Download, CheckCircle2, Film, Sparkles, Key, Tv, ListVideo, Copy, Trash2, RefreshCw, Clock, PlusCircle, ShieldCheck, Smartphone, Calendar, AlertCircle, MessageSquare, Edit3, Sliders, Pencil, Eye, Check, ChevronDown } from "lucide-react";
import type { Video } from "../types";
import Logo from "../components/Logo";
import AppBar from "../components/AppBar";
import FloatingNavBar from "../components/FloatingNavBar";
import UserPendingChatView from "../components/UserPendingChatView";
import AdminChatManager from "../components/AdminChatManager";
import UserProfileDevices from "../components/UserProfileDevices";
import LiveEditModal from "../components/LiveEditModal";
import { updateScreenRecordingProtection } from "../utils/securityBridge";
import { isNativeAppEnvironment } from "../utils/appEnvironment";

export const cleanTitle = (rawTitle?: string) => {
  if (!rawTitle) return "";
  return rawTitle.replace(/\s*[\(\[]\s*\d{4}\s*[\)\]]\s*$/, "").trim();
};

export default function Dashboard() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(true);
  const [activeTab, setActiveTab] = useState<"home" | "search" | "profile">("home");
  const [typeFilter, setTypeFilter] = useState<"all" | "series" | "movie">("all");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [userStatus, setUserStatus] = useState<"active" | "pending">("pending");
  const [userLibraryAccess, setUserLibraryAccess] = useState<"gctunes" | "greek_streaming" | "both">(
    (localStorage.getItem("libraryAccess") as any) || "both"
  );
  const [categoryFilter, setCategoryFilter] = useState<"all" | "gctunes" | "greek_streaming">("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [isYearPickerOpen, setIsYearPickerOpen] = useState<boolean>(false);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  
  // Live In-Place Visual Editor State
  const [liveEditMode, setLiveEditMode] = useState<boolean>(
    () => localStorage.getItem("liveEditMode") === "true"
  );
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  const navigate = useNavigate();

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isReadOnlyAdmin, setIsReadOnlyAdmin] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  const licenseKey = localStorage.getItem("licenseKey") || "";
  const username = localStorage.getItem("username") || "";

  const toggleLiveEditMode = (val?: boolean) => {
    const nextVal = typeof val === "boolean" ? val : !liveEditMode;
    setLiveEditMode(nextVal);
    localStorage.setItem("liveEditMode", String(nextVal));
  };

  const handleSaveVideo = async (updatedVideo: Video): Promise<boolean> => {
    try {
      const res = await axios.put(`/api/videos/${updatedVideo.id}`, {
        ...updatedVideo,
        licenseKey,
        adminKey: licenseKey
      }, {
        headers: { "x-admin-key": licenseKey }
      });

      if (res.data.success) {
        const saved = res.data.video || updatedVideo;
        setVideos(prev => prev.map(v => v.id === saved.id ? saved : v));
        if (selectedVideo?.id === saved.id) {
          setSelectedVideo(saved);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error("Save video error:", err);
      return false;
    }
  };

  const handleDeleteVideo = async (videoId: string): Promise<boolean> => {
    try {
      const res = await axios.delete(`/api/videos/${videoId}`, {
        headers: { "x-admin-key": licenseKey },
        params: { adminKey: licenseKey }
      });

      if (res.data.success) {
        setVideos(prev => prev.filter(v => v.id !== videoId));
        if (selectedVideo?.id === videoId) {
          setSelectedVideo(null);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error("Delete video error:", err);
      return false;
    }
  };

  useEffect(() => {
    if (!isNativeAppEnvironment()) {
      navigate("/login", { replace: true });
      return;
    }

    const currentKey = localStorage.getItem("licenseKey") || "";
    const currentUser = localStorage.getItem("username") || "";

    if (!currentKey && !currentUser) {
      localStorage.clear();
      navigate("/login", { replace: true });
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

    // Strict server-side session check
    axios.post("/api/user-status", { username: currentUser, licenseKey: currentKey, deviceId: getDeviceId() })
      .then(res => {
        const isUserAdmin = Boolean(res.data.isAdmin);
        const isReadOnly = Boolean(res.data.isReadOnlyAdmin);
        setIsAdmin(isUserAdmin);
        setIsReadOnlyAdmin(isReadOnly);

        // Allow screen recording/screenshots for Super Admin, block for regular subscribers
        updateScreenRecordingProtection(isUserAdmin && !isReadOnly);

        if (isUserAdmin) {
          localStorage.setItem("isAdmin", "true");
          localStorage.setItem("isReadOnlyAdmin", isReadOnly ? "true" : "false");
          setUserStatus("active");
        } else {
          localStorage.removeItem("isAdmin");
          localStorage.removeItem("isReadOnlyAdmin");
          if (res.data.status === "pending") {
            setUserStatus("pending");
          } else {
            setUserStatus("active");
          }
        }

        if (res.data.libraryAccess) {
          setUserLibraryAccess(res.data.libraryAccess);
          localStorage.setItem("libraryAccess", res.data.libraryAccess);
        }

        // Fetch videos after verified authentication
        axios.get("/api/videos")
          .then(vRes => {
            const sorted = vRes.data.sort((a: Video, b: Video) => a.title.localeCompare(b.title, 'el', { sensitivity: 'base' }));
            setVideos(sorted);
          })
          .catch(err => console.error(err))
          .finally(() => setLoading(false));
      })
      .catch((err) => {
        console.warn("Session verification failed, redirecting to login:", err);
        updateScreenRecordingProtection(false);
        localStorage.clear();
        navigate("/login", { replace: true });
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, [navigate]);

  // Global Anti-Screen Capture & Recording Alert Listener (Enforced for regular users, relaxed for Admin)
  useEffect(() => {
    if (isAdmin && !isReadOnlyAdmin) {
      return; // Super Admin is allowed full screen recording & screenshots
    }

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
  }, [username, licenseKey, isAdmin, isReadOnlyAdmin]);

  const handleLogout = () => {
    updateScreenRecordingProtection(false);
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  // Check if a specific video is allowed for the active user's permissions & category filter
  const isVideoAccessible = (v: Video) => {
    // 1. User permission check
    if (!isAdmin) {
      if (userLibraryAccess === "gctunes" && v.category === "greek_streaming") {
        return false;
      }
      if (userLibraryAccess === "greek_streaming" && (v.category === "gctunes" || (!v.category && v.type !== "movie"))) {
        return false;
      }
    }

    // 2. Active category tab filter check (if user has both access or is admin)
    if (isAdmin || userLibraryAccess === "both") {
      if (categoryFilter === "gctunes") {
        return v.category === "gctunes" || !v.category;
      }
      if (categoryFilter === "greek_streaming") {
        return v.category === "greek_streaming";
      }
    }

    return true;
  };

  // Base accessible videos matching active category & type tab
  const baseCategoryVideos = videos
    .filter(isVideoAccessible)
    .filter((v) => {
      if (typeFilter === "series") return v.type === "series";
      if (typeFilter === "movie") return v.type === "movie";
      return true;
    });

  // Dynamically extract all available years ONLY present in this category/subset
  const availableYears = Array.from(
    new Set(
      baseCategoryVideos
        .map((v) => (v.year ? String(v.year).trim() : ""))
        .filter((y) => /^\d{4}$/.test(y))
    )
  ).sort((a, b) => Number(b) - Number(a));

  // Reset year filter to 'all' if active year doesn't exist in current category
  useEffect(() => {
    if (yearFilter !== "all" && !availableYears.includes(yearFilter)) {
      setYearFilter("all");
    }
  }, [categoryFilter, typeFilter, availableYears, yearFilter]);

  const displayedVideos = baseCategoryVideos
    .filter((v) => {
      if (yearFilter === "all") return true;
      return String(v.year || "").trim() === yearFilter;
    })
    .reverse();

  const filteredVideos = videos
    .filter(isVideoAccessible)
    .filter(v => cleanTitle(v.title).toLowerCase().includes(searchQuery.toLowerCase()) || v.title.toLowerCase().includes(searchQuery.toLowerCase()))
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
            isAdmin={isAdmin}
            liveEditMode={liveEditMode}
            onEditVideo={(v) => setEditingVideo(v)}
          />
        ) : activeTab === "home" ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Library Category Filter Banner / Pills with Dynamic Top-Right Year Popover */}
            {(isAdmin || userLibraryAccess === "both") ? (
              <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-2xl bg-panel/40 border border-white/5 backdrop-blur-md relative z-50">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-dark/80 p-0.5 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setCategoryFilter("all")}
                      className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                        categoryFilter === "all"
                          ? "bg-primary text-white shadow-sm shadow-primary/30"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <span className="text-[10px]">✨</span>
                      <span>Όλα</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryFilter("gctunes")}
                      className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                        categoryFilter === "gctunes"
                          ? "bg-amber-500/90 text-black shadow-sm shadow-amber-500/20"
                          : "text-gray-400 hover:text-amber-300"
                      }`}
                    >
                      <span className="text-[10px]">🧸</span>
                      <span>GC</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryFilter("greek_streaming")}
                      className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                        categoryFilter === "greek_streaming"
                          ? "bg-cyan-500/90 text-black shadow-sm shadow-cyan-500/20"
                          : "text-gray-400 hover:text-cyan-300"
                      }`}
                    >
                      <span className="text-[10px]">🎬</span>
                      <span>GS</span>
                    </button>
                  </div>
                </div>

                {/* Top-Right Rectangular Slide/Scroll Year Picker */}
                {availableYears.length > 0 && (
                  <div className="relative shrink-0 my-auto">
                    <button
                      type="button"
                      onClick={() => setIsYearPickerOpen(!isYearPickerOpen)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border shadow-sm whitespace-nowrap shrink-0 ${
                        yearFilter !== "all"
                          ? "bg-primary text-white border-primary shadow-primary/30"
                          : "bg-dark/90 hover:bg-dark text-gray-200 hover:text-white border-gray-800"
                      }`}
                      title="Επιλογή Έτους"
                    >
                      <Calendar className="w-3.5 h-3.5 shrink-0 text-gray-300" />
                      <span className="whitespace-nowrap">{yearFilter === "all" ? "Όλα" : yearFilter}</span>
                      <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isYearPickerOpen ? "rotate-180" : ""}`} />
                    </button>

                    {/* Pop-up Rectangular Box in front of posters */}
                    {isYearPickerOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-[105]"
                          onClick={() => setIsYearPickerOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-2 w-52 sm:w-60 bg-[#0f1117] border border-gray-700/80 rounded-2xl shadow-2xl z-[110] p-2.5 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10">
                          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/10 mb-1.5 text-[11px] font-black text-gray-400">
                            <span>Χρονολογία</span>
                            <span className="text-[10px] font-mono text-primary font-bold">
                              {yearFilter === "all" ? "Όλα" : yearFilter}
                            </span>
                          </div>

                          {/* Scrollable / Slide list up and down */}
                          <div className="max-h-60 sm:max-h-72 overflow-y-auto space-y-1 pr-1 overscroll-contain scrollbar-thin">
                            <button
                              type="button"
                              onClick={() => {
                                setYearFilter("all");
                                setIsYearPickerOpen(false);
                              }}
                              className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all flex items-center justify-between cursor-pointer ${
                                yearFilter === "all"
                                  ? "bg-primary text-white shadow-sm shadow-primary/30"
                                  : "text-gray-300 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <span>📅 Όλα</span>
                              {yearFilter === "all" && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>

                            {availableYears.map((yr) => (
                              <button
                                key={yr}
                                type="button"
                                onClick={() => {
                                  setYearFilter(yr);
                                  setIsYearPickerOpen(false);
                                }}
                                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all flex items-center justify-between cursor-pointer ${
                                  yearFilter === yr
                                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <span>{yr}</span>
                                {yearFilter === yr && <Check className="w-3.5 h-3.5 text-white" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-panel/30 px-3 py-1.5 rounded-2xl border border-white/5 relative z-50">
                <div className="flex items-center gap-2">
                  <span className="text-xs">{userLibraryAccess === "gctunes" ? "🧸" : "🎬"}</span>
                  <span className="text-[11px] font-black text-gray-300">
                    {userLibraryAccess === "gctunes" ? "GC (Greek Cartoons)" : "GS (Greek Streaming)"}
                  </span>
                </div>
                {availableYears.length > 0 && (
                  <div className="relative shrink-0 my-auto">
                    <button
                      type="button"
                      onClick={() => setIsYearPickerOpen(!isYearPickerOpen)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border shadow-sm whitespace-nowrap shrink-0 ${
                        yearFilter !== "all"
                          ? "bg-primary text-white border-primary shadow-primary/30"
                          : "bg-dark/90 hover:bg-dark text-gray-200 hover:text-white border-gray-800"
                      }`}
                      title="Επιλογή Έτους"
                    >
                      <Calendar className="w-3.5 h-3.5 shrink-0 text-gray-300" />
                      <span className="whitespace-nowrap">{yearFilter === "all" ? "Όλα" : yearFilter}</span>
                      <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isYearPickerOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isYearPickerOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-[105]"
                          onClick={() => setIsYearPickerOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-2 w-52 sm:w-60 bg-[#0f1117] border border-gray-700/80 rounded-2xl shadow-2xl z-[110] p-2.5 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10">
                          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/10 mb-1.5 text-[11px] font-black text-gray-400">
                            <span>Χρονολογία</span>
                            <span className="text-[10px] font-mono text-primary font-bold">
                              {yearFilter === "all" ? "Όλα" : yearFilter}
                            </span>
                          </div>

                          <div className="max-h-60 sm:max-h-72 overflow-y-auto space-y-1 pr-1 overscroll-contain scrollbar-thin">
                            <button
                              type="button"
                              onClick={() => {
                                setYearFilter("all");
                                setIsYearPickerOpen(false);
                              }}
                              className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all flex items-center justify-between cursor-pointer ${
                                yearFilter === "all"
                                  ? "bg-primary text-white shadow-sm shadow-primary/30"
                                  : "text-gray-300 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <span>📅 Όλα</span>
                              {yearFilter === "all" && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>

                            {availableYears.map((yr) => (
                              <button
                                key={yr}
                                type="button"
                                onClick={() => {
                                  setYearFilter(yr);
                                  setIsYearPickerOpen(false);
                                }}
                                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all flex items-center justify-between cursor-pointer ${
                                  yearFilter === yr
                                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <span>{yr}</span>
                                {yearFilter === yr && <Check className="w-3.5 h-3.5 text-white" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              {/* Grid of Videos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {displayedVideos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => setSelectedVideo(video)}
                    className="group cursor-pointer flex flex-col gap-2 relative"
                  >
                    <div className={`relative aspect-[2/3] bg-dark rounded-2xl overflow-hidden border transition-all duration-300 shadow-xl ${
                      isAdmin && liveEditMode 
                        ? 'border-primary/80 ring-2 ring-primary/30 shadow-primary/20' 
                        : 'border-gray-800/80 group-hover:border-primary/50 group-hover:shadow-primary/10'
                    }`}>
                      <img
                        src={video.thumbnail || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop"}
                        alt={cleanTitle(video.title)}
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

                      {/* Category Badge if both libraries accessible */}
                      {(isAdmin || userLibraryAccess === "both") && video.category && (
                        <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-wider">
                          {video.category === "greek_streaming" ? (
                            <span className="text-cyan-300 font-bold">GS</span>
                          ) : (
                            <span className="text-amber-300 font-bold">GC</span>
                          )}
                        </div>
                      )}

                      {/* Live Edit Mode In-Place Button Overlay */}
                      {isAdmin && liveEditMode && (
                        <div 
                          className="absolute inset-x-2 bottom-12 z-20 flex items-center justify-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => setEditingVideo(video)}
                            className="px-3 py-1.5 rounded-xl bg-primary text-white text-[11px] font-black shadow-lg shadow-primary/40 flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
                            title="Επεξεργασία UI & Poster"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Επεξεργασία</span>
                          </button>
                        </div>
                      )}

                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-xs sm:text-sm font-bold text-white leading-tight drop-shadow-md">
                          {cleanTitle(video.title)}
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
                  className="group cursor-pointer flex flex-col gap-2 relative"
                >
                  <div className={`relative aspect-[2/3] bg-dark rounded-2xl overflow-hidden border transition-all duration-300 shadow-xl ${
                    isAdmin && liveEditMode 
                      ? 'border-primary/80 ring-2 ring-primary/30 shadow-primary/20' 
                      : 'border-gray-800 group-hover:border-primary/50'
                  }`}>
                    <img
                      src={video.thumbnail || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop"}
                      alt={cleanTitle(video.title)}
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

                    {/* Category Badge if both libraries accessible */}
                    {(isAdmin || userLibraryAccess === "both") && video.category && (
                      <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-wider">
                        {video.category === "greek_streaming" ? (
                          <span className="text-cyan-300 font-bold">GS</span>
                        ) : (
                          <span className="text-amber-300 font-bold">GC</span>
                        )}
                      </div>
                    )}

                    {/* Live Edit Mode In-Place Button Overlay */}
                    {isAdmin && liveEditMode && (
                      <div 
                        className="absolute inset-x-2 bottom-12 z-20 flex items-center justify-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setEditingVideo(video)}
                          className="px-3 py-1.5 rounded-xl bg-primary text-white text-[11px] font-black shadow-lg shadow-primary/40 flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
                          title="Επεξεργασία UI & Poster"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Επεξεργασία</span>
                        </button>
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight">
                        {cleanTitle(video.title)}
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
              <AdminPanel 
                liveEditMode={liveEditMode}
                onToggleLiveEditMode={toggleLiveEditMode}
                onNavigateHome={() => {
                  setActiveTab("home");
                  setSelectedVideo(null);
                }}
                onVideoAdded={(v) => {
                  setVideos(prev => {
                    const exists = prev.findIndex(pv => pv.id === v.id);
                    if (exists !== -1) {
                      const newVideos = [...prev];
                      newVideos[exists] = v;
                      return newVideos;
                    }
                    return [v, ...prev];
                  });
                }}
                onRefreshVideos={() => {
                  axios.get("/api/videos")
                    .then(res => {
                      const sorted = res.data.sort((a: Video, b: Video) => a.title.localeCompare(b.title, 'el', { sensitivity: 'base' }));
                      setVideos(sorted);
                    })
                    .catch(err => console.error(err));
                }}
              />
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

      {/* Live In-Place Edit Modal */}
      <LiveEditModal
        video={editingVideo}
        isOpen={Boolean(editingVideo)}
        onClose={() => setEditingVideo(null)}
        onSave={handleSaveVideo}
        onDelete={handleDeleteVideo}
      />
    </div>
  );
}

// --- Detail View Component ---
function TitleDetails({ 
  video, 
  onClose,
  isAdmin = false,
  liveEditMode = false,
  onEditVideo
}: { 
  video: Video; 
  onClose: () => void;
  isAdmin?: boolean;
  liveEditMode?: boolean;
  onEditVideo?: (v: Video) => void;
}) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePlay = (episodeNumber?: number) => {
    navigate('/player', { state: { video: { ...video, currentEpisode: episodeNumber || 1 } } });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-10 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-xs sm:text-sm font-bold bg-panel px-3.5 py-2 rounded-xl border border-gray-800 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Πίσω στο Κατάλογο
        </button>

        {/* In-Place Visual Edit Action Button for Admins */}
        {isAdmin && liveEditMode && onEditVideo && (
          <button
            onClick={() => onEditVideo(video)}
            className="flex items-center gap-2 text-white bg-gradient-to-r from-primary to-orange-500 hover:opacity-90 transition-all text-xs font-black px-3.5 py-2 rounded-xl shadow-lg shadow-primary/25 cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Επεξεργασία</span>
          </button>
        )}
      </div>

      {/* Unified Header Card with Large Backdrop extending behind title & description */}
      <div className={`relative rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-800 shadow-2xl bg-dark flex flex-col justify-end transition-all duration-300 ${
        isExpanded ? "min-h-[460px] sm:min-h-[540px]" : "min-h-[360px] sm:min-h-[440px]"
      }`}>
        {/* Background Backdrop Image with fade only at the bottom half */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <img
            src={video.backdrop || video.thumbnail || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop"}
            alt={cleanTitle(video.title)}
            className="w-full h-full object-cover opacity-90 transition-transform duration-500"
          />
          {/* Top is clear, fade smoothly appears on the lower half behind texts */}
          <div className="absolute inset-0 bg-gradient-to-t from-darker via-darker/90 via-40% to-transparent"></div>
        </div>

        {/* Content pinned to the lower part over the subtle fade */}
        <div className="relative z-10 p-5 sm:p-7 space-y-2.5">
          {/* Category GC/GS and Type with Release Year placed DIRECTLY above the title */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Badge (GC / GS) */}
            {video.category && (
              <span className="bg-black/80 backdrop-blur-md text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border border-white/15 shadow-md">
                {video.category === "greek_streaming" ? (
                  <span className="text-cyan-300">GS</span>
                ) : (
                  <span className="text-amber-300">GC</span>
                )}
              </span>
            )}

            {/* Type & Year directly next to each other (e.g. "Σειρά • 2005" or "Ταινία • 2021") */}
            <span className="bg-primary/90 text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1.5">
              <span>{video.type === "movie" ? "Ταινία" : "Σειρά"}</span>
              {video.year && <span className="text-white/90">• {video.year}</span>}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight drop-shadow-md leading-tight">
              {cleanTitle(video.title)}
            </h1>

            {/* Play Button ONLY for Movies */}
            {video.type === "movie" && (
              <button
                onClick={() => handlePlay(1)}
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Αναπαραγωγή Τώρα</span>
              </button>
            )}
          </div>

          {/* Simple Clean Description with compact toggle */}
          {video.description && (
            <div className="space-y-1.5 max-w-4xl">
              <p className={`text-gray-200 text-xs sm:text-sm leading-relaxed drop-shadow-sm ${
                isExpanded ? "" : "line-clamp-2"
              }`}>
                {video.description}
              </p>

              {video.description.length > 90 && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-[11px] font-bold text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1 cursor-pointer bg-dark/60 hover:bg-dark px-2.5 py-1 rounded-lg border border-gray-800"
                >
                  {isExpanded ? "▲ Λιγότερα" : "▼ Περισσότερα..."}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Episode / Details List (Clean without descriptions) */}
      {video.type === "series" && video.episodes && video.episodes.length > 0 && (
        <div className="w-full max-w-full overflow-hidden space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-white">Επεισόδια ({video.episodes.length})</h3>
            {isAdmin && liveEditMode && onEditVideo && (
              <button
                type="button"
                onClick={() => onEditVideo(video)}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Διαχείριση Επεισοδίων</span>
              </button>
            )}
          </div>

          <div className="w-full max-w-full grid gap-2 sm:gap-2.5">
            {video.episodes.map((ep) => (
              <div
                key={ep.id}
                onClick={() => handlePlay(ep.episodeNumber)}
                className="w-full max-w-full flex items-center gap-2.5 sm:gap-4 p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-panel hover:bg-gray-800/90 border border-gray-800 hover:border-primary/40 transition-all cursor-pointer group overflow-hidden box-border"
              >
                <div className="relative w-20 sm:w-28 md:w-32 aspect-video bg-gray-900 rounded-lg overflow-hidden shrink-0 border border-gray-800">
                  <img 
                    src={ep.thumbnail || video.thumbnail || "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?q=80&w=800&auto=format&fit=crop"} 
                    alt={ep.title} 
                    className="w-full h-full object-cover opacity-75 group-hover:opacity-100 transition-opacity" 
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircle className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-2 overflow-hidden">
                  <h4 className="font-bold text-white group-hover:text-primary transition-colors text-xs sm:text-sm truncate min-w-0 flex-1">
                    {ep.title}
                  </h4>
                  <span className="text-gray-400 group-hover:text-primary transition-colors shrink-0 text-xs font-bold flex items-center gap-1">
                    <PlayCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Αναπαραγωγή</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
  isReadOnlyAdmin?: boolean;
  roleLabel?: string;
  libraryAccess?: "gctunes" | "greek_streaming" | "both";
  screenRecordAlertsCount?: number;
  lastScreenRecordAlert?: number;
  screenRecordDetails?: string;
}

function AdminPanel({ 
  onVideoAdded, 
  onRefreshVideos,
  liveEditMode = false,
  onToggleLiveEditMode,
  onNavigateHome
}: { 
  onVideoAdded: (v: Video) => void; 
  onRefreshVideos?: () => void;
  liveEditMode?: boolean;
  onToggleLiveEditMode?: (val?: boolean) => void;
  onNavigateHome?: () => void;
}) {
  // User Accounts State
  const [users, setUsers] = useState<UserAccountItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [showOnlyAdmins, setShowOnlyAdmins] = useState(false);
  const [approvingUser, setApprovingUser] = useState<string | null>(null);

  // User Approval / Access Control Modal State
  const [approvalModalUser, setApprovalModalUser] = useState<UserAccountItem | null>(null);
  const [modalDays, setModalDays] = useState<number>(30);
  const [modalLibraryAccess, setModalLibraryAccess] = useState<"gctunes" | "greek_streaming" | "both">("both");

  // User Deletion State (In-UI Modal without window.confirm)
  const [userToDelete, setUserToDelete] = useState<UserAccountItem | null>(null);
  const [deleteNotification, setDeleteNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  // Storj Auto-Sync State (Zero AI)
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    scannedMediaFiles: number;
    addedCount: number;
    updatedCount: number;
    totalCatalogVideos: number;
    detectedItems?: Array<{
      key: string;
      title: string;
      year?: string;
      type: "series" | "movie";
      category: "gctunes" | "greek_streaming";
      categoryLabel: string;
      episodeNumber?: number;
      episodeTitle?: string;
      thumbnail: string;
      storageUrl: string;
      status: "created" | "updated" | "already_indexed";
      statusText: string;
    }>;
    log: string[];
    message: string;
  } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Suggestions State
  interface AdminSuggestionItem {
    id: string;
    username: string;
    title: string;
    note?: string;
    timestamp: number;
    status: "pending" | "completed" | "rejected";
  }

  const [suggestions, setSuggestions] = useState<AdminSuggestionItem[]>([]);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsFilter, setSuggestionsFilter] = useState<"all" | "pending" | "completed" | "rejected">("all");

  const adminKey = localStorage.getItem("licenseKey") || "ADMIN-XMR-9999";
  const currentUsername = localStorage.getItem("username") || "";
  const isReadOnly = localStorage.getItem("isReadOnlyAdmin") === "true" || currentUsername.toLowerCase() === "adminvlassis";

  const fetchAdminSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const res = await axios.post("/api/admin/suggestions", {
        adminKey,
        username: currentUsername
      });
      setSuggestions(res.data.suggestions || []);
    } catch (err) {
      console.error("Error fetching suggestions:", err);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminSuggestions();
  }, []);

  const handleUpdateSuggestionStatus = async (id: string, newStatus: "pending" | "completed" | "rejected") => {
    if (isReadOnly) return;
    try {
      await axios.post("/api/admin/suggestions/status", {
        adminKey,
        username: currentUsername,
        id,
        status: newStatus
      });
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    } catch (err) {
      console.error("Error updating suggestion status:", err);
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    if (isReadOnly) return;
    try {
      await axios.post("/api/admin/suggestions/delete", {
        adminKey,
        username: currentUsername,
        id
      });
      setSuggestions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error("Error deleting suggestion:", err);
    }
  };

  const handleStorjSync = async () => {
    if (isReadOnly) return;
    setSyncLoading(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const res = await axios.post("/api/admin/storj-sync", {
        adminKey
      }, {
        headers: {
          "x-admin-key": adminKey
        }
      });
      setSyncResult(res.data);
      if (onRefreshVideos) {
        onRefreshVideos();
      }
    } catch (err: any) {
      setSyncError(err.response?.data?.error || "Αποτυχία κατά τον αυτόματο συγχρονισμό του Storage.");
    } finally {
      setSyncLoading(false);
    }
  };

  const fetchUsers = async (retryCount = 0) => {
    setLoadingUsers(true);
    try {
      const res = await axios.get(`/api/admin/users?adminKey=${encodeURIComponent(adminKey)}`, {
        headers: {
          "x-admin-key": adminKey
        }
      });
      setUsers(res.data.users || []);
    } catch (err: any) {
      console.error("Error fetching user accounts:", err);
      // If rate-limited (429), retry automatically after short backoff up to 2 times
      if (err.response?.status === 429 && retryCount < 2) {
        setTimeout(() => {
          fetchUsers(retryCount + 1);
        }, 1500 * (retryCount + 1));
      }
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

  const openApprovalModal = (user: UserAccountItem) => {
    setApprovalModalUser(user);
    setModalDays(user.status === "pending" ? 30 : 30);
    setModalLibraryAccess(user.libraryAccess || "both");
  };

  const openDeleteModal = (user: UserAccountItem) => {
    if (isReadOnly) return;
    setUserToDelete(user);
  };

  const executeDeleteUser = async (targetUsername: string) => {
    if (isReadOnly) return;
    setDeletingUser(targetUsername);
    setDeleteNotification(null);
    try {
      const res = await axios.post("/api/admin/users/delete", {
        adminKey,
        adminUsername: currentUsername,
        username: targetUsername
      }, {
        headers: { 
          "x-admin-key": adminKey,
          "x-username": currentUsername
        }
      });
      if (res.data.success) {
        setUsers(prev => prev.filter(u => u.username !== targetUsername));
        if (approvalModalUser?.username === targetUsername) {
          setApprovalModalUser(null);
        }
        setUserToDelete(null);
        setDeleteNotification({
          type: "success",
          message: `Ο λογαριασμός "${targetUsername}" διαγράφηκε επιτυχώς!`
        });
        setTimeout(() => setDeleteNotification(null), 4000);
      }
    } catch (err: any) {
      setDeleteNotification({
        type: "error",
        message: err.response?.data?.error || "Σφάλμα κατά τη διαγραφή του χρήστη."
      });
    } finally {
      setDeletingUser(null);
    }
  };

  const handleApproveOrUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalModalUser || isReadOnly) return;
    const targetUsername = approvalModalUser.username;

    setApprovingUser(targetUsername);
    try {
      await axios.post("/api/admin/users/approve", {
        adminKey,
        username: targetUsername,
        days: modalDays,
        libraryAccess: modalLibraryAccess
      });
      setApprovalModalUser(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || "Σφάλμα κατά την έγκριση / ενημέρωση.");
    } finally {
      setApprovingUser(null);
    }
  };

  const handleUpdateUserAccessQuick = async (username: string, libraryAccess: "gctunes" | "greek_streaming" | "both") => {
    if (isReadOnly) return;
    try {
      await axios.post("/api/admin/users/update-access", {
        adminKey,
        username,
        libraryAccess
      });
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || "Σφάλμα κατά την ενημέρωση πρόσβασης.");
    }
  };

  const filteredUsers = users.filter(u => {
    if (isReadOnly && (u.isAdmin || u.status !== "active")) {
      return false;
    }
    if (!isReadOnly) {
      if (showOnlyAdmins) {
        if (!u.isAdmin) return false;
      } else {
        if (u.isAdmin) return false;
      }
    }
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      u.username.toLowerCase().includes(q) ||
      (u.licenseKey && u.licenseKey.toLowerCase().includes(q)) ||
      (u.roleLabel && u.roleLabel.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="text-right text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">
        Διαχειριστης: {currentUsername}
      </div>

      {/* Slim Admin Top Toolbar (Sync Button + Suggestions Button + Slim Pencil Toggle Switch) */}
      {!isReadOnly && (
        <div className="flex flex-wrap items-center justify-between gap-3 py-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={syncLoading}
              onClick={handleStorjSync}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-orange-500 hover:opacity-90 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-primary/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{syncLoading ? "Συγχρονισμός..." : "Έναρξη Αυτόματου Συγχρονισμού"}</span>
            </button>

            {/* Subtle Discrete Suggestions Button */}
            <button
              type="button"
              onClick={() => {
                fetchAdminSuggestions();
                setShowSuggestionsModal(true);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Film className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Άνοιξε τις προτάσεις</span>
              {suggestions.filter(s => s.status === "pending").length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black animate-pulse shrink-0">
                  {suggestions.filter(s => s.status === "pending").length}
                </span>
              )}
            </button>
          </div>

          {/* Slim Pencil & Compact Switch */}
          <div className="flex items-center gap-2.5 bg-dark/80 border border-gray-800 px-3 py-1.5 rounded-xl">
            <Pencil className={`w-4 h-4 transition-colors ${liveEditMode ? "text-primary" : "text-gray-400"}`} />
            <button
              type="button"
              role="switch"
              aria-checked={liveEditMode}
              onClick={() => onToggleLiveEditMode && onToggleLiveEditMode(!liveEditMode)}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer flex items-center shrink-0 ${
                liveEditMode ? "bg-primary justify-end" : "bg-gray-700 justify-start"
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* Sync Status Notifications (Only when active/complete) */}
      {syncError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{syncError}</span>
        </div>
      )}

      {syncResult && (
        <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>
              {syncResult.addedCount > 0 || syncResult.updatedCount > 0
                ? `Συγχρονίστηκαν ${syncResult.addedCount + syncResult.updatedCount} στοιχεία`
                : "Ολοκληρώθηκε"}
            </span>
          </div>
          <span className="font-mono text-gray-400 text-[11px]">{syncResult.totalCatalogVideos} τίτλοι στο UI</span>
        </div>
      )}

      {/* Movie / Series Suggestions Management Modal */}
      {showSuggestionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-panel border border-gray-800 w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setShowSuggestionsModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-gray-800 shrink-0">
              <div className="w-12 h-12 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center font-black shrink-0">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  Προτάσεις Ταινιών & Σειρών ({suggestions.length})
                </h3>
                <p className="text-xs text-gray-400">
                  Αιτήματα και προτάσεις περιεχομένου από τους συνδρομητές
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0">
              {(["all", "pending", "completed", "rejected"] as const).map((filter) => {
                const count = filter === "all" ? suggestions.length : suggestions.filter(s => s.status === filter).length;
                const label = filter === "all" ? "Όλες" : filter === "pending" ? "Εκκρεμείς" : filter === "completed" ? "Προστέθηκαν" : "Απορρίφθηκαν";
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setSuggestionsFilter(filter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      suggestionsFilter === filter
                        ? "bg-amber-500 text-black font-black"
                        : "bg-dark border border-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Suggestions List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {suggestionsLoading ? (
                <div className="py-12 text-center text-gray-400 font-bold text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Φόρτωση προτάσεων...</span>
                </div>
              ) : suggestions.filter(s => suggestionsFilter === "all" || s.status === suggestionsFilter).length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-xs">
                  Δεν βρέθηκαν προτάσεις.
                </div>
              ) : (
                suggestions
                  .filter(s => suggestionsFilter === "all" || s.status === suggestionsFilter)
                  .map((sug) => (
                    <div
                      key={sug.id}
                      className="p-4 bg-dark border border-gray-800 rounded-2xl space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-white">{sug.title}</span>
                            <span className="text-[10px] px-2 py-0.5 bg-gray-800 text-gray-300 rounded-lg font-bold">
                              από {sug.username}
                            </span>
                          </div>

                          {sug.note && (
                            <p className="text-xs text-gray-300 mt-1.5 bg-panel/60 p-2.5 rounded-xl border border-gray-800/80">
                              💬 {sug.note}
                            </p>
                          )}

                          <p className="text-[10px] text-gray-500 mt-1">
                            {new Date(sug.timestamp).toLocaleDateString("el-GR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </p>
                        </div>

                        {/* Status pill */}
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
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                              Εκκρεμεί
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {!isReadOnly && (
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800/60">
                          {sug.status !== "completed" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateSuggestionStatus(sug.id, "completed")}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Προστέθηκε</span>
                            </button>
                          )}

                          {sug.status !== "rejected" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateSuggestionStatus(sug.id, "rejected")}
                              className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 text-xs font-bold transition-all cursor-pointer"
                            >
                              <span>Απόρριψη</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteSuggestion(sug.id)}
                            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                            title="Διαγραφή πρότασης"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Approval / Library Access Management Modal */}
      {approvalModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-panel border border-gray-800 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setApprovalModalUser(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
              <div className="w-12 h-12 bg-primary/20 text-primary border border-primary/30 rounded-2xl flex items-center justify-center font-black text-lg">
                {approvalModalUser.username.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  Δικαιοδοσία & Έγκριση Χρήστη
                </h3>
                <p className="text-xs text-gray-400">
                  Λογαριασμός: <span className="text-white font-bold">{approvalModalUser.username}</span> ({approvalModalUser.licenseKey})
                </p>
              </div>
            </div>

            <form onSubmit={handleApproveOrUpdateUser} className="space-y-5">
              {/* Question: Greek Cartoons, Greek Streaming, or Both */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                  <span>Επιλογή Βιβλιοθήκης Περιεχομένου:</span>
                  <span className="text-primary">*</span>
                </label>

                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalLibraryAccess("gctunes")}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      modalLibraryAccess === "gctunes"
                        ? "bg-amber-500/20 border-amber-500 text-white shadow-lg shadow-amber-500/10"
                        : "bg-dark border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🧸</span>
                      <div>
                        <div className="text-xs font-black text-white">Greek Cartoons (GC Tunes)</div>
                        <div className="text-[11px] text-gray-400">Πρόσβαση αποκλειστικά στα αρχεία του φακέλου gctunes</div>
                      </div>
                    </div>
                    {modalLibraryAccess === "gctunes" && (
                      <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalLibraryAccess("greek_streaming")}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      modalLibraryAccess === "greek_streaming"
                        ? "bg-cyan-500/20 border-cyan-500 text-white shadow-lg shadow-cyan-500/10"
                        : "bg-dark border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🎬</span>
                      <div>
                        <div className="text-xs font-black text-white">Greek Streaming</div>
                        <div className="text-[11px] text-gray-400">Πρόσβαση αποκλειστικά στα αρχεία του φακέλου Greek streaming</div>
                      </div>
                    </div>
                    {modalLibraryAccess === "greek_streaming" && (
                      <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalLibraryAccess("both")}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      modalLibraryAccess === "both"
                        ? "bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-500/10"
                        : "bg-dark border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🌟</span>
                      <div>
                        <div className="text-xs font-black text-white">Και τα δύο (Greek Cartoons & Greek Streaming)</div>
                        <div className="text-[11px] text-gray-400">Πλήρης πρόσβαση σε όλο το περιεχόμενο και των δύο φακέλων</div>
                      </div>
                    </div>
                    {modalLibraryAccess === "both" && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    )}
                  </button>
                </div>
              </div>

              {/* Days setting */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">Ημέρες Συνδρομής</label>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 60, 90, 365].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setModalDays(d)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        modalDays === d
                          ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                          : "bg-dark border-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      {d} μέρες
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={modalDays}
                  onChange={(e) => setModalDays(parseInt(e.target.value, 10) || 30)}
                  className="w-full bg-dark px-3.5 py-2.5 rounded-xl border border-gray-800 text-xs text-white focus:border-primary focus:outline-none mt-1"
                />
              </div>

              {/* Submit / Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-800">
                {!isReadOnly ? (
                  <button
                    type="button"
                    disabled={deletingUser === approvalModalUser.username}
                    onClick={() => {
                      const u = approvalModalUser;
                      setApprovalModalUser(null);
                      openDeleteModal(u);
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {deletingUser === approvalModalUser.username ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Διαγραφή</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setApprovalModalUser(null)}
                    className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Ακύρωση
                  </button>
                  <button
                    type="submit"
                    disabled={approvingUser === approvalModalUser.username}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {approvingUser === approvalModalUser.username ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 fill-black text-emerald-400" />
                    )}
                    <span>Αποθήκευση</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Card: User Accounts List */}
      <div className="bg-panel rounded-3xl border border-gray-800 shadow-xl p-6 space-y-6">
        {deleteNotification && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold ${
            deleteNotification.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
              : "bg-red-500/15 border-red-500/40 text-red-300"
          }`}>
            <span>{deleteNotification.message}</span>
            <button
              type="button"
              onClick={() => setDeleteNotification(null)}
              className="text-gray-400 hover:text-white cursor-pointer font-extrabold px-1"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-400" />
              <span>Λογαριασμοί</span>
            </h3>
          </div>

          <div className="relative min-w-[240px]">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Αναζήτηση με Όνομα Χρήστη / Ρόλο..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full bg-dark pl-10 pr-4 py-2.5 rounded-xl border border-gray-800 text-xs focus:border-primary focus:outline-none text-white placeholder-gray-500"
            />
          </div>
        </div>

        {/* Minimalist Sub-Bar: Account Counter & Admin Toggle Switch */}
        <div className="flex items-center justify-between gap-3 text-xs px-1">
          {/* Account Count placed next to the switch */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="text-gray-500 text-[11px]">Σύνολο:</span>
            <span className="text-white font-bold bg-dark px-2 py-0.5 rounded-lg border border-gray-800 text-xs">
              {filteredUsers.length}
            </span>
            <span className="text-[11px] text-gray-500 hidden sm:inline">
              {showOnlyAdmins
                ? (filteredUsers.length === 1 ? "διαχειριστής" : "διαχειριστές")
                : (filteredUsers.length === 1 ? "λογαριασμός" : "λογαριασμοί")}
            </span>
          </div>

          {/* Minimalist Admin Filter Toggle */}
          {!isReadOnly && (
            <div className="flex items-center gap-2 bg-dark/60 border border-gray-800/80 px-2.5 py-1 rounded-xl">
              <span className={`text-[11px] font-semibold transition-colors select-none ${
                showOnlyAdmins ? "text-amber-400 font-bold" : "text-gray-400"
              }`}>
                {showOnlyAdmins ? "🛡️ Μόνο Admins" : "Admins"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={showOnlyAdmins}
                onClick={() => setShowOnlyAdmins(!showOnlyAdmins)}
                className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer flex items-center shrink-0 ${
                  showOnlyAdmins ? "bg-amber-500 justify-end" : "bg-gray-700 justify-start"
                }`}
                title={showOnlyAdmins ? "Εμφάνιση μόνο διαχειριστών (Ενεργό)" : "Εμφάνιση μόνο συνδρομητών (Ανενεργό)"}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm transform transition-transform" />
              </button>
            </div>
          )}
        </div>

        {loadingUsers ? (
          <div className="py-12 text-center text-gray-400 flex items-center justify-center gap-2 font-bold">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <span>Φόρτωση εγγεγραμμένων χρηστών...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">
            {showOnlyAdmins
              ? "Δεν βρέθηκαν λογαριασμοί διαχειριστών."
              : isReadOnly
              ? "Δεν υπάρχουν ενεργές συνδρομές αυτή τη στιγμή."
              : "Δεν βρέθηκαν συνδρομητές."}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((u) => {
              const isPending = u.status === "pending";
              const isCurrentUser = u.username.toLowerCase() === currentUsername.toLowerCase();

              return (
                <div
                  key={u.username}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    (u.screenRecordAlertsCount && u.screenRecordAlertsCount > 0)
                      ? "bg-red-950/30 border-red-500/60 shadow-lg shadow-red-500/10"
                      : u.isAdmin
                      ? (u.username === "admings" 
                          ? "bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5"
                          : "bg-cyan-950/20 border-cyan-500/30")
                      : isPending
                      ? "bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5"
                      : "bg-dark border-gray-800 hover:border-gray-700"
                  }`}
                >
                  {/* Renewal Dots at the top-left of the user bar */}
                  {!u.isAdmin && (u.renewalsCount || 0) > 0 && (
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
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                        u.isAdmin
                          ? (u.username === "admings"
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                              : "bg-cyan-500/20 text-cyan-400 border-cyan-500/40")
                          : "bg-primary/20 text-primary border-primary/30"
                      }`}>
                        {u.isAdmin ? (u.username === "admings" ? "👑" : "🛡️") : u.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-white">{u.username}</span>
                          {u.isAdmin ? (
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border flex items-center gap-1 ${
                              u.username === "admings"
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                : u.username === "adminvlassis" || u.isReadOnlyAdmin
                                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                                : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            }`}>
                              <span>
                                {u.username === "admings"
                                  ? "👑 SUPER ADMIN"
                                  : (u.username === "adminvlassis" || u.isReadOnlyAdmin ? "🛡️ LIMITED ADMIN" : "🛡️ ADMIN")}
                              </span>
                            </span>
                          ) : (
                            /* Library Tier Badge for regular users */
                            u.libraryAccess === "gctunes" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                <span>🧸</span>
                                <span>Greek Cartoons</span>
                              </span>
                            ) : u.libraryAccess === "greek_streaming" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                                <span>🎬</span>
                                <span>Greek Streaming</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <span>🌟</span>
                                <span>Και τα δύο</span>
                              </span>
                            )
                          )}
                        </div>

                        <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="text-gray-400">Κατάσταση:</span>
                          {u.isAdmin ? (
                            <span className="text-amber-400 font-extrabold flex items-center gap-1">
                              👑 Απεριόριστη Πρόσβαση (Admin)
                            </span>
                          ) : isPending ? (
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

                    {/* Right: APPROVAL / ACCESS CONFIG & DELETE BUTTONS (Hidden in Read-Only) */}
                    {!isReadOnly && (
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {/* If Regular User: Quick Category switcher buttons & Settings */}
                        {!u.isAdmin && (
                          <>
                            <div className="hidden sm:flex items-center gap-1 bg-dark/80 p-1 rounded-xl border border-gray-800">
                              <button
                                type="button"
                                title="Ορισμός σε Greek Cartoons"
                                onClick={() => handleUpdateUserAccessQuick(u.username, "gctunes")}
                                className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
                                  u.libraryAccess === "gctunes"
                                    ? "bg-amber-500 text-black shadow-xs"
                                    : "text-gray-400 hover:text-white"
                                }`}
                              >
                                🧸 GC
                              </button>
                              <button
                                type="button"
                                title="Ορισμός σε Greek Streaming"
                                onClick={() => handleUpdateUserAccessQuick(u.username, "greek_streaming")}
                                className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
                                  u.libraryAccess === "greek_streaming"
                                    ? "bg-cyan-500 text-black shadow-xs"
                                    : "text-gray-400 hover:text-white"
                                }`}
                              >
                                🎬 GS
                              </button>
                              <button
                                type="button"
                                title="Ορισμός σε Και τα δύο"
                                onClick={() => handleUpdateUserAccessQuick(u.username, "both")}
                                className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
                                  !u.libraryAccess || u.libraryAccess === "both"
                                    ? "bg-emerald-500 text-black shadow-xs"
                                    : "text-gray-400 hover:text-white"
                                }`}
                              >
                                🌟 Όλα
                              </button>
                            </div>

                            {/* Open Detailed Modal button */}
                            <button
                              onClick={() => openApprovalModal(u)}
                              disabled={approvingUser === u.username}
                              className={`px-4 py-2 text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                isPending
                                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black shadow-emerald-500/20"
                                  : "bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700"
                              }`}
                            >
                              {approvingUser === u.username ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : isPending ? (
                                <CheckCircle2 className="w-4 h-4 fill-black text-emerald-400" />
                              ) : (
                                <Settings className="w-3.5 h-3.5 text-primary" />
                              )}
                              <span>{isPending ? "⚡ Έγκριση & Δικαιοδοσία" : "⚙️ Ρυθμίσεις"}</span>
                            </button>
                          </>
                        )}

                        {/* Direct Delete Account button (Available for both user and admin accounts, protected if current logged-in account) */}
                        {isCurrentUser ? (
                          <span className="px-3 py-2 rounded-xl bg-gray-800/80 text-gray-500 border border-gray-700/50 text-[11px] font-bold shrink-0" title="Τρέχων συνδεδεμένος λογαριασμός">
                            🔒 Ενεργός
                          </span>
                        ) : (
                          <button
                            type="button"
                            title={`Διαγραφή ${u.isAdmin ? 'Διαχειριστή' : 'Λογαριασμού'} (${u.username})`}
                            disabled={deletingUser === u.username}
                            onClick={() => openDeleteModal(u)}
                            className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                          >
                            {deletingUser === u.username ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            <span>Διαγραφή</span>
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

      {/* In-UI Delete Confirmation Modal (Bypasses iframe alert/confirm limitations) */}
      {userToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141824] border border-red-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Επιβεβαίωση Διαγραφής</h3>
                <p className="text-xs text-red-400 font-bold">
                  {userToDelete.isAdmin ? "⚠️ Οριστική διαγραφή Διαχειριστή" : "Οριστική διαγραφή Πελάτη"}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-300 mb-6 leading-relaxed">
              Είστε βέβαιοι ότι θέλετε να διαγράψετε οριστικά τον λογαριασμό {userToDelete.isAdmin ? "διαχειριστή " : ""}<strong className="text-white font-black">"{userToDelete.username}"</strong>;
              <br /><br />
              <span className="text-xs text-gray-400 block bg-dark/60 p-3 rounded-xl border border-gray-800">
                {userToDelete.isAdmin
                  ? "⚠️ Ο διαχειριστής θα αφαιρεθεί οριστικά και δεν θα μπορεί πλέον να συνδεθεί στην εφαρμογή ή στον πίνακα ελέγχου."
                  : "⚠️ Όλα τα δεδομένα, το κλειδί συνδρομής, οι συνδεδεμένες συσκευές και τα μηνύματα του χρήστη θα αφαιρεθούν μόνιμα από τη βάση δεδομένων."}
              </span>
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition-all cursor-pointer"
              >
                Ακύρωση
              </button>
              <button
                type="button"
                disabled={deletingUser === userToDelete.username}
                onClick={() => executeDeleteUser(userToDelete.username)}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {deletingUser === userToDelete.username ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Οριστική Διαγραφή</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
