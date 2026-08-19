import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import VideoPlayer from "./pages/VideoPlayer";
import LandingPage from "./pages/LandingPage";
import { isNativeAppEnvironment } from "./utils/appEnvironment";

export default function App() {
  const isNative = isNativeAppEnvironment();

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing and Download routes for browsers */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/download" element={<LandingPage />} />

        {isNative ? (
          <>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/player" element={<VideoPlayer />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<LandingPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}
