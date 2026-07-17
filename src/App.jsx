import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './i18n/index.js';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Players from './pages/Players';
import PlayerDetail from './pages/PlayerDetail';
import Matches from './pages/Matches';
import Training from './pages/Training';
import Stats from './pages/Stats';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

import Login from './pages/Login';
import ExcelImport from './pages/ExcelImport';

export default function App() {
  const isAuth = localStorage.getItem('user_role') !== null;
  const userRole = localStorage.getItem('user_role');
  const studentId = localStorage.getItem('user_id');

  // If not authenticated, force routing to login page
  if (!isAuth) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Header />
          <main className="page-content">
            <Routes>
              {userRole === 'admin' ? (
                <>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/players" element={<Players />} />
                  <Route path="/players/:id" element={<PlayerDetail />} />
                  <Route path="/matches" element={<Matches />} />
                  <Route path="/training" element={<Training />} />
                  <Route path="/stats" element={<Stats />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/excel-import" element={<ExcelImport />} />
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
    </BrowserRouter>
  );
}
