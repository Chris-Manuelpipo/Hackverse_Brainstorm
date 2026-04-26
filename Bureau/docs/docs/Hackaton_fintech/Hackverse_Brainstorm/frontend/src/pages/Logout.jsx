import React from 'react';
import { LogOut } from 'lucide-react';

export default function Logout() {
  function handleLogout() {
    if (confirm('Se déconnecter ?')) {
      localStorage.removeItem('pme_user');
      window.location.href = '/login';
    }
  }

  return (
    <div className="settings-section">
      <div className="settings-title">Déconnexion</div>
      <div className="settings-card">
        <button className="btn btn-outline" onClick={handleLogout} style={{width:'100%'}}>
          <LogOut size={16} /> Se déconnecter
        </button>
      </div>
    </div>
  );
}