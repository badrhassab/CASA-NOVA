import React, { useState } from 'react';
import { ArrowRight, LockKeyhole, Orbit, ShieldAlert, UserRound } from 'lucide-react';
import { loginAstronaut } from '../services/api';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await loginAstronaut(username.trim(), password);
      onLoginSuccess({
        ...response.data.astronaut,
        access_token: response.data.access_token,
      });
    } catch (loginError) {
      setError(
        loginError.response?.data?.error ||
        'Unable to reach mission control. Check that the Django backend is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = () => {
    onLoginSuccess({
      id: 'bbbb2222-bbbb-2222-bbbb-222222222222',
      full_name: 'rachid',
      callsign: 'Doc-Eagle',
      role: 'Médecin de Bord / EVA Lead',
      email: 'jonny.kim@nasa.gov',
      blood_type: 'A+',
      radiation_accumulated_msv: 38.4,
      baseline_bone_density_tscore: 1.3,
      access_token: 'demo-token-doc-eagle',
    });
  };

  return (
    <div className="mission-page login-page relative flex min-h-screen flex-col overflow-hidden bg-[#070809] text-white">
      <div className="starfield pointer-events-none absolute inset-0" />
      <div className="login-glow pointer-events-none absolute inset-0" />
      <div className="login-watermark pointer-events-none absolute select-none" aria-hidden="true">ASTROGUARD</div>

      <header className="relative z-10 mx-auto flex w-full max-w-[1500px] items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          <Orbit className="h-6 w-6 text-orange-400" strokeWidth={1.6} />
          <div>
            <div className="font-hud text-sm font-bold tracking-wide text-white">ASTROGUARD</div>
            <div className="font-mono text-[9px] tracking-[0.24em] text-slate-500">DEEP-SPACE HEALTH</div>
          </div>
        </div>
        <div className="hidden items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,.7)]" />
          Crew access required
        </div>
        <span className="font-mono text-[9px] tracking-[0.2em] text-slate-600">V 1.0</span>
      </header>

      <main className="relative z-10 flex w-full flex-1 items-center justify-center px-5 py-8 sm:px-8">
        <section className="relative mx-auto w-full max-w-[480px]">
          <div className="absolute -inset-px bg-gradient-to-b from-orange-400/25 via-white/10 to-transparent opacity-70" />
          <div className="relative border border-white/15 bg-[#090a0bd9] p-6 shadow-[0_30px_100px_rgba(0,0,0,.5)] backdrop-blur-xl sm:p-8">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-orange-400">01 / Authorization</p>
                <h2 className="mt-3 font-hud text-2xl font-semibold uppercase tracking-wide text-white">Crew sign in</h2>
                <p className="mt-1 text-xs text-slate-500">Authenticate to enter the AstroGuard Mission System.</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center border border-orange-500/25 bg-orange-500/[0.06] text-orange-300">
                <LockKeyhole className="h-4 w-4" />
              </div>
            </div>

            {error && (
              <div role="alert" className="mb-5 flex items-center gap-2 border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-200">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="astronaut-username" className="mb-2 block font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400">Full name</label>
                <div className="relative">
                  <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="astronaut-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="e.g. Commander Alex Rivera"
                    className="w-full border border-white/10 bg-black/55 py-3 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-500/70 focus:bg-black/80"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="astronaut-password" className="mb-2 block font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400">Password</label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="astronaut-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="w-full border border-white/10 bg-black/55 py-3 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-500/70 focus:bg-black/80"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-between border border-orange-400 bg-orange-500 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#120d08] transition hover:bg-orange-400 disabled:cursor-wait disabled:opacity-60"
              >
                <span>{loading ? 'Verifying crew record…' : 'Enter mission control'}</span>
                {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-white/10 text-center">
              <button
                type="button"
                onClick={handleQuickDemo}
                className="text-[11px] font-mono uppercase tracking-wider text-slate-400 hover:text-orange-400 underline underline-offset-4 transition-colors"
              >
                ⚡ Quick Demo Crew Access (rachid · Doc-Eagle)
              </button>
            </div>

            <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-4 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-600">
              <span>Authorized crew only</span><span>HRP / 01</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-[1500px] items-center justify-between px-5 pb-5 font-mono text-[9px] uppercase tracking-[0.17em] text-slate-600 sm:px-8 lg:px-12">
        <span>AstroGuard mission system</span><span className="hidden sm:inline">Long-duration crew operations</span>
      </footer>
    </div>
  );
}
