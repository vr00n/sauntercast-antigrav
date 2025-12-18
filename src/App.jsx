import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { HomeView } from './views/HomeView';
import { RecorderView } from './views/RecorderView';
import { PlayerView } from './views/PlayerView';
import { AboutView } from './views/AboutView';
import { ViewPublishedView } from './views/ViewPublishedView';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/record" element={<RecorderView />} />
        <Route path="/play/:id" element={<PlayerView />} />
        <Route path="/view/:id" element={<ViewPublishedView />} />
        <Route path="/about" element={<AboutView />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
