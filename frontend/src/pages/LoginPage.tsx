import React, { useState } from 'react';
import Header from '../components/Header';
import Login from '../components/Login';
import { useNavigate } from 'react-router-dom';

interface LoginPageProps {
  currentAstronaut?: any;
  onLoginSuccess?: (astronaut: any) => void;
  onLogout?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  currentAstronaut: propAstronaut,
  onLoginSuccess: propOnLoginSuccess,
  onLogout: propOnLogout,
}) => {
  const navigate = useNavigate();
  const [astronaut, setAstronaut] = useState<any>(() => {
    if (propAstronaut) return propAstronaut;
    try {
      const saved = localStorage.getItem('astroguard_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (user: any) => {
    setAstronaut(user);
    try {
      localStorage.setItem('astroguard_user', JSON.stringify(user));
    } catch {}
    if (propOnLoginSuccess) propOnLoginSuccess(user);
    navigate('/missions');
  };

  const handleLogout = () => {
    setAstronaut(null);
    try {
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
      <main className="flex-1 flex items-center justify-center p-4">
        {astronaut ? (
          <div className="max-w-md w-full border border-white/10 bg-[#090b0c]/90 p-6 text-center">
            <span className="text-[11px] uppercase tracking-[0.16em] text-emerald-400 font-mono">
              ● AUTHENTICATED SESSION
            </span>
            <h2 className="text-xl font-bold uppercase mt-2">{astronaut.full_name || astronaut.callsign}</h2>
            <p className="text-xs text-slate-400 mt-1 font-mono">Callsign: {astronaut.callsign || 'N/A'}</p>
            <p className="text-xs text-slate-400 font-mono">Role: {astronaut.role || 'Astronaut'}</p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => navigate('/missions')}
                className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-black font-semibold uppercase text-xs tracking-wider transition-colors"
              >
                Go to My Missions →
              </button>
              <button
                onClick={() => navigate('/nutrition')}
                className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white font-semibold uppercase text-xs tracking-wider transition-colors"
              >
                Go to Nutrition Journal →
              </button>
              <button
                onClick={handleLogout}
                className="w-full py-2 px-4 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-semibold uppercase text-xs tracking-wider transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-md w-full">
            <Login onLoginSuccess={handleLogin} />
          </div>
        )}
      </main>
    </div>
  );
};

export default LoginPage;
