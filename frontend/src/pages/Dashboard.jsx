import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Plus, Clock, CheckCircle, CloudOff, Scissors, X } from 'lucide-react';
import { getDashboardData, cancelTransaction, addTransaction } from '../services/api';

function formatCurrency(amount, currency = 'XAF') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0
  }).format(amount);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short'
  });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState({
    accounts: [],
    balances: {},
    categories: [],
    recentTransactions: [],
    monthlyIn: 0,
    monthlyOut: 0,
    netBalance: 0
  });
  const [loading, setLoading] = useState(true);

  // Split Logic State
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [splitAmount, setSplitAmount] = useState('');
  const [splitRef, setSplitRef] = useState('');
  const [splitting, setSplitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const dashboardData = await getDashboardData();
      setData(dashboardData);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(txId) {
    if (window.confirm('Voulez-vous annuler cette transaction ?\nUne transaction de correction (inverse) sera générée.')) {
      try {
        await cancelTransaction(txId);
        loadData();
      } catch (err) {
        alert(err.message || 'Impossible d\'annuler');
      }
    }
  }

  async function handleSplit(e) {
    e.preventDefault();
    const amt = parseInt(splitAmount.replace(/\s/g, ''), 10);
    if (isNaN(amt) || amt <= 0 || amt >= selectedTx.amount) {
      alert('Montant invalide. Le fragment doit être inférieur au montant total.');
      return;
    }

    setSplitting(true);
    try {
      // 1. Cancel original
      await cancelTransaction(selectedTx.id);

      // 2. Create Fragment 1
      const frag1 = {
        ...selectedTx,
        id: Math.random().toString(36).substr(2, 9),
        amount: amt,
        reference: splitRef || `${selectedTx.reference || ''} (F1)`,
        description: `${selectedTx.description || ''} [Fragment 1]`
      };
      await addTransaction(frag1);

      // 3. Create Fragment 2 (Remaining)
      const frag2 = {
        ...selectedTx,
        id: Math.random().toString(36).substr(2, 9),
        amount: selectedTx.amount - amt,
        reference: `${selectedTx.reference || ''} (F2)`,
        description: `${selectedTx.description || ''} [Reste]`
      };
      await addTransaction(frag2);

      setSplitModalVisible(false);
      setSplitAmount('');
      setSplitRef('');
      loadData();
      alert('Transaction fragmentée avec succès !');
    } catch (err) {
      alert('Erreur lors du split');
    } finally {
      setSplitting(false);
    }
  }

  const totalBalance = Object.values(data.balances).reduce((sum, b) => sum + b, 0);

  if (loading) {
    return <div className="card">Chargement...</div>;
  }

  return (
    <div>
      <div className="page-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <h1 className="page-header-title">Dashboard</h1>
          <p className="page-header-sub">Vue d'ensemble de votre trésorerie</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/transaction')}>
          <Plus size={18} />Nouvelle Transaction
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card entree">
          <div className="label">Total Trésorerie</div>
          <div className="amount">{formatCurrency(totalBalance)}</div>
        </div>
        <div className="stat-card entree">
          <div className="label">
            <ArrowUpRight size={14} style={{display:'inline', marginRight:'4px'}}/>
            Entrées - {new Date().toLocaleDateString('fr-FR', {month:'long'})}
          </div>
          <div className="amount">{formatCurrency(data.monthlyIn)}</div>
        </div>
        <div className="stat-card sortie">
          <div className="label">
            <ArrowDownRight size={14} style={{display:'inline', marginRight:'4px'}}/>
            Sorties - {new Date().toLocaleDateString('fr-FR', {month:'long'})}
          </div>
          <div className="amount">{formatCurrency(data.monthlyOut)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Solde du mois</div>
          <div className="amount" style={{color: data.netBalance >= 0 ? 'var(--g600)' : 'var(--red)'}}>
            {formatCurrency(data.netBalance)}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Transactions Récentes</h3>
        </div>
        
        {data.recentTransactions.length === 0 ? (
          <div className="empty-state">
            <Wallet size={48} />
            <p>Aucune transaction</p>
            <button className="btn btn-primary" onClick={() => navigate('/transaction')}>
              Créer une transaction
            </button>
          </div>
        ) : (
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{textAlign:'left', borderBottom:'1px solid var(--n100)'}}>
                <th style={{padding:'12px'}}>Date</th>
                <th style={{padding:'12px'}}>Sync</th>
                <th style={{padding:'12px'}}>Description</th>
                <th style={{padding:'12px'}}>Catégorie</th>
                <th style={{padding:'12px'}}>Compte</th>
                <th style={{padding:'12px'}}>Montant</th>
                <th style={{padding:'12px'}}>Type</th>
                <th style={{padding:'12px'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.recentTransactions.slice(0, 15).map(tx => (
                <tr key={tx.id} style={{borderBottom:'1px solid var(--n50)'}}>
                  <td style={{padding:'12px'}}>{formatDate(tx.date)}</td>
                  <td style={{padding:'12px', textAlign:'center'}}>
                    {tx.synced !== false ? <CheckCircle size={14} color="var(--g400)" /> : <CloudOff size={14} color="var(--a400)" />}
                  </td>
                  <td style={{padding:'12px'}}>{tx.description || '-'}</td>
                  <td style={{padding:'12px'}}>{data.categories.find(c => c.id === tx.category_id)?.name || '-'}</td>
                  <td style={{padding:'12px'}}>{data.accounts.find(a => a.id === tx.account_id)?.name || '-'}</td>
                  <td style={{padding:'12px', fontWeight: 600, color: tx.type === 'credit' ? 'var(--g600)' : 'var(--red)'}}>
                    {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </td>
                  <td style={{padding:'12px'}}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      background: tx.type === 'credit' ? 'var(--g50)' : 'var(--red-bg)',
                      color: tx.type === 'credit' ? 'var(--g700)' : 'var(--red)'
                    }}>
                      {tx.type === 'credit' ? 'Entrée' : 'Sortie'}
                    </span>
                  </td>
                  <td style={{padding:'12px', display:'flex', gap:'8px'}}>
                    <button 
                      onClick={() => handleCancel(tx.id)}
                      className="btn-icon"
                      title="Annuler"
                      style={{padding:'4px', color:'var(--red)', border:'1px solid var(--red-bg)', borderRadius:'4px', background:'none', cursor:'pointer'}}
                    >
                      <X size={14} />
                    </button>
                    <button 
                      onClick={() => { setSelectedTx(tx); setSplitModalVisible(true); }}
                      className="btn-icon"
                      title="Fragmenter (Split)"
                      style={{padding:'4px', color:'var(--a500)', border:'1px solid var(--a100)', borderRadius:'4px', background:'none', cursor:'pointer'}}
                    >
                      <Scissors size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Split Modal Overlay */}
      {splitModalVisible && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0, 
          background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000
        }}>
          <div className="card" style={{width:'400px', padding:'24px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'16px'}}>
              <h3 style={{margin:0}}>Fragmenter la transaction</h3>
              <button onClick={() => setSplitModalVisible(false)} style={{border:'none', background:'none', cursor:'pointer'}}><X /></button>
            </div>
            
            <p style={{fontSize:'14px', color:'var(--n500)', marginBottom:'20px'}}>
              Montant total : <strong>{formatCurrency(selectedTx?.amount)}</strong>
            </p>

            <form onSubmit={handleSplit}>
              <div className="form-field">
                <label>Montant du 1er fragment</label>
                <input 
                  type="text" 
                  className="field-input" 
                  value={splitAmount}
                  onChange={(e) => setSplitAmount(e.target.value)}
                  placeholder="Ex: 5 000"
                  required
                />
              </div>
              <div className="form-field">
                <label>Référence interne (Facture n°)</label>
                <input 
                  type="text" 
                  className="field-input" 
                  value={splitRef}
                  onChange={(e) => setSplitRef(e.target.value)}
                  placeholder="Ex: FACT-2024-001"
                />
              </div>

              <div style={{display:'flex', justifyContent:'flex-end', gap:'12px', marginTop:'24px'}}>
                <button type="button" className="btn btn-outline" onClick={() => setSplitModalVisible(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={splitting}>
                  {splitting ? 'Fragmentation...' : 'Confirmer le Split'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account view (same as before) */}
      <div className="card" style={{marginTop:'24px'}}>
        <div className="card-header">
          <h3 className="card-title">Comptes</h3>
        </div>
        <table>
          <thead>
            <tr><th>Compte</th><th>Type</th><th>Solde</th></tr>
          </thead>
          <tbody>
            {data.accounts.map(account => (
              <tr key={account.id}>
                <td style={{padding:'12px', fontWeight:500}}>{account.name}</td>
                <td style={{padding:'12px'}}>
                  <span style={{padding:'4px 10px', borderRadius:'12px', fontSize:'11px', background:'var(--a50)', color:'#7a5500'}}>
                    {account.type === 'cash' ? 'Caisse' : account.type === 'mobile' ? 'Mobile Money' : 'Banque'}
                  </span>
                </td>
                <td style={{padding:'12px', fontWeight:600, color:'var(--g700)'}}>{formatCurrency(data.balances[account.id] || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}