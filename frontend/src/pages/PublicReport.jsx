import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicReport, getPublicReportPdfUrl } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileDown, ShieldCheck, Image as ImageIcon, FileText as FileIcon, Zap } from 'lucide-react';

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

function normalizePublicReportPayload(payload) {
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

export default function PublicReport() {
  const { token } = useParams();
  const [data, setData] = useState([]);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getPublicReport(token);
        const normalized = normalizePublicReportPayload(res);
        setData(normalized.monthlyData);
        setScore(normalized.creditScore);
      } catch (err) {
        setError(err.message || 'Lien invalide ou expiré');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token]);

  if (loading) return <div className="card" style={{margin:'40px auto', maxWidth:'800px', textAlign:'center'}}>Chargement du rapport...</div>;
  if (error) return (
    <div className="card" style={{margin:'40px auto', maxWidth:'800px', textAlign:'center', border:'1px solid var(--red)'}}>
      <h2 style={{color:'var(--red)'}}>Erreur</h2>
      <p>{error}</p>
    </div>
  );

  return (
    <div style={{maxWidth:'1000px', margin:'0 auto', padding:'40px 20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'40px'}}>
        <div>
          <div className="sidebar-brand" style={{fontSize:'32px', marginBottom:'8px'}}>PME<span>Compta</span></div>
          <h1 style={{fontSize:'24px', color:'var(--n800)', margin:0}}>Relevé de Trésorerie Certifié</h1>
          <p style={{color:'var(--n500)', marginTop:'4px'}}>Rapport d'activité & Historique financier</p>
        </div>
        <a 
          href={getPublicReportPdfUrl(token)} 
          className="btn btn-primary" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{display:'flex', alignItems:'center', gap:'8px'}}
        >
          <FileDown size={18} /> Télécharger PDF
        </a>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: 'white',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '32px',
        borderRadius: '12px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{zIndex: 1}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
            <Zap size={20} color="#fbbf24" fill="#fbbf24" />
            <h2 style={{margin: 0, fontSize: '20px', fontWeight: 700}}>Score de Préparation au Crédit</h2>
          </div>
          <p style={{opacity: 0.8, fontSize: '14px', maxWidth: '500px'}}>
            Ce score est calculé par <strong>PMECompta</strong> en croisant les flux financiers réels et la validité des preuves numériques fournies.
          </p>
          
          <div style={{display: 'flex', gap: '30px', marginTop: '20px'}}>
             <div>
                <div style={{fontSize: '10px', opacity: 0.7, letterSpacing: '1px', textTransform: 'uppercase'}}>Indice de Fiabilité</div>
                <div style={{fontSize: '18px', fontWeight: 700}}>{score?.reliability}/50</div>
             </div>
             <div>
                <div style={{fontSize: '10px', opacity: 0.7, letterSpacing: '1px', textTransform: 'uppercase'}}>Indice Financier</div>
                <div style={{fontSize: '18px', fontWeight: 700}}>{score?.financial}/50</div>
             </div>
          </div>
        </div>

        <div style={{zIndex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '16px', minWidth: '140px'}}>
           <div style={{fontSize: '11px', opacity: 0.8, marginBottom: '2px'}}>SCORE CERTIFIÉ</div>
           <div style={{fontSize: '48px', fontWeight: 900, lineHeight: 1}}>{score?.overall}</div>
           <div style={{
             background: score?.overall > 60 ? '#10b981' : '#f59e0b', 
             padding: '3px 12px', 
             borderRadius: '20px', 
             fontSize: '11px',
             fontWeight: 700,
             marginTop: '8px',
             display: 'inline-block'
           }}>{score?.status}</div>
        </div>
      </div>

      <div style={{
        backgroundColor: 'var(--g50)', border: '1px solid var(--g200)', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center'
      }}>
        <ShieldCheck size={24} color="var(--g600)" />
        <div>
          <strong style={{color: 'var(--g700)'}}>Données Certifiées sans Manipulation</strong>
          <p style={{fontSize: '14px', margin: 0, color: 'var(--n600)'}}>
            L'intégrité de ces données est garantie. Ce rapport est certifié conforme et sans modification rétroactive.
          </p>
        </div>
      </div>

      <div className="card" style={{height: '400px', marginBottom: '24px'}}>
        <h3 className="card-title" style={{marginBottom: '20px'}}>Vue d'ensemble des Flux</h3>
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

      <div className="card" style={{marginBottom: '24px'}}>
        <h3 className="card-title">Résumé par mois</h3>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <th style={{padding: '12px', textAlign: 'left', borderBottom:'1px solid var(--n100)'}}>Mois</th>
              <th style={{padding: '12px', textAlign: 'right', borderBottom:'1px solid var(--n100)'}}>Entrées</th>
              <th style={{padding: '12px', textAlign: 'right', borderBottom:'1px solid var(--n100)'}}>Sorties</th>
              <th style={{padding: '12px', textAlign: 'right', borderBottom:'1px solid var(--n100)'}}>Solde Progressif</th>
            </tr>
          </thead>
          <tbody>
            {data.map(m => (
              <tr key={m.month} style={{borderBottom: '1px solid var(--n50)'}}>
                <td style={{padding: '12px', fontWeight: 600}}>{m.month}</td>
                <td style={{padding: '12px', textAlign:'right', color: 'var(--g700)'}}>{formatCurrency(m.income)}</td>
                <td style={{padding: '12px', textAlign:'right', color: 'var(--red)'}}>{formatCurrency(m.expense)}</td>
                <td style={{padding: '12px', textAlign:'right', fontWeight: 700, color: 'var(--g700)'}}>
                  {formatCurrency(m.cumulative)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{marginBottom:'16px', color:'var(--n800)'}}>Détail des Transactions</h3>
      {data.map(m => (
        <div key={m.month} style={{marginBottom:'32px'}}>
          <h4 style={{background:'var(--n100)', padding:'8px 12px', borderRadius:'4px', marginBottom:'12px'}}>{m.month}</h4>
          <div className="card" style={{padding:0, overflow:'hidden'}}>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:'14px'}}>
              <thead>
                <tr style={{background:'var(--n50)'}}>
                  <th style={{padding: '10px', textAlign: 'left'}}>Date</th>
                  <th style={{padding: '10px', textAlign: 'left'}}>Description</th>
                  <th style={{padding: '10px', textAlign: 'right'}}>Montant</th>
                  <th style={{padding: '10px', textAlign: 'center'}}>Preuve</th>
                </tr>
              </thead>
              <tbody>
                {m.transactions?.map(tx => (
                  <tr key={tx.id} style={{borderBottom: '1px solid var(--n50)'}}>
                    <td style={{padding: '10px'}}>{tx.date}</td>
                    <td style={{padding: '10px'}}>
                      <div style={{fontWeight:500}}>{tx.description}</div>
                      <div style={{fontSize:'11px', color:'var(--n500)'}}>{tx.reference}</div>
                    </td>
                    <td style={{padding: '10px', textAlign:'right', color: tx.type === 'credit' ? 'var(--g600)' : 'var(--red)', fontWeight:600}}>
                      {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                    <td style={{padding: '10px', textAlign:'center'}}>
                      {tx.has_proof ? (
                        <div style={{display:'flex', justifyContent:'center', gap:'4px'}}>
                          {tx.proofs.map(p => (
                            <a 
                              key={p.id}
                              href={`${API_BASE}/public/attachments/${token}/${p.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{color:'var(--g500)'}}
                            >
                              {p.type === 'IMAGE' ? <ImageIcon size={18} /> : <FileIcon size={18} />}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span style={{color:'var(--n300)', fontSize:'11px'}}>Aucune</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
