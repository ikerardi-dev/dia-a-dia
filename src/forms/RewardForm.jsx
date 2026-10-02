import { useState } from 'react';
import Sheet from '../components/Sheet.jsx';
import IconPicker from '../components/IconPicker.jsx';
import { REWARD_ICONS } from '../lib/catalog.js';

export default function RewardForm({ reward, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(reward ?? { name: '', icon: REWARD_ICONS[0], cost: 200 });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    const err = await onSave({ name: form.name, icon: form.icon, cost: Number(form.cost) });
    setSaving(false);
    setError(err);
  };

  return (
    <Sheet title={reward ? 'Editar recompensa' : 'Nueva recompensa'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="r-name">Qué te das</label>
          <input id="r-name" type="text" maxLength={40} value={form.name} placeholder="Por ejemplo, pedir pizza" onChange={e => set('name', e.target.value)} />
        </div>

        <div className="field">
          <span className="lbl">Icono</span>
          <IconPicker icons={REWARD_ICONS} value={form.icon} onChange={v => set('icon', v)} />
        </div>

        <div className="field">
          <label htmlFor="r-cost">Precio en puntos</label>
          <input id="r-cost" type="number" min={10} step={10} value={form.cost} onChange={e => set('cost', e.target.value)} />
          <p className="hint">Como referencia: con las tareas de ejemplo, un día completo da unos 50 puntos de media.</p>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="actions">
          {reward && <button type="button" className="btn danger" onClick={onDelete}>Eliminar</button>}
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={saving}>{reward ? 'Guardar cambios' : 'Crear recompensa'}</button>
        </div>
      </form>
    </Sheet>
  );
}
