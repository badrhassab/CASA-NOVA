import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import NutritionModule from '../components/NutritionModule';
import Login from '../components/Login';

interface NutritionProps {
  currentAstronaut?: any;
  onLoginSuccess?: (astronaut: any) => void;
}

export const Nutrition: React.FC<NutritionProps> = ({
  currentAstronaut: propAstronaut,
  onLoginSuccess: propOnLoginSuccess,
}) => {
  const [astronaut, setAstronaut] = useState<any>(() => {
    if (propAstronaut) return propAstronaut;
    try {
      const saved = localStorage.getItem('astroguard_user');
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
      localStorage.setItem('astroguard_user', JSON.stringify(user));
    } catch {}
    if (propOnLoginSuccess) propOnLoginSuccess(user);
  };

  return (
    <div
      className="relative min-h-screen flex flex-col bg-[#050505] text-[#F2F2F0]"
      style={{ fontFamily: "'Inter Tight', sans-serif" }}
    >
      <Header />
      <main className="flex-1 w-full max-w-[1500px] mx-auto px-4 sm:px-6 py-6">
        {astronaut ? (
          <NutritionModule astronaut={astronaut} />
        ) : (
          <div className="max-w-xl mx-auto mt-8 p-6 border border-white/10 bg-[#090b0c]/90">
            <div className="mb-6 text-center">
              <span
                className="text-[11px] uppercase tracking-[0.16em] text-orange-400 font-mono"
              >
                ■ RESTRICTED NUTRITION MANAGEMENT SYSTEM
              </span>
              <h2 className="text-xl sm:text-2xl font-bold uppercase mt-2">
                Astronaut Authentication Required
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Log in to review and log your daily space rations, macronutrients, and SANS risk assessments.
              </p>
            </div>
            <Login onLoginSuccess={handleLogin} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Nutrition;
