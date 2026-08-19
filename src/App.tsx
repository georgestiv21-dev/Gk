import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import VideoPlayer from "./pages/VideoPlayer";
import LandingPage from "./pages/LandingPage";
import { isNativeAppEnvironment } from "./utils/appEnvironment";
import { Sparkles, Globe } from "lucide-react";

export default function App() {
  const isNative = isNativeAppEnvironment();
  
  // Developer / Studio testing state to toggle between Landing Page and App
  const [studioOverride, setStudioOverride] = useState<boolean>(() => {
    return localStorage.getItem("gc_studio_preview_mode") === "app";
  });

  const togglePreviewMode = () => {
    const nextMode = !studioOverride;
    setStudioOverride(nextMode);
    localStorage.setItem("gc_studio_preview_mode", nextMode ? "app" : "landing");
  };

  const showApp = isNative || studioOverride;

  return (
    <BrowserRouter>
      {/* Floating Studio Control when inside App mode to switch back to Landing Page */}
      {showApp && !isNative && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-[#0e1626]/95 border border-purple-500/40 rounded-full px-4 py-2 shadow-2xl backdrop-blur-xl">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse"></div>
          <span className="text-xs font-semibold text-gray-300">Studio Test:</span>
          <button
            onClick={togglePreviewMode}
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Προβολή Landing Page</span>
          </button>
        </div>
      )}

      <Routes>
        {/* Always accessible landing routes for testing */}
        <Route 
          path="/landing" 
          element={
            <LandingPage 
              onTogglePreviewMode={togglePreviewMode} 
              isPreviewingApp={showApp} 
            />
          } 
        />
        <Route 
          path="/download" 
          element={
            <LandingPage 
              onTogglePreviewMode={togglePreviewMode} 
              isPreviewingApp={showApp} 
            />
          } 
        />

        {showApp ? (
          <>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/player" element={<VideoPlayer />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            <Route 
              path="/" 
              element={
                <LandingPage 
                  onTogglePreviewMode={togglePreviewMode} 
                  isPreviewingApp={showApp} 
                />
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}
