import { useEffect, useState } from "react";
import "./Header.css";

function useHash() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

export default function Header() {
  const hash = useHash();
  const cur = (path) => (hash === path ? "page" : undefined);

  return (
    <header className="ag-header">
      <div className="ag-logo">
        ASTROGUARD
        <span>[ v1.0 ]</span>
      </div>

      <nav className="ag-nav">
        <a href="#/" aria-current={cur("#/")}>Home</a><i />
        <a href="#/daily-check-in" aria-current={cur("#/daily-check-in")}>Daily check-in</a><i />
        <a href="#/body-twin" aria-current={cur("#/body-twin")}>Body twin</a>
      </nav>

      <div className="ag-side">
        <div className="ag-status"><b /> Offline ready</div>
        <a href="#/ai-doctor">ai doctor ↗</a>
        <a href="#/report">report ↗</a>
        <a href="#/planets" className={hash === "#/planets" ? "on" : ""}>planets ↗</a>
        <a href="#/life-support" className={hash === "#/life-support" ? "on" : ""}>life support ↗</a>
      </div>
    </header>
  );
}