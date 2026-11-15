import React, { useState } from 'react';
import MissionWorkspace from './components/MissionWorkspace';
import Login from './components/Login';

export default function App() {
  const [currentAstronaut, setCurrentAstronaut] = useState(null);

  if (!currentAstronaut) {
    return <Login onLoginSuccess={setCurrentAstronaut} />;
  }

  return (
    <MissionWorkspace
      astronaut={currentAstronaut}
      onLogout={() => setCurrentAstronaut(null)}
    />
  );
}
