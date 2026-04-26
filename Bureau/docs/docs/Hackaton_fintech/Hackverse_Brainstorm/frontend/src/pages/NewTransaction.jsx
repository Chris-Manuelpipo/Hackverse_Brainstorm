import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, TrendingUp, TrendingDown, Camera, X, Mic } from 'lucide-react';
import { getAccounts, getCategories, addTransaction, getAccountBalance, getSetting, uploadAttachment } from '../services/api';

export default function NewTransaction() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountBalances, setAccountBalances] = useState({});
  const [withdrawalLimit, setWithdrawalLimit] = useState(0);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [attachmentType, setAttachmentType] = useState('IMAGE');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  
  const [form, setForm] = useState({
    account_id: '',
    type: 'debit',
    amount: '',
    currency: 'XAF',
    exchange_rate: 1,
    category_id: '',
    description: '',
    reference: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  async function loadData() {
    try {
      const [accountsData, categoriesData, limit] = await Promise.all([
        getAccounts(),
        getCategories(),
        getSetting('withdrawal_limit')
      ]);
      setAccounts(accountsData);
      setCategories(categoriesData);
      
      const balances = {};
      for (const acc of accountsData) {
        balances[acc.id] = await getAccountBalance(acc.id);
      }
      setAccountBalances(balances);
      setWithdrawalLimit(limit || 0);
      
      if (accountsData.length > 0) {
        setForm(f => ({ ...f, account_id: accountsData[0].id }));
      }
      if (categoriesData.length > 0) {
        setForm(f => ({ ...f, category_id: categoriesData[0].id }));
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'vocal_note.webm', { type: 'audio/webm' });
        setSelectedFile(file);
        setAttachmentType('AUDIO');
        setFilePreview(null);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) { alert('Micro non accessible'); }
  }

  function stopRecording() {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  }

  function handleFileChange(e, type = 'IMAGE') {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setAttachmentType(type);
      if (file.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(file));
      } else {
        setFilePreview(null);
      }
    }
  }

  function removeFile() {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  function formatAmount(e) {
    let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
    if (value) {
      value = parseInt(value, 10).toLocaleString('fr-FR');
    }
    setForm(f => ({ ...f, amount: value }));
  }

  function getAmountValue() {
    return parseInt(form.amount.replace(/\s/g, ''), 10) || 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const amountNum = getAmountValue();
    
    if (!form.account_id || !amountNum || !form.category_id) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const currentBalance = accountBalances[form.account_id] || 0;
    if (form.type === 'debit' && amountNum > currentBalance) {
      alert(`Solde insuffisant. Solde disponible : ${currentBalance.toLocaleString('fr-FR')} XAF`);
      return;
    }

    setSaving(true);
    try {
      const txData = {
        ...form,
        amount: amountNum,
        exchange_rate: parseFloat(form.exchange_rate) || 1,
        date: form.date
      };
      
      const tx = await addTransaction(txData);
      
      if (selectedFile && tx.id) {
        await uploadAttachment(tx.id, selectedFile, attachmentType);
      }
      
      navigate('/');
    } catch (err) {
      console.error('Error saving transaction:', err);
      alert('Erreur lors de l\'enregistrement de la transaction');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="card">Chargement...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <button className="btn btn-outline" onClick={() => navigate('/')} style={{marginBottom: '16px'}}>
          <ArrowLeft size={18} /> Retour
        </button>
        <h1 className="page-header-title">Nouvelle Transaction</h1>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="flux-toggle" style={{display: 'flex', gap: '12px', marginBottom: '24px'}}>
            <button 
              type="button" 
              className={`btn ${form.type === 'credit' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setForm(f => ({ ...f, type: 'credit' }))}
              style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}
            >
              <TrendingUp size={18} /> Entrée d'argent
            </button>
            <button 
              type="button" 
              className={`btn ${form.type === 'debit' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setForm(f => ({ ...f, type: 'debit' }))}
              style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: form.type === 'debit' ? 'var(--red)' : ''}}
            >
              <TrendingDown size={18} /> Sortie d'argent
            </button>
          </div>

          <div className="form-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px'}}>
            <div className="form-field">
              <label>Montant</label>
              <div style={{display: 'flex', gap: '8px'}}>
                <input 
                  type="text" 
                  className="field-input" 
                  value={form.amount}
                  onChange={formatAmount}
                  placeholder="0"
                  required
                />
                <select 
                  className="field-input" 
                  style={{width: '100px'}}
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                >
                  <option value="XAF">XAF</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div className="form-field">
              <label>Compte</label>
              <select 
                className="field-input"
                name="account_id"
                value={form.account_id}
                onChange={handleChange}
                required
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({accountBalances[acc.id]?.toLocaleString('fr-FR')} XAF)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Catégorie</label>
              <select 
                className="field-input"
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                required
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Date</label>
              <input 
                type="date" 
                className="field-input"
                name="date"
                value={form.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field" style={{gridColumn: 'span 2'}}>
              <label>Description / Tiers</label>
              <input 
                type="text" 
                className="field-input"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Ex: Vente Boutique, Salaire, etc."
              />
            </div>

            <div className="form-field" style={{gridColumn: 'span 2'}}>
              <label>Référence externe (MoMo, Facture)</label>
              <input 
                type="text" 
                className="field-input"
                name="reference"
                value={form.reference}
                onChange={handleChange}
                placeholder="N° de transaction ou de pièce"
              />
            </div>

            <div className="form-field" style={{gridColumn: 'span 2'}}>
              <label>Justificatif</label>
              <div style={{display: 'flex', gap: '10px', marginTop: '8px'}}>
                <button type="button" className="btn btn-outline" onClick={() => fileInputRef.current.click()}>
                  <Camera size={18} /> Photo / Fichier
                </button>
                <button 
                  type="button" 
                  className={`btn ${isRecording ? 'btn-primary' : 'btn-outline'}`} 
                  onClick={isRecording ? stopRecording : startRecording}
                  style={{background: isRecording ? 'var(--red)' : ''}}
                >
                  <Mic size={18} /> {isRecording ? 'Arrêter' : 'Note vocale'}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{display: 'none'}} 
                  onChange={(e) => handleFileChange(e)}
                  accept="image/*,application/pdf"
                />
              </div>

              {selectedFile && (
                <div style={{marginTop: '12px', padding: '12px', background: 'var(--n50)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    {filePreview ? (
                      <img src={filePreview} alt="Preview" style={{width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px'}} />
                    ) : (
                      <div style={{width: '40px', height: '40px', background: 'var(--g50)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px'}}>
                        {attachmentType === 'AUDIO' ? <Mic size={20} /> : <X size={20} />}
                      </div>
                    )}
                    <span style={{fontSize: '14px'}}>{selectedFile.name}</span>
                  </div>
                  <button type="button" onClick={removeFile} style={{border: 'none', background: 'none', cursor: 'pointer', color: 'var(--red)'}}>
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{marginTop: '32px', display: 'flex', justifyContent: 'flex-end'}}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{padding: '12px 32px'}}>
              {saving ? 'Enregistrement...' : <><Save size={18} /> Enregistrer la Transaction</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
