import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App } from './App';
import { Schedule } from './components/Schedule';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/quinielapopular/live_leaderboard" element={<App />} />
        <Route path="/quinielapopular/schedule" element={<Schedule />} />
        <Route path="*" element={<Navigate to="/quinielapopular/live_leaderboard" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
