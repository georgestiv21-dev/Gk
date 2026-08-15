import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Tv, Film, Search, User, Home } from "lucide-react";

interface FloatingNavBarProps {
  activeTab: "home" | "search" | "profile";
  typeFilter: "all" | "series" | "movie";
  onSelectTab: (tab: "home" | "search" | "profile") => void;
  onSelectType: (type: "all" | "series" | "movie") => void;
  onCenterClick?: () => void;
}

const generatePath = (x: number) => {
  // Wider and smoother curve perfectly hugging the 52px ball with balanced side spacing
  // Clamped to prevent drawing backwards over the corner radius.
  const leftFlat = Math.max(24, x - 72);
  const rightFlat = Math.min(426, x + 72);
  const cp1x = Math.max(24, x - 48);
  const cp4x = Math.min(426, x + 48);

  return `M 24 0
    L ${leftFlat} 0
    C ${cp1x} 0, ${x - 40} 38, ${x} 38
    C ${x + 40} 38, ${cp4x} 0, ${rightFlat} 0
    L 426 0
    A 24 24 0 0 1 450 24
    L 450 64
    L 0 64
    L 0 24
    A 24 24 0 0 1 24 0
    Z`;
};

export default function FloatingNavBar({
  activeTab,
  typeFilter,
  onSelectTab,
  onSelectType,
  onCenterClick,
}: FloatingNavBarProps) {
  
  const [activeKey, setActiveKey] = useState<"series" | "movie" | "center" | "profile" | "search">("center");

  // Sync with external state changes (e.g. clicking 'Back to Dashboard')
  useEffect(() => {
    if (activeTab === "search" && activeKey !== "search") setActiveKey("search");
    if (activeTab === "profile" && activeKey !== "profile") setActiveKey("profile");
    if (activeTab === "home") {
      if (typeFilter === "series" && activeKey !== "series") setActiveKey("series");
      if (typeFilter === "movie" && activeKey !== "movie") setActiveKey("movie");
      if (typeFilter === "all" && activeKey !== "center") {
        setActiveKey("center");
      }
    }
  }, [activeTab, typeFilter]);

  // X positions (Center of each button in 450px viewBox)
  const positions = {
    series: 75,
    movie: 150,
    center: 225,
    profile: 300,
    search: 375
  };

  const activeX = positions[activeKey] || 225;

  const handleSelect = (key: "series" | "movie" | "center" | "profile" | "search") => {
    setActiveKey(key);
    
    if (key === "series") {
      onSelectTab("home");
      onSelectType("series");
    } else if (key === "center") {
      if (onCenterClick) onCenterClick();
      else {
        onSelectTab("home");
        onSelectType("all");
      }
    } else if (key === "movie") {
      onSelectTab("home");
      onSelectType("movie");
    } else if (key === "search") {
      onSelectTab("search");
    } else if (key === "profile") {
      onSelectTab("profile");
    }
  };

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[450px] px-4 pointer-events-auto select-none">
      <div className="relative w-full h-[64px] mx-auto filter drop-shadow-[0_-4px_24px_rgba(0,0,0,0.6)]">
        
        {/* SVG Morphing Background */}
        <svg
          viewBox="0 0 450 64"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
        >
          <motion.path
            initial={false}
            animate={{ d: generatePath(activeX) }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="fill-[#151921] stroke-gray-800/50 stroke-[1px]" 
          />
        </svg>

        {/* ANIMATED GLIDING FLOATING BALL */}
        <motion.div
          className="absolute top-[-28px] w-[52px] h-[52px] rounded-full bg-orange-500 flex items-center justify-center shadow-[0_12px_24px_rgba(249,115,22,0.65)] z-30 pointer-events-none"
          animate={{ left: `${(activeX / 450) * 100}%`, x: "-50%" }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
        >
          <div className="text-white flex items-center justify-center w-full h-full">
            {activeKey === "series" && <Tv className="w-6 h-6 animate-in zoom-in-50 duration-200" />}
            {activeKey === "movie" && <Film className="w-6 h-6 animate-in zoom-in-50 duration-200" />}
            {activeKey === "center" && <Home className="w-6 h-6 animate-in zoom-in-50 duration-200" />}
            {activeKey === "profile" && <User className="w-6 h-6 animate-in zoom-in-50 duration-200" />}
            {activeKey === "search" && <Search className="w-6 h-6 animate-in zoom-in-50 duration-200" />}
          </div>
        </motion.div>

        {/* Buttons Container */}
        <div className="absolute inset-0 w-full h-full flex items-center z-20">
          <button
            onClick={() => handleSelect("series")}
            className="absolute top-0 bottom-0 flex flex-col items-center justify-center w-14 -ml-7 group cursor-pointer"
            style={{ left: "16.66%" }}
            title="Σειρές"
          >
            <Tv
              className={`w-5 h-5 transition-all duration-200 ${
                activeKey === "series" ? "opacity-0" : "text-gray-400 group-hover:text-white"
              }`}
            />
          </button>

          <button
            onClick={() => handleSelect("movie")}
            className="absolute top-0 bottom-0 flex flex-col items-center justify-center w-14 -ml-7 group cursor-pointer"
            style={{ left: "33.33%" }}
            title="Ταινίες"
          >
            <Film
              className={`w-5 h-5 transition-all duration-200 ${
                activeKey === "movie" ? "opacity-0" : "text-gray-400 group-hover:text-white"
              }`}
            />
          </button>

          <button
            onClick={() => handleSelect("center")}
            className="absolute top-0 bottom-0 flex flex-col items-center justify-center w-14 -ml-7 group cursor-pointer"
            style={{ left: "50%" }}
            title="Αρχική"
          >
            <Home
              className={`w-5 h-5 transition-all duration-200 ${
                activeKey === "center" ? "opacity-0" : "text-gray-400 group-hover:text-white"
              }`}
            />
          </button>

          <button
            onClick={() => handleSelect("profile")}
            className="absolute top-0 bottom-0 flex flex-col items-center justify-center w-14 -ml-7 group cursor-pointer"
            style={{ left: "66.66%" }}
            title="Προφίλ"
          >
            <User
              className={`w-5 h-5 transition-all duration-200 ${
                activeKey === "profile" ? "opacity-0" : "text-gray-400 group-hover:text-white"
              }`}
            />
          </button>

          <button
            onClick={() => handleSelect("search")}
            className="absolute top-0 bottom-0 flex flex-col items-center justify-center w-14 -ml-7 group cursor-pointer"
            style={{ left: "83.33%" }}
            title="Αναζήτηση"
          >
            <Search
              className={`w-5 h-5 transition-all duration-200 ${
                activeKey === "search" ? "opacity-0" : "text-gray-400 group-hover:text-white"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

