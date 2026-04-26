import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { getAccounts, addAccount, updateAccount, deleteAccount, getAccountBalance } from '../services/api';

function formatCurrency(amount, currency = 'XAF') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0
  }).format(amount);
}

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    type: 'cash',
    initial_balance: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const accountsData = await getAccounts();
      setAccounts(accountsData);
      
      const balancesData = {};
      for (const acc of accountsData) {
        balancesData[acc.id] = await getAccountBalance(acc.id);
      }
      setBalances(balancesData);
    } catch (err) {
      console.error('Error loading accounts:', err);
    } finally {
      setLoading(false);
    }
  }

  function openModal(account = null) {
    if (account) {
      setForm({
        name: account.name,
        type: account.type,
        initial_balance: account.initial_balance || ''
      });
      setEditingId(account.id);
    } else {
      setForm({ name: '', type: 'cash', initial_balance: '' });
      setEditingId(null);
    }
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm({ name: '', type: 'cash', initial_balance: '' });
  }

  function formatInitialBalance(e) {
    let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
    if (value) {
      value = parseInt(value, 10).toLocaleString('fr-FR');
    }
    setForm(f => ({ ...f, initial_balance: value }));
  }

  function getInitialBalanceValue() {
    return parseInt(form.initial_balance.replace(/\s/g, ''), 10) || 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Veuillez entrer un nom de compte');
      return;
    }

    try {
      const balanceValue = getInitialBalanceValue();
      const accountData = {
        name: form.name,
        type: form.type,
        initial_balance: balanceValue
      };
      
      if (editingId) {
        await updateAccount(editingId, accountData);
      } else {
        await addAccount(accountData);
      }
      closeModal();
      loadData();
    } catch (err) {
      console.error('Error saving account:', err);
      alert('Erreur lors de l\'enregistrement');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer ce compte ?')) return;
    try {
      await deleteAccount(id);
      loadData();
    } catch (err) {
      console.error('Error deleting account:', err);
    }
  }

  const accountTypeLabels = {
    cash: 'Caisse',
    mobile: 'Mobile Money',
    bank: 'Banque'
  };

  const accountEmojis = {
    cash: '💵',
    mobile: '📱',
    bank: '🏦'
  };

  const totalBalance = Object.values(balances).reduce((sum, b) => sum + b, 0);

  if (loading) {
    return <div className="card">Chargement...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Comptes</h1>
          <p className="page-header-sub">{accounts.length} portefeuille(s) actif(s)</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={18} />Nouveau Compte
        </button>
      </div>

      <div className="total-card">
        <div>
          <div className="tc-label">Total Consolidé (XAF)</div>
          <div className="tc-amount">{formatCurrency(totalBalance)}</div>
        </div>
        <div className="tc-badge">Toutes devises</div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Liste des Comptes</h3>
        </div>
        
        {accounts.length === 0 ? (
          <div className="empty-state">
            <p>Aucun compte</p>
            <button className="btn btn-primary" onClick={() => openModal()}>
              Ajouter un compte
            </button>
          </div>
        ) : (
          <div className="comptes-list">
            {accounts.map(account => (
              <div className="compte-card" key={account.id}>
                <div className="compte-avatar" style={{
                  background: account.type === 'cash' ? 'var(--g50)' : 
                             account.type === 'mobile' ? 'var(--a50)' : 'var(--g100)'
                }}>
                  {accountEmojis[account.type]}
                </div>
                <div className="compte-info">
                  <div className="cn">{account.name}</div>
                  <div className="ct">{accountTypeLabels[account.type]} · XAF</div>
                </div>
                <div className="compte-solde">
                  <div className="cs-amount">{formatCurrency(balances[account.id] || 0)}</div>
                  <div className="cs-label">FCFA</div>
                </div>
                <div style={{display:'flex', gap:'8px'}}>
                  <button className="btn btn-outline" onClick={() => openModal(account)}>
                    <Edit2 size={16} />
                  </button>
                  <button className="btn btn-danger" onClick={() => handleDelete(account.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingId ? 'Modifier le Compte' : 'Nouveau Compte'}
              </h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-field">
                <label>Nom du compte</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Caisse, MTN..."
                />
              </div>
              
              <div className="form-field">
                <label>Type</label>
                <select
                  className="field-input"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                >
                  <option value="cash">Caisse</option>
                  <option value="mobile">Mobile Money</option>
                  <option value="bank">Banque</option>
                </select>
              </div>
              
              <div className="form-field">
                <label>Solde initial</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.initial_balance}
                  onChange={formatInitialBalance}
                  onKeyDown={(e) => {
                    if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
                    if (!/^\d$/.test(e.key)) e.preventDefault();
                  }}
                  inputMode="numeric"
                  placeholder="0"
                />
              </div>
              
              <button type="submit" className="submit-btn">
                <Save size={16} /> Enregistrer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}