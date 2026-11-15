import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import MissionWorkspace from '../components/MissionWorkspace';
import Login from '../components/Login';

interface MissionsProps {
  currentAstronaut?: any;
  onLoginSuccess?: (astronaut: any) => void;
  onLogout?: () => void;
}

export const Missions: React.FC<MissionsProps> = ({
  currentAstronaut: propAstronaut,
  onLoginSuccess: propOnLoginSuccess,
  onLogout: propOnLogout,
}) => {
  const [astronaut, setAstronaut] = useState<any>(() => {
    if (propAstronaut) return propAstronaut;
    try {
      const saved = sessionStorage.getItem('astroguard_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (propAstronaut) {
      setAstronaut(propAstronaut);
    }
  }, [propAstronaut]);

  const handleLogin = (user: any) => {
    setAstronaut(user);
    try {
      sessionStorage.setItem('astroguard_user', JSON.stringify(user));
    } catch {}
    if (propOnLoginSuccess) propOnLoginSuccess(user);
  };

  const handleLogout = () => {
    setAstronaut(null);
    try {
      sessionStorage.removeItem('astroguard_user');
      localStorage.removeItem('astroguard_user');
    } catch {}
    if (propOnLogout) propOnLogout();
  };

  return (
    <div
      className="relative min-h-screen flex flex-col bg-[#050505] text-[#F2F2F0]"
      style={{ fontFamily: "'Inter Tight', sans-serif" }}
    >
      <Header />
      <main className="flex-1 w-full max-w-[1500px] mx-auto px-4 sm:px-6 py-6">
        {astronaut ? (
          <MissionWorkspace astronaut={astronaut} onLogout={handleLogout} />
        ) : (
          <div className="max-w-xl mx-auto mt-8 p-6 border border-white/10 bg-[#090b0c]/90">
            <div className="mb-6 text-center">
              <span
                className="text-[11px] uppercase tracking-[0.16em] text-orange-400 font-mono"
              >
                ■ RESTRICTED MISSION FLIGHT DECK
              </span>
              <h2 className="text-xl sm:text-2xl font-bold uppercase mt-2">
                Astronaut Authentication Required
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Log in with your crew credentials to access your active planetary flight assignments.
              </p>
            </div>
            <Login onLoginSuccess={handleLogin} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Missions;
