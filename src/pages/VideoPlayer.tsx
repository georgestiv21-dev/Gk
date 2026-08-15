import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldAlert,
  Maximize2,
  Minimize2,
  Tv,
  PlayCircle,
  ChevronRight,
  ChevronLeft,
  Lock,
  Sparkles,
  ListVideo
} from 'lucide-react';
import type { Video } from '../types';
import AppBar from '../components/AppBar';

export default function VideoPlayer() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialVideo = location.state?.video as Video;

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentVideo, setCurrentVideo] = useState<Video | null>(initialVideo || null);
  const [currentEpisode, setCurrentEpisode] = useState<number>(
    location.state?.video?.currentEpisode || 1
  );
  
  // Player size mode: 'compact' (480p window), 'expanded' (theater mode), 'fullscreen' (full window)
  const [playerSize, setPlayerSize] = useState<'compact' | 'expanded' | 'fullscreen'>('compact');
  const [isProtected, setIsProtected] = useState(false);

  useEffect(() => {
    if (!initialVideo) {
      navigate('/dashboard');
    }
  }, [initialVideo, navigate]);

  // Anti-Screen Recording & Protection Listeners
  useEffect(() => {
    const handleContext = (e: Event) => e.preventDefault();

    const handleKeydown = (e: KeyboardEvent) => {
      // Intercept PrintScreen, F12, DevTools, Inspect Element, Screen Grabber shortcuts
      if (
        e.key === 'PrintScreen' ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J' || e.key === 'S')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'p' || e.key === 's')) ||
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5'))
      ) {
        e.preventDefault();
        setIsProtected(true);
        if (videoRef.current) videoRef.current.pause();
        setTimeout(() => setIsProtected(false), 3500);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (videoRef.current) videoRef.current.pause();
        setIsProtected(true);
      } else {
        setIsProtected(false);
      }
    };

    const handleWindowBlur = () => {
      if (videoRef.current) videoRef.current.pause();
      setIsProtected(true);
    };

    const handleWindowFocus = () => {
      setIsProtected(false);
    };

    document.addEventListener('contextmenu', handleContext);
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('contextmenu', handleContext);
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  if (!currentVideo) return null;

  const totalEpisodes = currentVideo.type === 'series' ? (currentVideo.episodes?.length || 1) : 1;

  const handleSelectEpisode = (epNum: number) => {
    setCurrentEpisode(epNum);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleNextEpisode = () => {
    if (currentEpisode < totalEpisodes) {
      handleSelectEpisode(currentEpisode + 1);
    }
  };

  const handlePrevEpisode = () => {
    if (currentEpisode > 1) {
      handleSelectEpisode(currentEpisode - 1);
    }
  };

  const toggleNativeFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {
        setPlayerSize('fullscreen');
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-darker text-white flex flex-col select-none relative overflow-x-hidden">
      {/* Native App Top Navigation Bar */}
      <AppBar title={currentVideo.title} isLoggedIn={true} />

      {/* Security Overlay when Screen Grabber / Window Blur is triggered */}
      {isProtected && (
        <div className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center border border-red-500/40 shadow-2xl mb-4 animate-bounce">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
            🔒 Απαγορεύεται η Καταγραφή Οθόνης
          </h2>
          <p className="text-gray-400 text-sm max-w-md">
            Προστασία Πνευματικών Δικαιωμάτων Greek Cartoons DRM Engine.
            Η αναπαραγωγή ανεστάλη προσωρινά.
          </p>
        </div>
      )}

      {/* Main Section */}
      <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full flex flex-col gap-8">
        
        {/* Navigation back button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm font-bold bg-panel px-4 py-2.5 rounded-xl border border-gray-800/80 shadow-md hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4 text-primary" />
            <span>Πίσω στο Dashboard</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-dark px-3 py-1.5 rounded-lg border border-gray-800">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted Stream: {currentVideo.type === 'series' ? `E${currentEpisode}` : 'Movie'}</span>
          </div>
        </div>

        {/* --- VIDEO PLAYER WINDOW SECTION --- */}
        <div
          ref={containerRef}
          className={`relative bg-black rounded-3xl overflow-hidden border border-gray-800/80 shadow-2xl transition-all duration-300 mx-auto w-full ${
            playerSize === 'compact'
              ? 'max-w-4xl aspect-video'
              : playerSize === 'expanded'
              ? 'max-w-6xl aspect-video sm:aspect-[21/9]'
              : 'fixed inset-0 z-50 rounded-none border-none aspect-none w-full h-full'
          }`}
        >
          {/* Player Window Header Bar */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent z-30 flex items-center justify-between opacity-0 hover:opacity-100 transition-opacity duration-300">
            <div className="flex items-center gap-2">
              <span className="bg-primary/30 border border-primary/40 text-primary font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">
                {currentVideo.type === 'series' ? `Επεισόδιο ${currentEpisode}` : 'Ταινία'}
              </span>
              <h2 className="text-white font-bold text-sm sm:text-base drop-shadow-md truncate max-w-md">
                {currentVideo.title}
              </h2>
            </div>

            {/* Window Resize Controls (Small / Expanded / Fullscreen) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlayerSize(playerSize === 'compact' ? 'expanded' : 'compact')}
                className="px-3 py-1.5 bg-black/60 hover:bg-black/90 border border-gray-700/80 rounded-xl text-white text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-md"
                title="Αλλαγή μεγέθους παραθύρου"
              >
                <Tv className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">
                  {playerSize === 'compact' ? 'Μεγάλο Παράθυρο' : 'Μικρό Παράθυρο'}
                </span>
              </button>

              <button
                onClick={toggleNativeFullScreen}
                className="p-2 bg-black/60 hover:bg-black/90 border border-gray-700/80 rounded-xl text-white text-xs font-bold transition-all backdrop-blur-md"
                title="Πλήρης Οθόνη"
              >
                {playerSize === 'fullscreen' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Video Stream Element */}
          <video
            ref={videoRef}
            src={currentVideo.type === 'series' && currentVideo.episodes ? (currentVideo.episodes.find(ep => ep.episodeNumber === currentEpisode)?.url || currentVideo.url) : currentVideo.url}
            className="w-full h-full object-contain outline-none bg-black"
            controls
            autoPlay
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
            style={{
              filter: isProtected ? 'blur(25px)' : 'none',
              transition: 'filter 0.2s'
            }}
          />
        </div>

        {/* Video Player Info & Quick Controls */}
        <div className="bg-panel/90 backdrop-blur-xl p-6 rounded-3xl border border-gray-800/80 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                {currentVideo.type === 'series' ? `Σειρά &bull; Επεισόδιο ${currentEpisode}` : 'Ταινία'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              {currentVideo.title} {currentVideo.type === 'series' && `- Επεισόδιο ${currentEpisode}`}
            </h1>
          </div>

          {/* Next / Prev Episode Fast Action Controls */}
          {currentVideo.type === 'series' && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handlePrevEpisode}
                disabled={currentEpisode <= 1}
                className="px-4 py-2.5 bg-dark hover:bg-gray-800 border border-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Προηγούμενο</span>
              </button>

              <button
                onClick={handleNextEpisode}
                disabled={currentEpisode >= totalEpisodes}
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-1.5"
              >
                <span>Επόμενο</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* --- REMAINING EPISODES PLAYLIST SECTION --- */}
        {currentVideo.type === 'series' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <ListVideo className="w-5 h-5 text-primary" />
                <span>Υπόλοιπα Επεισόδια ({totalEpisodes})</span>
              </h3>
              <span className="text-xs text-gray-400">Επιλέξτε επεισόδιο για άμεση αναπαραγωγή</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(currentVideo.episodes || []).map((ep) => {
                const epNum = ep.episodeNumber;
                const isPlaying = epNum === currentEpisode;

                return (
                  <div
                    key={ep.id}
                    onClick={() => handleSelectEpisode(epNum)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-4 items-center group ${
                      isPlaying
                        ? 'bg-primary/10 border-primary/50 shadow-lg shadow-primary/10'
                        : 'bg-panel/80 hover:bg-dark border-gray-800/80 hover:border-gray-700'
                    }`}
                  >
                    <div className="relative w-28 aspect-video bg-darker rounded-xl overflow-hidden shrink-0 border border-gray-800">
                      <img
                        src={ep.thumbnail || currentVideo.thumbnail || "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?q=80&w=800&auto=format&fit=crop"}
                        alt={ep.title}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <PlayCircle className={`w-8 h-8 ${isPlaying ? 'text-primary' : 'text-white/80 group-hover:text-white'}`} />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className={`font-bold text-sm truncate ${isPlaying ? 'text-primary' : 'text-white'}`} title={ep.title}>
                          {ep.title || `Επεισόδιο ${epNum}`}
                        </h4>
                        {isPlaying && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-primary text-white rounded-md animate-pulse shrink-0">
                            ΤΩΡΑ
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-1" title={ep.description}>
                        {ep.description || 'Greek Cartoons High Quality Stream'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
