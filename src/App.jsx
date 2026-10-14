import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Portfolio from './Portfolio';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GamerSite from './pages/GamerSite';
import Legal from './pages/Legal';

const RouteHandler = () => {
  const location = useLocation();
  
  useEffect(() => {
    const path = location.pathname;
    const isSubPage = path.startsWith('/login') || path.startsWith('/dashboard') || path.startsWith('/gamer-site') || path === '/privacy' || path === '/terms';
    
    // Selectors for non-React elements from index.html (only target elements OUTSIDE #root)
    const selectors = [
      'nav:not(#root nav)', 
      'aside:not(#root aside)', 
      'section:not(#root section)', 
      'footer:not(#root footer)',
      '#canvas-container',
      '.interaction-helper', 
      '#sidebar-overlay'
    ];

    if (isSubPage) {
      document.body.classList.add('is-subpage');
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          // Hanya sembunyikan jika elemen tersebut BUKAN bagian dari dashboard admin (#root)
          if (!el.closest('#root')) {
             el.style.display = 'none';
          }
        });
      });
    } else {
      document.body.classList.remove('is-subpage');
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          if (!el.closest('#root')) el.style.display = '';
        });
      });
      // Trigger a resize to fix Three.js and ScrollTrigger after display is restored
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        // If returning to home, ensure we are at the top if no hash is present
        if (location.pathname === '/' && !location.hash) {
          window.scrollTo(0, 0);
        }
      }, 200);
    }

    // Google Analytics Tracking for SPA route changes
    if (window.gtag && (path === '/' || path === '/gamer-site')) {
      window.gtag('config', 'G-08JZ0RGZE1', {
        page_path: path,
      });
    }
  }, [location]);

  return null;
};

const App = () => {
  return (
    <Router>
      <RouteHandler />
      <Routes>
        <Route path="/" element={<Portfolio />} />
        <Route path="/login" element={<Login />} />
        <Route path="/login/admin" element={<Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/gamer-site" element={<GamerSite />} />
        <Route path="/privacy" element={<Legal type="privacy" />} />
        <Route path="/terms" element={<Legal type="terms" />} />
      </Routes>
    </Router>
  );
};

export default App;
