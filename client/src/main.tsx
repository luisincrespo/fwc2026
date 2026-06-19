import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/quinielapopular/:tab" element={<App />} />
        <Route path="/quinielapopular" element={<Navigate to="/quinielapopular/live" replace />} />
        <Route path="*" element={<Navigate to="/quinielapopular/live" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
