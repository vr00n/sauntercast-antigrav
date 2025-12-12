import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { HomeView } from './views/HomeView';
import { RecorderView } from './views/RecorderView';
import { PlayerView } from './views/PlayerView';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/record" element={<RecorderView />} />
        <Route path="/play/:id" element={<PlayerView />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
