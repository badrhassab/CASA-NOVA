import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Landing }  from './pages/Landing';
import { CheckIn }  from './pages/CheckIn';
import { Twin }     from './pages/Twin';
import { Report }   from './pages/Report';
import { Doctor }   from './pages/Doctor';
import { Planets }  from './pages/Planets';
import { initDatabase } from './db';

export const App: React.FC = () => {
  useEffect(() => {
    initDatabase().catch(console.error);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing */}
        <Route path="/"        element={<Landing />} />

        {/* New shared-Header pages */}
        <Route path="/checkin" element={<CheckIn />} />
        <Route path="/twin"    element={<Twin />} />
        <Route path="/report"  element={<Report />} />
        <Route path="/doctor"  element={<Doctor />} />
        <Route path="/planets" element={<Planets />} />

        {/* Catch-all → Landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
