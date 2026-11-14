export default function Header() {
  return (
    <header className="ag-header">
      <div className="ag-logo">
        ASTROGUARD
        <span>[ v1.0 ]</span>
      </div>

      <nav className="ag-nav">
        <a href="#">Home</a><i />
        <a href="#">Daily check-in</a><i />
        <a href="#">Body twin</a>
      </nav>

      <div className="ag-side">
        <div className="ag-status"><b /> Offline ready</div>
        <a href="#">ai doctor ↗</a>
        <a href="#">report ↗</a>
        <a href="#" className="on">planets ↗</a>
        <a href="#/life-support">life support ↗</a>
      </div>
    </header>
  );
}