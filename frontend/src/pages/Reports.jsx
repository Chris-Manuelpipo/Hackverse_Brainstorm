import React, { useState, useEffect } from 'react';
import { getCashflowReport, api, shareReport } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Share2, Copy, Check, ShieldCheck, Zap, Info } from 'lucide-react';

function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0
  }).format(amount);
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.transactions)) return value.transactions;
  return [];
}

function normalizeMonthlyData(value) {
  const candidates = [
    value?.monthly_data,
    value?.monthlyData,
    value?.data?.monthly_data,
    value?.data?.monthlyData,
    value?.data,
    value,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (!candidate || typeof candidate !== 'object') continue;

    const entries = Object.entries(candidate);
    if (!entries.length) continue;

    const mapped = entries
      .filter(([, payload]) => payload && typeof payload === 'object' && !Array.isArray(payload))
      .map(([month, payload]) => ({
        month: payload.month ?? month,
        ...payload,
      }));

    if (mapped.length && mapped.some((item) => item.income !== undefined || item.expense !== undefined || item.transactions !== undefined)) {
      return mapped.sort((a, b) => String(a.month).localeCompare(String(b.month)));
    }
  }

  return [];
}

function normalizeCashflowResponse(payload) {
  const monthlyData = normalizeMonthlyData(payload).map((monthData) => ({
    ...monthData,
    transactions: toArray(monthData?.transactions).map((tx) => ({
      ...tx,
      proofs: toArray(tx?.proofs),
    })),
  }));

  const creditScore =
    payload?.credit_score ??
    payload?.creditScore ??
    payload?.data?.credit_score ??
    payload?.data?.creditScore ??
    null;

  return { monthlyData, creditScore };
}

