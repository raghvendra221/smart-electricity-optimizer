// pages/Appliances.jsx
import React, { useEffect, useState } from 'react';
import { MdAdd, MdEdit, MdDelete, MdBolt } from 'react-icons/md';
import {
  getAppliances, addAppliance, updateAppliance, deleteAppliance,
} from '../services/mockApi.js';
import {
  Card, Button, Input, Modal, Badge, LoadingScreen, EmptyState, Spinner,
} from '../components/ui/index.jsx';
import { calcDailyKwh, calcMonthlyCost, formatCurrency, CHART_COLORS } from '../utils/electricity.js';
import { useToast } from '../context/ToastContext.jsx';

const BLANK = { name: '', wattage: '', hours: '' };

export default function Appliances() {
  const [appliances, setAppliances] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [form, setForm]             = useState(BLANK);
  const [formErrors, setFormErrors] = useState({});
  const [adding, setAdding]         = useState(false);
  const [editItem, setEditItem]     = useState(null);
  const [editForm, setEditForm]     = useState(BLANK);
  const [deletingId, setDeletingId] = useState(null);
  const { addToast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { appliances: data } = await getAppliances();
      setAppliances(data);
    } catch (e) {
      addToast('Failed to load appliances', 'error');
    } finally {
      setLoading(false);
    }
  }

  function validateForm(f) {
    const e = {};
    if (!f.name.trim()) e.name = 'Name is required';
    if (!f.wattage || isNaN(f.wattage) || +f.wattage <= 0) e.wattage = 'Valid wattage required';
    if (!f.hours || isNaN(f.hours) || +f.hours < 0 || +f.hours > 24) e.hours = 'Hours must be 0–24';
    return e;
  }

  async function handleAdd() {
    const e = validateForm(form);
    if (Object.keys(e).length) { setFormErrors(e); return; }
    setAdding(true);
    try {
      const { appliance } = await addAppliance({
        name: form.name.trim(),
        wattage: +form.wattage,
        hours: +form.hours,
      });
      setAppliances((prev) => [...prev, appliance]);
      setForm(BLANK);
      setFormErrors({});
      addToast(`${appliance.name} added!`, 'success');
    } catch (e) {
      addToast(e.message || 'Failed to add', 'error');
    } finally {
      setAdding(false);
    }
  }

  function openEdit(a) {
    setEditItem(a);
    setEditForm({ name: a.name, wattage: String(a.wattage), hours: String(a.hours) });
  }

  async function handleSaveEdit() {
    const e = validateForm(editForm);
    if (Object.keys(e).length) { setFormErrors(e); return; }
    try {
      const { appliance } = await updateAppliance(editItem._id, {
        name: editForm.name.trim(),
        wattage: +editForm.wattage,
        hours: +editForm.hours,
      });
      setAppliances((prev) => prev.map((a) => (a._id === appliance._id ? appliance : a)));
      setEditItem(null);
      setFormErrors({});
      addToast('Appliance updated!', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to update', 'error');
    }
  }

  async function handleDelete(id, name) {
    setDeletingId(id);
    try {
      await deleteAppliance(id);
      setAppliances((prev) => prev.filter((a) => a._id !== id));
      addToast(`${name} removed`, 'info');
    } catch (e) {
      addToast(e.message || 'Failed to delete', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setEdit = (field) => (e) => setEditForm({ ...editForm, [field]: e.target.value });

  if (loading) return <LoadingScreen message="Loading appliances..." />;

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text)] mb-1">Appliances</h2>
      <p className="text-xs text-[var(--text3)] font-mono mb-5">{appliances.length} device{appliances.length !== 1 ? 's' : ''} tracked</p>

      {/* Add Form */}
      <Card title="Add New Appliance" className="mb-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <Input label="Appliance Name" placeholder="e.g. Air Conditioner"
              value={form.name} onChange={set('name')} error={formErrors.name} />
          </div>
          <div className="w-32">
            <Input label="Wattage (W)" placeholder="2000" type="number"
              value={form.wattage} onChange={set('wattage')} error={formErrors.wattage} />
          </div>
          <div className="w-28">
            <Input label="Hrs / Day" placeholder="8" type="number" min="0" max="24" step="0.5"
              value={form.hours} onChange={set('hours')} error={formErrors.hours} />
          </div>
          <Button onClick={handleAdd} loading={adding} className="mb-0.5">
            <MdAdd size={16} /> Add
          </Button>
        </div>
      </Card>

      {/* List */}
      <Card title="All Appliances">
        {appliances.length === 0 ? (
          <EmptyState icon="🔌" title="No appliances yet"
            subtitle="Add your first appliance above to start tracking usage." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Appliance', 'Wattage', 'Hrs/Day', 'Daily kWh', 'Monthly Cost', 'Actions'].map((h) => (
                    <th key={h} className="text-left py-2.5 px-3 text-[10px] font-mono text-[var(--text3)] uppercase tracking-widest">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appliances.map((a, i) => {
                  const kwh  = calcDailyKwh(a.wattage, a.hours);
                  const cost = calcMonthlyCost(a.wattage, a.hours);
                  return (
                    <tr key={a._id} className="border-b border-[var(--border)]/40 hover:bg-[var(--bg3)] transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-sm shrink-0"
                            style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="font-medium text-[var(--text)]">{a.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-xs bg-[var(--bg3)] text-[var(--accent3)] px-2 py-0.5 rounded border border-amber-900/30">
                          {a.wattage}W
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[var(--text2)]">{a.hours}h</td>
                      <td className="py-3 px-3">
                        <Badge variant="cyan">{kwh} kWh</Badge>
                      </td>
                      <td className="py-3 px-3 font-mono text-[var(--accent3)] text-xs">{formatCurrency(cost)}</td>
                      <td className="py-3 px-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" className="py-1 px-3 text-xs" onClick={() => openEdit(a)}>
                            <MdEdit size={13} /> Edit
                          </Button>
                          <Button variant="danger" className="py-1 px-3 text-xs"
                            loading={deletingId === a._id}
                            onClick={() => handleDelete(a._id, a.name)}>
                            <MdDelete size={13} /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Modal */}
      <Modal isOpen={!!editItem} onClose={() => { setEditItem(null); setFormErrors({}); }}
        title={`Edit ${editItem?.name || ''}`}>
        <div className="space-y-4">
          <Input label="Name" value={editForm.name} onChange={setEdit('name')} error={formErrors.name} />
          <Input label="Wattage (W)" type="number" value={editForm.wattage} onChange={setEdit('wattage')} error={formErrors.wattage} />
          <Input label="Hours / Day" type="number" min="0" max="24" step="0.5"
            value={editForm.hours} onChange={setEdit('hours')} error={formErrors.hours} />
          <div className="flex gap-3 pt-1">
            <Button className="flex-1 justify-center" onClick={handleSaveEdit}>Save Changes</Button>
            <Button variant="ghost" onClick={() => { setEditItem(null); setFormErrors({}); }}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
