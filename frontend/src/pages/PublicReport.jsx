import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicReport } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0
  }).format(amount);
}

export default function PublicReport() {
  const { token } = useParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getPublicReport(token);
        setData(res);
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
      <div style={{textAlign:'center', marginBottom:'40px'}}>
        <div className="sidebar-brand" style={{fontSize:'32px', marginBottom:'16px'}}>PME<span>Compta</span></div>
        <h1 style={{fontSize:'24px', color:'var(--n800)'}}>Relevé de Trésorerie Certifié</h1>
        <p style={{color:'var(--n500)'}}>Rapport généré pour consultation externe</p>
      </div>

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

      <p style={{textAlign:'center', marginTop:'40px', fontSize:'12px', color:'var(--n400)'}}>
        Ce document est généré par PMECompta. L'intégrité des données est vérifiée par signature numérique.
      </p>
    </div>
  );
}
