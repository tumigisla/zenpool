import { Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { LandingPage } from './pages/LandingPage';
import { AppPage } from './pages/AppPage';
import { AboutPage } from './pages/AboutPage';

function App() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<AppPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </>
  );
}

export default App;