export default function Reports() {
  const [data, setData] = useState([]);
  const [score, setScore] = useState(null);
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
      const normalized = normalizeCashflowResponse(res);
      setData(normalized.monthlyData);
      setScore(normalized.creditScore);

      const transactions = toArray(txs);
      const suspicious = transactions.filter((t) => t?.is_backdated);
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
      const sharePath = res?.share_url || res?.shareUrl || res?.data?.share_url || res?.data?.shareUrl || '';
      const fullUrl = `${window.location.origin}${sharePath}`;
      setShareUrl(fullUrl);
    } catch (err) {
      alert('Erreur lors du partage');
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
          <h1 className="page-header-title">Rapports Financiers</h1>
          <p className="page-header-sub">Analyse de trésorerie sur 6 mois</p>
        </div>
        <div style={{display:'flex', gap:'10px'}}>
          {shareUrl ? (
            <div style={{display:'flex', alignItems:'center', background:'var(--white)', padding:'4px 12px', borderRadius:'8px', border:'1px solid var(--g200)', gap:'10px'}}>
              <span style={{fontSize:'12px', color:'var(--g700)'}}>Lien prêt !</span>
              <button className="btn btn-outline" onClick={copyToClipboard} style={{padding:'4px 8px'}}>
                {copied ? <Check size={16} color="var(--g500)"/> : <Copy size={16} />}
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={handleShare}>
              <Share2 size={18} style={{marginRight:'8px'}} /> Partager au banquier
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: 'white',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '32px',
        position: 'relative',
        overflow: 'hidden',
        border: 'none'
      }}>
        <div style={{position: 'absolute', top: '-20px', right: '-20px', opacity: 0.05}}>
          <ShieldCheck size={200} />
        </div>

        <div style={{zIndex: 1, flex: 1, minWidth: '300px'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
            <Zap size={20} color="#fbbf24" fill="#fbbf24" />
            <h2 style={{margin: 0, fontSize: '24px', fontWeight: 700}}>Score de Préparation au Crédit</h2>
          </div>
          <p style={{opacity: 0.8, fontSize: '15px', maxWidth: '450px'}}>
            Ce score mesure votre éligibilité au financement en analysant la <strong>performance financière</strong> et la <strong>fiabilité de vos justificatifs</strong>.
          </p>
          
          <div style={{display: 'flex', gap: '40px', marginTop: '24px'}}>
             <div style={{borderLeft: '3px solid #3b82f6', paddingLeft: '12px'}}>
                <div style={{fontSize: '11px', opacity: 0.7, letterSpacing: '1px', textTransform: 'uppercase'}}>Fiabilité Données</div>
                <div style={{fontSize: '20px', fontWeight: 700}}>{score?.reliability}<span style={{fontSize: '14px', opacity: 0.5}}> / 50</span></div>
             </div>
             <div style={{borderLeft: '3px solid #10b981', paddingLeft: '12px'}}>
                <div style={{fontSize: '11px', opacity: 0.7, letterSpacing: '1px', textTransform: 'uppercase'}}>Santé Financière</div>
                <div style={{fontSize: '20px', fontWeight: 700}}>{score?.financial}<span style={{fontSize: '14px', opacity: 0.5}}> / 50</span></div>
             </div>
          </div>

          <div style={{marginTop: '24px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', fontSize: '13px', display: 'flex', gap: '10px', alignItems: 'center'}}>
            <Info size={16} style={{flexShrink: 0}} />
            <span>
              {score?.overall > 70 
                ? "Excellent ! Vos données sont certifiées et votre trésorerie est stable." 
                : "Conseil : Ajoutez plus de justificatifs (factures, SMS) pour améliorer votre score de fiabilité."}
            </span>
          </div>
        </div>

        <div style={{zIndex: 1, textAlign: 'center', minWidth: '150px', background: 'rgba(255,255,255,0.1)', padding: '24px', borderRadius: '24px', backdropFilter: 'blur(10px)'}}>
           <div style={{fontSize: '12px', opacity: 0.8, marginBottom: '4px'}}>SCORE GLOBAL</div>
           <div style={{fontSize: '56px', fontWeight: 900, lineHeight: 1}}>{score?.overall}</div>
           <div style={{
             background: score?.overall > 60 ? '#10b981' : '#f59e0b', 
             color: 'white',
             padding: '4px 16px', 
             borderRadius: '20px', 
             fontSize: '12px',
             fontWeight: 700,
             marginTop: '12px',
             display: 'inline-block'
           }}>{score?.status}</div>
        </div>
      </div>

      {hasFraud && (
        <div style={{
          backgroundColor: '#fff1f1', border: '1px solid var(--red)', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center'
        }}>
          <span style={{fontSize: '24px'}}>⚠️</span>
          <div>
            <strong style={{color: 'var(--red)'}}>Alerte Intégrité</strong>
            <p style={{fontSize: '14px', margin: 0, color: 'var(--red)'}}>Attention : des transactions rétro-datées ont été détectées.</p>
          </div>
        </div>
      )}

      <div className="card" style={{height: '400px', marginBottom: '24px'}}>
        <h3 className="card-title">Flux de Trésorerie Mensuel</h3>
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
        <h3 className="card-title">Résumé Mensuel</h3>
        <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '16px'}}>
          <thead>
            <tr style={{borderBottom: '1px solid var(--n100)'}}>
              <th style={{padding: '12px', textAlign: 'left'}}>Mois</th>
              <th style={{padding: '12px', textAlign: 'right'}}>Entrées</th>
              <th style={{padding: '12px', textAlign: 'right'}}>Sorties</th>
              <th style={{padding: '12px', textAlign: 'right'}}>Solde Mensuel</th>
              <th style={{padding: '12px', textAlign: 'right'}}>Cumulé</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.month} style={{borderBottom: '1px solid var(--n50)'}}>
                <td style={{padding: '12px', fontWeight: 600}}>{m.month}</td>
                <td style={{padding: '12px', textAlign: 'right', color: 'var(--g700)'}}>{formatCurrency(m.income)}</td>
                <td style={{padding: '12px', textAlign: 'right', color: 'var(--red)'}}>{formatCurrency(m.expense)}</td>
                <td style={{padding: '12px', textAlign: 'right', fontWeight: 600}}>{formatCurrency(m.balance)}</td>
                <td style={{padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--g700)'}}>{formatCurrency(m.cumulative)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
