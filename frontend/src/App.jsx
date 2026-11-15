import { useEffect, useState } from "react";
import Header from "./components/Header";
import DailyCheckIn from "./pages/DailyCheckIn";
import Destinations from "./pages/Destinations";
import LifeSupport from "./pages/LifeSupport";
import Starfield from "./components/Starfield";

export default function App() {
  const [hash, setHash] = useState(window.location.hash || "#/");

  useEffect(() => {
    const onChange = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const renderPage = () => {
    if (hash === "#/planets") return <Destinations />;
    if (hash === "#/life-support") return <LifeSupport />;
    return (
      <>
        <Header />
        <DailyCheckIn />
      </>
    );
  };

  return (
    <>
      <Starfield />
      {renderPage()}
    </>
  );
}
