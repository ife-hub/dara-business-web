import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { patch, post, put } from '../api/client';
import { useCatalog, useStaff } from '../api/hooks';
import type { StaffMember } from '../api/types';
import { Modal, useUi } from '../components/Ui';

/** Backend access levels, with what each can see in Dara Business. */
const ROLES: [string, string][] = [
  ['Operational Staff', 'Stylist or technician: their own bookings and customers'],
  ['Assistant', 'Assistant: their own bookings and customers'],
  ['Receptionist', 'Front desk: bookings, customers, payments and invoices'],
  ['Manager', 'Manager: everything for their branch'],
];

export function StaffModal({ staff: s }: { staff?: StaffMember }) {
  const ui = useUi();
  const qc = useQueryClient();
  const staffQ = useStaff();
  const catalog = useCatalog();
  const edit = !!s;
  const services = catalog.data?.services ?? [];
  const existingSkills = Array.isArray(s?.skills) ? (s!.skills as string[]) : [];

  const [name, setName] = useState(s?.name ?? '');
  const [email, setEmail] = useState(s?.email ?? '');
  const [phone, setPhone] = useState(s?.phone ?? '');
  const [role, setRole] = useState(s?.access_level || s?.role || 'Operational Staff');
  const [pin, setPin] = useState('');
  const [bookable, setBookable] = useState(s?.bookable ?? true);
  const [color, setColor] = useState(s?.color ?? '');
  const [skills, setSkills] = useState<string[]>(edit ? existingSkills : []);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const allSkills = skills.length ? skills : services.map((x) => x.name);

  const save = async () => {
    if (!name.trim()) return setErr("Enter the staff member's name.");
    if (!email.includes('@')) return setErr('Enter a work email. Staff log in to Dara Business with it.');
    if (!edit && !/^\d{4}$/.test(pin)) return setErr('Choose a 4-digit PIN they will log in with.');
    if (edit && pin && !/^\d{4}$/.test(pin)) return setErr('A PIN is 4 digits.');
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        full_name: name.trim(), email: email.trim(), phone_number: phone.trim() || null, role, access_level: role,
        skills: role === 'Manager' ? allSkills : allSkills.length ? allSkills : ['General'],
      };
      if (pin) body.pin = pin;
      let id = s?.id;
      if (edit) {
        await put(`/staff/${id}`, body);
      } else {
        const res = await post<{ data: { id: number } }>('/staff', { ...body, commission_rate: 0, status: true });
        id = res.data.id;
      }
      if (id) await patch(`/business/staff/${id}`, { bookable, ...(color ? { color } : {}) });
      await qc.invalidateQueries();
      ui.closeModal();
      ui.toast(edit ? 'Changes saved for ' + name.trim() : name.trim() + ' added to your team. They can log in with ' + email.trim() + ' and their PIN.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const toggleSkill = (n: string) => setSkills(allSkills.includes(n) ? allSkills.filter((x) => x !== n) : [...allSkills, n]);

  return (
    <Modal title={edit ? 'Edit staff' : 'Add staff'} size="narrow"
      footer={<><button className="btn" onClick={ui.closeModal}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>{edit ? 'Save changes' : 'Add staff'}</button></>}>
      <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="field"><label>Full name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="grid2">
          <div className="field"><label>Work email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="field"><label>Phone</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        </div>
        <div className="field"><label>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>
        <div className="grid2">
          <div className="field"><label>{edit ? 'New PIN (optional)' : 'Login PIN'}</label><input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder={edit ? 'Keep current' : '4 digits'} /></div>
          <div className="field"><label>Calendar colour</label>
            <select value={color} onChange={(e) => setColor(e.target.value)} style={color ? { color } : undefined}>
              <option value="">Automatic</option>
              {(staffQ.data?.colors ?? []).map((c) => <option key={c} value={c} style={{ color: c }}>● {c}</option>)}
            </select>
          </div>
        </div>
        <label className="check"><input type="checkbox" checked={bookable} onChange={(e) => setBookable(e.target.checked)} /> Takes bookings and shows on the calendar</label>
        {bookable && services.length > 0 && (
          <div className="field"><span className="label">Services they do</span>
            <div className="checks">{services.map((x) => <label key={x.id} className="check"><input type="checkbox" checked={allSkills.includes(x.name)} onChange={() => toggleSkill(x.name)} /> {x.name}</label>)}</div>
          </div>
        )}
        {err && <p className="form-error">{err}</p>}
      </form>
    </Modal>
  );
}
