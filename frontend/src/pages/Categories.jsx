import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../services/api';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    group_name: 'charge'
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  }

  function openModal(category = null) {
    if (category) {
      setForm({
        name: category.name,
        group_name: category.group_name
      });
      setEditingId(category.id);
    } else {
      setForm({ name: '', group_name: 'charge' });
      setEditingId(null);
    }
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm({ name: '', group_name: 'charge' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Veuillez entrer un nom');
      return;
    }

    try {
      if (editingId) {
        await updateCategory(editingId, form);
      } else {
        await addCategory(form);
      }
      closeModal();
      loadData();
    } catch (err) {
      console.error('Error saving category:', err);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cette catégorie ?')) return;
    try {
      await deleteCategory(id);
      loadData();
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  }

  const groupLabels = {
    produit: 'Produit',
    charge: 'Charge',
    autre: 'Autre'
  };

  const groupColors = {
    produit: 'success',
    charge: 'danger',
    autre: 'warning'
  };

  if (loading) {
    return <div className="empty-state">Chargement...</div>;
  }

  return (
    <div>
      <div className="comptes-header">
        <div>
          <h2>Catégories</h2>
          <p>{categories.length} catégorie(s)</p>
        </div>
        <div className="add-btn" onClick={() => openModal()}>+</div>
      </div>

      <div className="comptes-list">
        {categories.length === 0 ? (
          <div className="empty-state">
            <p>Aucune catégorie</p>
            <button className="btn btn-primary" onClick={() => openModal()}>
              Ajouter une catégorie
            </button>
          </div>
        ) : (
          categories.map(category => (
            <div className="compte-card" key={category.id}>
              <div className="compte-avatar" style={{background: groupColors[category.group_name] === 'success' ? 'var(--g50)' : groupColors[category.group_name] === 'danger' ? 'var(--red-bg)' : 'var(--a50)'}}>
                {groupLabels[category.group_name]}
              </div>
              <div className="compte-info">
                <div className="cn">{category.name}</div>
                <div className="ct">{groupLabels[category.group_name]}</div>
              </div>
              <div style={{display:'flex', gap:'4px'}}>
                <button className="btn btn-outline" onClick={() => openModal(category)} style={{padding:'6px'}}>
                  <Edit2 size={14} />
                </button>
                <button className="btn btn-danger" onClick={() => handleDelete(category.id)} style={{padding:'6px'}}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingId ? 'Modifier' : 'Nouvelle'} catégorie
              </h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-field">
                <label>Nom</label>
                <input
                  type="text"
                  className="field-input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Vente, Loyer..."
                />
              </div>
              
              <div className="form-field">
                <label>Groupe</label>
                <select
                  className="field-input"
                  value={form.group_name}
                  onChange={e => setForm(f => ({ ...f, group_name: e.target.value }))}
                >
                  <option value="produit">Produit (Revenu)</option>
                  <option value="charge">Charge (Dépense)</option>
                  <option value="autre">Autre</option>
                </select>
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