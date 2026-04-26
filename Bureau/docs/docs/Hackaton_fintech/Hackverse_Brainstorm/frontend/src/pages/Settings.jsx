import React, { useState, useEffect } from 'react';
import { Download, Upload, Trash2, Save } from 'lucide-react';
import { db, defaultRates } from '../db/database';
import { getSetting, setSetting } from '../services/api';

export default function SettingsPage() {
  const [syncLog, setSyncLog] = useState([]);
  const [rates, setRates] = useState(defaultRates);
  const [loading, setLoading] = useState(true);
  const [withdrawalLimit, setWithdrawalLimit] = useState('');
  const [savingLimit, setSavingLimit] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [logs, limit] = await Promise.all([
        db.syncLog.orderBy('timestamp').reverse().limit(20).toArray(),
        getSetting('withdrawal_limit')
      ]);
      setSyncLog(logs);
      setWithdrawalLimit(limit || '');
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveWithdrawalLimit() {
    setSavingLimit(true);
    try {
      const value = getLimitValue();
      await setSetting('withdrawal_limit', value);
      alert('Limite de retrait enregistrée!');
    } catch (err) {
      console.error('Error saving limit:', err);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setSavingLimit(false);
    }
  }

  function formatLimit(e) {
    let value = String(e.target.value || '').replace(/\s/g, '').replace(/\D/g, '');
    if (value) {
      value = parseInt(value, 10).toLocaleString('fr-FR');
    }
    setWithdrawalLimit(value);
  }

  async function exportData() {
    try {
      const transactions = await db.transactions.toArray();
      const accounts = await db.accounts.toArray();
      const categories = await db.categories.toArray();
      
      const data = {
        export_date: new Date().toISOString(),
        transactions,
        accounts,
        categories
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pme_compta_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (err) {
      console.error('Error exporting data:', err);
    }
  }

  async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!confirm('Importer ces données ? Cela remplacera les données existantes.')) {
        return;
      }
      
      if (data.transactions) {
        await db.transactions.clear();
        await db.transactions.bulkAdd(data.transactions);
      }
      if (data.accounts) {
        await db.accounts.clear();
        await db.accounts.bulkAdd(data.accounts);
      }
      if (data.categories) {
        await db.categories.clear();
        await db.categories.bulkAdd(data.categories);
      }
      
      alert('Import réussi!');
      window.location.reload();
    } catch (err) {
      console.error('Error importing data:', err);
      alert('Erreur lors de l\'import');
    }
  }

  async function clearData() {
    if (!confirm('Supprimer TOUTES les transactions ? Cette action est irréversible.')) {
      return;
    }
    
    try {
      await db.transactions.clear();
      await db.syncLog.clear();
      alert('Données supprimées.');
      window.location.reload();
    } catch (err) {
      console.error('Error clearing data:', err);
    }
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getLimitValue() {
    const limitStr = String(withdrawalLimit || '');
    return parseInt(limitStr.replace(/\s/g, ''), 10) || 0;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Paramètres</h1>
          <p className="page-header-sub">Configuration et données</p>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title">Limite de retrait</div>
        <div className="settings-card">
          <p style={{fontSize:'11px', color:'var(--n500)', marginBottom:'10px'}}>
            Montant maximum autorisé pour une sortie d'argent
          </p>
          <div style={{display:'flex', gap:'8px'}}>
            <input
              type="text"
              className="field-input"
              value={withdrawalLimit}
              onChange={formatLimit}
              onKeyDown={(e) => {
                if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
                if (!/^\d$/.test(e.key)) e.preventDefault();
              }}
              inputMode="numeric"
              placeholder="Ex: 500 000"
              style={{flex:1}}
            />
            <button className="btn btn-primary" onClick={saveWithdrawalLimit} disabled={savingLimit}>
              <Save size={16} />
            </button>
          </div>
          {getLimitValue() > 0 && (
            <p style={{fontSize:'10px', color:'var(--g600)', marginTop:'8px'}}>
              Limite actuelle: {getLimitValue().toLocaleString('fr-FR')} XAF
            </p>
          )}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title">Taux de change</div>
        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-row-label">1 USD</span>
            <span className="settings-row-value">{rates['USD']?.XAF || 615} XAF</span>
          </div>
          <div className="settings-row">
            <span className="settings-row-label">1 EUR</span>
            <span className="settings-row-value">{rates['EUR']?.XAF || 655} XAF</span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title">Données</div>
        <div className="settings-card">
          <button className="btn btn-outline" onClick={exportData} style={{width: '100%', marginBottom: '8px'}}>
            <Download size={16} /> Exporter (JSON)
          </button>
          <label className="btn btn-outline" style={{width: '100%', marginBottom: '8px', display: 'flex'}}>
            <Upload size={16} /> Importer (JSON)
            <input type="file" accept=".json" onChange={importData} style={{display: 'none'}} />
          </label>
          <button className="btn btn-danger" onClick={clearData} style={{width: '100%'}}>
            <Trash2 size={16} /> Supprimer transactions
          </button>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title">Journal de sync</div>
        <div className="settings-card">
          {syncLog.length === 0 ? (
            <p style={{color: 'var(--n500)', fontSize: '12px'}}>Aucune activité</p>
          ) : (
            syncLog.map(log => (
              <div className="settings-row" key={log.id}>
                <span className="settings-row-label">{log.action}</span>
                <span className="settings-row-value">{formatDate(log.timestamp)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title">Sécurité</div>
        <div className="integrity-banner">
          <div className="ib-icon">🔒</div>
          <div className="ib-text">
            <div className="ibt">Intégrité cryptographique</div>
            <div className="ibs">Hash SHA-256 sur chaque transaction</div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title">À propos</div>
        <div className="settings-card">
          <p style={{fontSize: '12px', color: 'var(--n500)'}}>
            PMECompta v1.0.0<br/>
            Système de Certification Financière pour PME<br/>
            3ème Année GI - ENSPY - Avril 2026
          </p>
        </div>
      </div>
    </div>
  );
}