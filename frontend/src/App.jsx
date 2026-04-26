import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Wallet, 
  FileText, 
  Tags, 
  Settings,
  Menu,
  LogOut
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import NewTransaction from './pages/NewTransaction';
import Accounts from './pages/Accounts';
import Reports from './pages/Reports';
import PublicReport from './pages/PublicReport';
import Categories from './pages/Categories';
import SettingsPage from './pages/Settings';
import Login from './pages/Login';
import Logout from './pages/Logout';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/transaction', icon: PlusCircle, label: 'Nouvelle Transaction' },
  { path: '/accounts', icon: Wallet, label: 'Comptes' },
  { path: '/reports', icon: FileText, label: 'Rapports' },
  { path: '/categories', icon: Tags, label: 'Catégories' },
  { path: '/settings', icon: Settings, label: 'Paramètres' },
  { path: '/logout', icon: LogOut, label: 'Déconnexion' }
];

function ProtectedRoute({ children }) {
  const isAuth = localStorage.getItem('pme_user');
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const isAuth = localStorage.getItem('pme_user');
  if (isAuth) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const isLogoutRoute = location.pathname === '/logout';
  const isSharedRoute = location.pathname.startsWith('/shared-report/');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  // If it's a shared report, don't show the sidebar or app layout
  if (isSharedRoute) {
    return (
      <Routes>
        <Route path="/shared-report/:token" element={<PublicReport />} />
      </Routes>
    );
  }

  return (
    <div className={`app-wrapper ${isLoginPage || isLogoutRoute ? 'login-page' : ''}`}>
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} 
        onClick={closeSidebar}
      ></div>
      
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">PME<span>Compta</span></div>
        </div>
        
        <nav>
          <ul className="sidebar-nav">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink 
                  to={item.path} 
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={closeSidebar}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="sidebar-status">
          <div className="status-dot"></div>
          <span>{isOnline ? 'En ligne' : 'Hors ligne'}</span>
        </div>
      </aside>
      
      <main className="main-content">
        <button className="mobile-menu-btn" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
        
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/transaction" element={<ProtectedRoute><NewTransaction /></ProtectedRoute>} />
          <Route path="/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/logout" element={<ProtectedRoute><Logout /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}