import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { post } from '../api/client';
import { Modal, useUi } from '../components/Ui';

export function CustomerModal({ onSaved }: { onSaved?: (customerId: number) => void }) {
  const ui = useUi();
  const qc = useQueryClient();
  const [f, setF] = useState({ name: '', phone: '', email: '', birthday: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    if (!f.name.trim() || !f.phone.trim()) return setErr("Enter the customer's name and phone number.");
    setBusy(true);
    try {
      const res = await post<{ data: { customerId: number } }>('/logbook', {
        name: f.name.trim(), phoneRef: f.phone.trim(), email: f.email.trim() || undefined, birthday: f.birthday || undefined,
      });
      await qc.invalidateQueries();
      ui.closeModal();
      ui.toast(f.name.trim() + ' added to your customers');
      onSaved?.(res.data.customerId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not add the customer.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Add customer" size="narrow"
      footer={<><button className="btn" onClick={ui.closeModal}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>Add customer</button></>}>
      <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="field"><label>Full name</label><input value={f.name} onChange={set('name')} placeholder="e.g. Funmi Adebayo" /></div>
        <div className="field"><label>Phone number</label><input type="tel" value={f.phone} onChange={set('phone')} placeholder="+234 800 000 0000" /></div>
        <div className="field"><label>Email <span className="muted" style={{ fontWeight: 500 }}>(optional, for booking reminders)</span></label><input type="email" value={f.email} onChange={set('email')} /></div>
        <div className="field"><label>Birthday <span className="muted" style={{ fontWeight: 500 }}>(optional)</span></label><input type="date" value={f.birthday} onChange={set('birthday')} /></div>
        {err && <p className="form-error">{err}</p>}
      </form>
    </Modal>
  );
}
