import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomeView } from './views/HomeView';
import { RecorderView } from './views/RecorderView';
import { PlayerView } from './views/PlayerView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/record" element={<RecorderView />} />
        <Route path="/play/:id" element={<PlayerView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
