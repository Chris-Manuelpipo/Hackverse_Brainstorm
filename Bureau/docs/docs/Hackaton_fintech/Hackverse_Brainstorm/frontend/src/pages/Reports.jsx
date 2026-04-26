import React, { useState, useEffect } from 'react';
import { getCashflowReport, api, shareReport } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Share2, Copy, Check } from 'lucide-react';

function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0
  }).format(amount);
}

export default function Reports() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasFraud, setHasFraud] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [res, txs] = await Promise.all([
        getCashflowReport(), 
        api.transactions.list()
      ]);
      setData(res);
      const suspicious = txs.filter(t => t.is_backdated);
      setHasFraud(suspicious.length > 0);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    try {
      const res = await shareReport('cashflow');
      // In a real app, use window.location.origin
      const fullUrl = `${window.location.origin}${res.share_url}`;
      setShareUrl(fullUrl);
    } catch (err) {
      alert('Erreur lors de la création du lien de partage');
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div className="card">Chargement des rapports...</div>;

  return (
    <div>
      <div className="page-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <h1 className="page-header-title">Rapports de Trésorerie</h1>
          <p className="page-header-sub">Analyse sur les 6 derniers mois (Exigence Bancaire)</p>
        </div>
        <button className="btn btn-primary" onClick={handleShare}>
          <Share2 size={18} style={{marginRight:'8px'}} /> Partager au Banquier
        </button>
      </div>

      {shareUrl && (
        <div className="card" style={{marginBottom:'24px', border:'1px solid var(--a400)', background:'var(--a50)'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <div style={{flex: 1}}>
              <p style={{margin:0, fontWeight:600, color:'var(--a700)'}}>Lien de partage généré (Valide 7 jours)</p>
              <p style={{margin:0, fontSize:'14px', color:'var(--n600)', wordBreak:'break-all'}}>{shareUrl}</p>
            </div>
            <button className="btn btn-outline" onClick={copyToClipboard} style={{marginLeft:'16px'}}>
              {copied ? <Check size={18} color="var(--g600)" /> : <Copy size={18} />}
            </button>
          </div>
        </div>
      )}

      {hasFraud && (
        <div style={{
          backgroundColor: '#fff1f1', 
          border: '1px solid var(--red)', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '24px', 
          display: 'flex', 
          gap: '12px', 
          alignItems: 'center'
        }}>
          <span style={{fontSize: '24px'}}>⚠️</span>
          <div>
            <strong style={{color: 'var(--red)'}}>Alerte Fraude / Intégrité</strong>
            <p style={{fontSize: '14px', margin: 0, color: 'var(--red)'}}>Des écritures ont été rétro-datées de manière suspecte. La banque pourrait rejeter ce relevé.</p>
          </div>
        </div>
      )}

      <div className="card" style={{height: '400px', marginBottom: '24px'}}>
        <h3 className="card-title" style={{marginBottom: '20px'}}>Flux de Trésorerie Mensuel</h3>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="income" name="Entrées" fill="var(--g500)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Sorties" fill="var(--red)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 className="card-title">Détail des flux</h3>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <th style={{padding: '12px', textAlign: 'left', borderBottom:'1px solid var(--n100)'}}>Mois</th>
              <th style={{padding: '12px', textAlign: 'left', borderBottom:'1px solid var(--n100)'}}>Entrées</th>
              <th style={{padding: '12px', textAlign: 'left', borderBottom:'1px solid var(--n100)'}}>Sorties</th>
              <th style={{padding: '12px', textAlign: 'left', borderBottom:'1px solid var(--n100)'}}>Solde Mensuel</th>
            </tr>
          </thead>
          <tbody>
            {data.map(m => (
              <tr key={m.month} style={{borderBottom: '1px solid var(--n50)'}}>
                <td style={{padding: '12px', fontWeight: 600}}>{m.month}</td>
                <td style={{padding: '12px', color: 'var(--g700)'}}>{formatCurrency(m.income)}</td>
                <td style={{padding: '12px', color: 'var(--red)'}}>{formatCurrency(m.expense)}</td>
                <td style={{padding: '12px', fontWeight: 700, color: m.balance >= 0 ? 'var(--g700)' : 'var(--red)'}}>
                  {formatCurrency(m.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}