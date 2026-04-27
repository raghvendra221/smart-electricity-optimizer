// pages/Appliances.jsx
import React, { useEffect, useState } from 'react';
import { MdAdd, MdEdit, MdDelete } from 'react-icons/md';
import {
  getAppliances, addAppliance, updateAppliance, deleteAppliance,
} from '../services/api.js'; // ✅ FIXED
import {
  Card, Button, Input, Modal, Badge, LoadingScreen, EmptyState,
} from '../components/ui/index.jsx';
import { calcDailyKwh, calcMonthlyCost, formatCurrency, CHART_COLORS } from '../utils/electricity.js';
import { useToast } from '../context/ToastContext.jsx';

const BLANK = { name: '', wattage: '' };

export default function Appliances() {
  const [appliances, setAppliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(BLANK);
  const [formErrors, setFormErrors] = useState({});
  const [adding, setAdding] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState(BLANK);
  const [deletingId, setDeletingId] = useState(null);

  const { addToast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { appliances: data } = await getAppliances(); // ✅ FIXED
      setAppliances(data);
    } catch {
      addToast('Failed to load appliances', 'error');
    } finally {
      setLoading(false);
    }
  }

  function validateForm(f) {
    const e = {};
    if (!f.name.trim()) e.name = 'Name required';
    if (!f.wattage || +f.wattage <= 0) e.wattage = 'Invalid wattage';
    return e;
  }

  async function handleAdd() {
    const e = validateForm(form);
    if (Object.keys(e).length) { setFormErrors(e); return; }

    setAdding(true);
    try {
      await addAppliance({
        name: form.name,
        wattage: +form.wattage,
      });

      load();
      setForm(BLANK);
      addToast('Added!', 'success');
    } catch {
      addToast('Failed to add', 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await deleteAppliance(id);
      setAppliances(prev => prev.filter(a => a.id !== id)); // ✅ FIXED
    } catch {
      addToast('Delete failed', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  function openEditModal(appliance) {
    setEditItem(appliance);
    setEditForm({ name: appliance.name, wattage: appliance.wattage });
  }

  async function handleUpdate() {
    const e = validateForm(editForm);
    if (Object.keys(e).length) { setFormErrors(e); return; }

    try {
      await updateAppliance(editItem.id, {
        name: editForm.name,
        wattage: +editForm.wattage,
      });

      load();
      setEditItem(null);
      addToast('Updated!', 'success');
    } catch {
      addToast('Failed to update', 'error');
    }
  }

  if (loading) return <LoadingScreen message="Loading..." />;

  return (
    <div>
      <h2>Appliances</h2>

      <Card title="Add Appliance">
        <Input label="Name" value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          error={formErrors.name} />
        <Input label="Wattage (W)" type="number" value={form.wattage}
          onChange={e => setForm({ ...form, wattage: e.target.value })}
          error={formErrors.wattage} />
        <Button onClick={handleAdd} loading={adding}>
          <MdAdd /> Add
        </Button>
      </Card>

      <Card title="All Appliances">
        {appliances.length === 0 ? (
          <EmptyState title="No appliances" />
        ) : (
          appliances.map(a => (
            <div key={a.id} className="flex justify-between items-center p-3 border-b">
              <span>{a.name} ({a.wattage}W)</span>

              <div className="flex gap-2">
                <Button
                  onClick={() => openEditModal(a)}
                  variant="ghost"
                >
                  <MdEdit />
                </Button>
                <Button
                  onClick={() => handleDelete(a.id)}
                  loading={deletingId === a.id}
                  variant="danger"
                >
                  <MdDelete />
                </Button>
              </div>
            </div>
          ))
        )}
      </Card>

      {editItem && (
        <Modal 
          isOpen={!!editItem} 
          title="Edit Appliance" 
          onClose={() => setEditItem(null)}
        >
          <Input label="Name" value={editForm.name}
            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
            error={formErrors.name} />
          <Input label="Wattage (W)" type="number" value={editForm.wattage}
            onChange={e => setEditForm({ ...editForm, wattage: e.target.value })}
            error={formErrors.wattage} />
          <Button onClick={handleUpdate}>Update</Button>
        </Modal>
      )}
    </div>
  );
}