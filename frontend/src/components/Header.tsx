import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

// ─── Nav definition ──────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'HOME',           path: '/'           },
  { label: 'DAILY CHECK-IN', path: '/checkin'    },
  { label: 'BODY TWIN',      path: '/twin'       },
  { label: 'MISSIONS',       path: '/missions'   },
  { label: 'NUTRITION',      path: '/nutrition'  },
] as const;

const QUICK_LINKS = [
  { label: 'ai doctor',    path: '/doctor'      },
  { label: 'planets',      path: '/planets'     },
  { label: 'life support', path: '/lifesupport' },
  { label: 'report',       path: '/report'      },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

interface HeaderProps {
  /** Extra className forwarded to the outer <header> */
  className?: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ className = '', onLogout }) => {
  const { pathname } = useLocation();
  const [crew, setCrew] = useState<any>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('astroguard_user');
      if (saved) setCrew(JSON.parse(saved));
    } catch {}
  }, []);

  const handleLogoutClick = () => {
    try {
      localStorage.removeItem('astroguard_user');
    } catch {}
    if (onLogout) {
      onLogout();
    } else {
      window.location.href = '/';
      window.location.reload();
    }
  };

  return (
    <header
      className={`relative z-30 flex items-start justify-between px-6 md:px-12 pt-7 ${className}`}
    >
      {/* ── Top-Left: Logo ─────────────────────────────────────────────── */}
      <div className="gs-header-logo flex flex-col items-start">
        <Link
          to="/"
          className="text-xl md:text-[22px] font-bold tracking-tight transition-colors"
          style={{ color: 'var(--fg, #F2F2F0)', fontFamily: "'Inter Tight', sans-serif" }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--orange, #FF5A1F)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg, #F2F2F0)')}
        >
          ASTROGUARD
        </Link>
        <span
          className="text-[11px] mt-0.5 tracking-wider"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--muted, #8A8A86)' }}
        >
          [ v1.0 ]
        </span>
      </div>

      {/* ── Top-Center: Nav items with orange dots ─────────────────────── */}
      <nav className="hidden lg:flex items-center gap-4 pt-1">
        {NAV_ITEMS.map((item, i) => {
          const isActive = pathname === item.path;
          return (
            <React.Fragment key={item.path}>
              {i > 0 && (
                <span
                  className="gs-nav-dot w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: 'var(--orange, #FF5A1F)' }}
                />
              )}
              <Link
                to={item.path}
                className="gs-nav-item text-[17px] font-medium uppercase tracking-tight transition-colors"
                style={{
                  fontFamily: "'Inter Tight', sans-serif",
                  color: isActive ? 'var(--fg, #F2F2F0)' : 'var(--muted, #8A8A86)',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--fg, #F2F2F0)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--muted, #8A8A86)'; }}
              >
                {item.label}
              </Link>
            </React.Fragment>
          );
        })}
      </nav>

      {/* ── Top-Right: Crew Badge + Quick links + Logout ───────────────── */}
      <div className="gs-header-right flex flex-col items-end gap-1">
        {/* Offline ready badge & Active crew */}
        <div
          className="flex items-center gap-2 mb-1"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--muted, #8A8A86)', fontSize: 12 }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: '#10B981' }}
          />
          <span className="uppercase tracking-wider">
            {crew ? `CREW: ${crew.callsign || crew.full_name?.split(' ')[0]}` : 'OFFLINE READY'}
          </span>
          <button
            onClick={handleLogoutClick}
            title="Log out of current astronaut session"
            className="ml-2 text-[10px] uppercase tracking-wider text-rose-400 hover:text-rose-300 border border-rose-500/30 hover:border-rose-400/60 px-1.5 py-0.5 rounded transition-all"
          >
            Logout
          </button>
        </div>

        {/* Stacked quick links */}
        {QUICK_LINKS.map(link => {
          const isActive = pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className="transition-all duration-200"
              style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 16,
                fontWeight: 500,
                lineHeight: 1.4,
                color: isActive ? 'var(--orange, #FF5A1F)' : 'var(--fg, #F2F2F0)',
                opacity: isActive ? 1 : 0.85,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.opacity = '1';
                const arrow = e.currentTarget.querySelector<HTMLSpanElement>('.link-arrow');
                if (arrow) { arrow.style.transform = 'translate(2px, -2px)'; }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.opacity = isActive ? '1' : '0.85';
                const arrow = e.currentTarget.querySelector<HTMLSpanElement>('.link-arrow');
                if (arrow) { arrow.style.transform = 'translate(0, 0)'; }
              }}
            >
              {link.label}
              <span className="link-arrow" style={{ display: 'inline-block', transition: 'transform 0.2s ease', marginLeft: 2 }}>↗</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
};

export default Header;
