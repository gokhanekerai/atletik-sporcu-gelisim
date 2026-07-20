import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import './i18n/index.js';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Players from './pages/Players';
import PlayerDetail from './pages/PlayerDetail';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import ExcelImport from './pages/ExcelImport';

export default function App() {
  const [authState, setAuthState] = useState({
    isAuth: localStorage.getItem('user_role') !== null,
    userRole: localStorage.getItem('user_role'),
    studentId: localStorage.getItem('user_id'),
  });

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handleAuthChange = () => {
      setAuthState({
        isAuth: localStorage.getItem('user_role') !== null,
        userRole: localStorage.getItem('user_role'),
        studentId: localStorage.getItem('user_id'),
      });
    };

    window.addEventListener('auth-changed', handleAuthChange);
    return () => window.removeEventListener('auth-changed', handleAuthChange);
  }, []);

  const { isAuth, userRole } = authState;

  // If not authenticated, force routing to login page
  if (!isAuth) {
    return (
      <HashRouter>
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      </HashRouter>
    );
  }

  return (
    <HashRouter>
      <div className={`app-layout ${mobileSidebarOpen ? 'mobile-sidebar-active' : ''}`}>
        {mobileSidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setMobileSidebarOpen(false)} />
        )}
        <Sidebar mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />
        <div className="main-content">
          <Header onMenuClick={() => setMobileSidebarOpen(true)} />
          <main className="page-content">
            <Routes>
              {userRole === 'admin' ? (
                <>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/players" element={<Players />} />
                  <Route path="/players/:id" element={<PlayerDetail />} />
                  <Route path="/excel-import" element={<ExcelImport />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Dashboard />} />
                </>
              ) : (
                <>
                  {/* Student has limited routes */}
                  <Route path="/players/:id" element={<PlayerDetail />} />
                  <Route path="*" element={<PlayerDetail />} />
                </>
              )}
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
}
