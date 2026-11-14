import { useEffect, useState } from "react";
import Destinations from "./pages/Destinations";
import LifeSupport from "./pages/LifeSupport";

const ROUTES = {
  "/planets": Destinations,
  "/life-support": LifeSupport,
};

const current = () => window.location.hash.slice(1) || "/planets";

export default function App() {
  const [path, setPath] = useState(current);

  useEffect(() => {
    const onChange = () => setPath(current());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const Page = ROUTES[path] || Destinations;
  return <Page />;
}