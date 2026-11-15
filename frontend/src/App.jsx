import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { CheckIn } from './pages/CheckIn';
import { Twin } from './pages/Twin';
import { Report } from './pages/Report';
import { Scan } from './pages/Scan';
import { Doctor } from './pages/Doctor';
import { Planets } from './pages/Planets';
import LifeSupport from './pages/LifeSupport';
import { Missions } from './pages/Missions';
import { Nutrition } from './pages/Nutrition';
import { LoginPage } from './pages/LoginPage';
import { initDatabase } from './db/db';

export function App() {
  const [currentAstronaut, setCurrentAstronaut] = useState(() => {
    try {
      const saved = localStorage.getItem('astroguard_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    initDatabase().catch(console.error);
  }, []);

  const handleLogin = (user) => {
    setCurrentAstronaut(user);
    try {
      localStorage.setItem('astroguard_user', JSON.stringify(user));
    } catch {}
  };

  const handleLogout = () => {
    setCurrentAstronaut(null);
    try {
      localStorage.removeItem('astroguard_user');
    } catch {}
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Core Navigation Pages */}
        <Route path="/" element={<Landing />} />
        <Route path="/checkin" element={<CheckIn />} />
        <Route path="/twin" element={<Twin />} />
        <Route path="/doctor" element={<Doctor />} />
        <Route path="/planets" element={<Planets />} />
        <Route path="/lifesupport" element={<LifeSupport />} />
        <Route
          path="/missions"
          element={
            <Missions
              currentAstronaut={currentAstronaut}
              onLoginSuccess={handleLogin}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/nutrition"
          element={
            <Nutrition
              currentAstronaut={currentAstronaut}
              onLoginSuccess={handleLogin}
            />
          }
        />
        <Route path="/report" element={<Report />} />
        <Route path="/scan" element={<Scan />} />
        <Route
          path="/login"
          element={
            <LoginPage
              currentAstronaut={currentAstronaut}
              onLoginSuccess={handleLogin}
              onLogout={handleLogout}
            />
          }
        />

        {/* Alias routes */}
        <Route path="/daily-check-in" element={<Navigate to="/checkin" replace />} />
        <Route path="/body-twin" element={<Navigate to="/twin" replace />} />
        <Route path="/ai-doctor" element={<Navigate to="/doctor" replace />} />
        <Route path="/life-support" element={<Navigate to="/lifesupport" replace />} />
        <Route path="/destinations" element={<Navigate to="/planets" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
