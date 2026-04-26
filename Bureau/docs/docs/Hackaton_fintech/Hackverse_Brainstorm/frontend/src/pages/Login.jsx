import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Wallet, Shield, Smartphone, WifiOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) {
      alert('Veuillez entrer email et mot de passe');
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      localStorage.setItem('pme_user', JSON.stringify({ email: form.email }));
      window.location.href = '/';
    } catch (err) {
      console.error('Login error:', err);
      alert('Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-split-page">
      <div className="login-info">
        <div className="login-logo">PME<span>Compta</span></div>
        
        <h1>Gerez la tresorerie de votre PME en toute simplicite</h1>
        
        <p className="login-intro">
          PMECompta est une APPLICATION DE COMPTABILITE concue specialement pour les petites et moyennes entreprises. 
          Elle vous permet d'enregistrer vos flux financiers et de generer des bilans AUTOMATIQUES pour presenter a votre banque.
        </p>

        <div className="login-features">
          <div className="feature-item">
            <div className="feature-icon"><Wallet size={20} /></div>
            <div>
              <strong>Gestion simplifiee</strong>
              <p>Suivez votre Caisse, MTN, Orange Money et Compte Banque en un seul endroit. Enregistrez vos depenses et revenus en quelques secondes.</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon"><Shield size={20} /></div>
            <div>
              <strong>Securite</strong>
              <p>Chaque transaction est protegee par un hash SHA-256 qui garantie l'integrite de vos donnees. Vos bilans sont fiable pour la banque.</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon"><Smartphone size={20} /></div>
            <div>
              <strong>Multi-appareils</strong>
              <p>Accedez a vos donnees depuis votre telephone, tablette ou ordinateur. synchronization automatique entre vos appareils.</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon"><WifiOff size={20} /></div>
            <div>
              <strong>Hors-ligne</strong>
              <p>Utilisez l'application meme sans connexion internet. Vos donnees sont sauvegardees localement et disponibles a tout moment.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="login-form-section">
        <div className="login-box">
          <h2>Connexion</h2>
          <p>Entrez vos identifiants pour continuer</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                className="field-input"
                value={form.email}
                onChange={handleChange}
                placeholder="exemple@email.com"
              />
            </div>

            <div className="form-group">
              <label>Mot de passe</label>
              <input
                type="password"
                name="password"
                className="field-input"
                value={form.password}
                onChange={handleChange}
                placeholder="********"
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              <LogIn size={18} />
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}