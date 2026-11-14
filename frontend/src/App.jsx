import { useEffect, useState } from "react";
import axios from "axios";

export default function App() {
  const [status, setStatus] = useState("loading...");

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API_URL}/health/`)
      .then((res) => setStatus(res.data.status))
      .catch(() => setStatus("backend unreachable"));
  }, []);

  return <h1>CASA-NOVA: backend is {status}</h1>;
}