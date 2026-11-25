import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { del, post, put } from '../api/client';
import { useSettings, useStaff } from '../api/hooks';
import type { Hours, SettingsData, SettingsTab } from '../api/types';
import { useAuth } from '../auth/Auth';
import { Icon } from '../components/Icon';
import { useUi } from '../components/Ui';
import { ErrorBox, Loading } from '../components/Widgets';
import { StaffModal } from '../modals/StaffModal';

const TABS: [SettingsTab, string][] = [
  ['business', 'Business information'], ['profile', 'Photos and description'], ['branch', 'Branch information'], ['staff', 'Staff'], ['account', 'Account settings'],
];

export function Settings() {
  const { me } = useAuth();
  const s = useSettings();
  const allowed = me!.permissions.settings_tabs;
  const [tab, setTab] = useState<SettingsTab>(allowed[0] ?? 'branch');

  if (s.isLoading) return <Loading />;
  if (s.error || !s.data) return <ErrorBox error={s.error} retry={() => s.refetch()} />;

  return (
    <div className="settings">
      <nav className="set-nav" aria-label="Settings sections">
        {TABS.filter(([t]) => allowed.includes(t)).map(([t, l]) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{l}</button>
        ))}
      </nav>
      <section className="panel set-body">
        {tab === 'business' && <BusinessTab data={s.data} />}
        {tab === 'profile' && <ProfileTab data={s.data} />}
        {tab === 'branch' && <BranchTab data={s.data} />}
        {tab === 'staff' && <StaffTab />}
        {tab === 'account' && <AccountTab data={s.data} />}
      </section>
    </div>
  );
}

function useSave() {
  const ui = useUi();
  const qc = useQueryClient();
  const { refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  return {
    busy,
    run: async (fn: () => Promise<unknown>, msg: string) => {
      setBusy(true);
      try {
        await fn();
        await qc.invalidateQueries();
        await refresh();
        ui.toast(msg);
        return true;
      } catch (e) {
        ui.toast(e instanceof Error ? e.message : 'Could not save. Try again.');
        return false;
      } finally {
        setBusy(false);
      }
    },
  };
}

const AppNote = () => (
  <div className="note-app" style={{ marginTop: 22 }}>
    <span className="ic"><Icon name="phone" /></span>
    <div>Notification, reward and campaign settings are managed on the <b>Dara app</b>.</div>
  </div>
);

function BusinessTab({ data }: { data: SettingsData }) {
  const b = data.business!;
  const [f, setF] = useState({ name: b.name, category: b.category ?? '', phone: b.phone, email: b.email, address: b.address });
  const save = useSave();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.run(() => put('/business/settings/business', { ...f, category: f.category || null }), 'Business information saved');
  };
  return (
    <>
      <form className="form" onSubmit={submit}>
        <div><h3>Business information</h3><p className="sub">Shown on invoices and receipts.</p></div>
        <div className="grid2">
          <div className="field"><label>Business name</label><input value={f.name} onChange={set('name')} required /></div>
          <div className="field"><label>Business type</label>
            <select value={f.category} onChange={set('category')}><option value="">Choose…</option>{data.categories.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
        </div>
        <div className="grid2">
          <div className="field"><label>Phone number</label><input type="tel" value={f.phone} onChange={set('phone')} /></div>
          <div className="field"><label>Email</label><input type="email" value={f.email} onChange={set('email')} /></div>
        </div>
        <div className="field"><label>Address</label><input value={f.address} onChange={set('address')} /></div>
        <div className="grid2">
          <div className="field"><label>Currency</label><input value={b.currency} disabled /></div>
          <div className="field"><label>Invoice prefix</label><input value={b.invoice_prefix} disabled /></div>
        </div>
        <div className="set-foot"><button type="submit" className="btn primary" disabled={save.busy}>Save changes</button></div>
      </form>
      <AppNote />
    </>
  );
}

function ProfileTab({ data }: { data: SettingsData }) {
  const p = data.profile!;
  const ui = useUi();
  const qc = useQueryClient();
  const save = useSave();
  const [short, setShort] = useState(p.short_description);
  const [long, setLong] = useState(p.long_description);
  const [err, setErr] = useState('');
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const photos = p.photos;
  const left = p.limits.photos - photos.length;

  const upload = async (files: FileList | File[] | null) => {
    setErr('');
    const all = Array.from(files ?? []);
    const ok = all.filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type) && f.size <= 10 * 1024 * 1024);
    const notes: string[] = [];
    if (all.length > ok.length) notes.push(`${all.length - ok.length} file(s) skipped: only JPG, PNG and WebP up to 10 MB are supported.`);
    if (!left) return setErr(`You already have ${p.limits.photos} photos. Remove one to add another.`);
    if (ok.length > left) notes.push(`Only ${left} more photo${left === 1 ? '' : 's'} fit, so ${ok.length - left} were not added.`);
    const send = ok.slice(0, left);
    if (send.length) {
      const fd = new FormData();
      send.forEach((f) => fd.append('photos[]', f));
      try {
        await post('/business/settings/photos', fd);
        await qc.invalidateQueries({ queryKey: ['settings'] });
        ui.toast(`${send.length} photo${send.length === 1 ? '' : 's'} added`);
      } catch (e) {
        notes.push(e instanceof Error ? e.message : 'Upload failed.');
      }
    }
    if (notes.length) setErr(notes.join(' '));
  };

  const order = async (ids: number[], msg?: string) => {
    await put('/business/settings/photos/order', { ids });
    await qc.invalidateQueries({ queryKey: ['settings'] });
    if (msg) ui.toast(msg);
  };
  const move = (i: number, to: number) => {
    const ids = photos.map((x) => x.id);
    const [x] = ids.splice(i, 1);
    ids.splice(to, 0, x);
    order(ids, to === 0 ? 'Cover photo updated' : undefined);
  };
  const remove = async (id: number) => {
    await del(`/business/settings/photos/${id}`);
    await qc.invalidateQueries({ queryKey: ['settings'] });
    ui.toast('Photo removed');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!short.trim()) return ui.toast('Add a short description before saving');
    save.run(() => put('/business/settings/profile', { short_description: short.trim(), long_description: long.trim() }), 'Descriptions saved');
  };

  return (
    <form className="form" noValidate onSubmit={submit}>
      <div><h3>Photos and description</h3><p className="sub">How customers see your business. Add up to {p.limits.photos} photos of your work, products and space.</p></div>
      <div>
        <div className="label-row" style={{ marginBottom: 10 }}><span className="label">Photos</span><span className={'counter' + (left === 0 ? ' near' : '')}>{photos.length} of {p.limits.photos} photos</span></div>
        <div className={'gal' + (drag ? ' drag' : '')}
          onDragEnter={(e) => { e.preventDefault(); setDrag(true); }} onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={(e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(false); }}
          onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}>
          {photos.map((ph, i) => (
            <figure className="gt" key={ph.id}>
              <img src={ph.url} alt={`Business photo ${i + 1}`} />
              {i === 0 && <span className="cover">Cover</span>}
              <span className="pos">{i + 1}</span>
              <div className="gt-act">
                {i > 0 ? <button type="button" className="gb txt" onClick={() => move(i, 0)}>Make cover</button> : <span style={{ marginRight: 'auto' }} />}
                <button type="button" className="gb" aria-label="Move earlier" disabled={i === 0} onClick={() => move(i, i - 1)}><Icon name="chevL" /></button>
                <button type="button" className="gb" aria-label="Move later" disabled={i === photos.length - 1} onClick={() => move(i, i + 1)}><Icon name="chevR" /></button>
                <button type="button" className="gb" aria-label="Remove photo" onClick={() => remove(ph.id)}><Icon name="x" /></button>
              </div>
            </figure>
          ))}
          {left > 0 && (
            <button type="button" className={'gt add' + (photos.length ? '' : ' wide')} onClick={() => input.current?.click()}>
              <Icon name="plus" />{photos.length ? <>Add photos<small>{left} left</small></> : <>Drag photos here or click to add<small>Up to {p.limits.photos} photos</small></>}
            </button>
          )}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
        <p className="hint" style={{ marginTop: 10 }}>JPG, PNG or WebP, up to 10 MB each. The first photo is your cover. Photos save as soon as you add them.</p>
        {err && <p className="form-error" style={{ marginTop: 10 }}>{err}</p>}
      </div>
      <div className="field">
        <div className="label-row"><label htmlFor="pfShort">Short description</label><span className={'counter' + (short.length > p.limits.short * 0.9 ? ' near' : '')}>{short.length} / {p.limits.short}</span></div>
        <input id="pfShort" maxLength={p.limits.short} value={short} onChange={(e) => setShort(e.target.value)} placeholder="e.g. Knotless braids and wig installs in Lekki" />
        <span className="hint">One line that appears under your business name.</span>
      </div>
      <div className="field">
        <div className="label-row"><label htmlFor="pfLong">Full description</label><span className={'counter' + (long.length > p.limits.long * 0.9 ? ' near' : '')}>{long.length.toLocaleString('en-NG')} / {p.limits.long.toLocaleString('en-NG')}</span></div>
        <textarea id="pfLong" rows={8} maxLength={p.limits.long} value={long} onChange={(e) => setLong(e.target.value)} placeholder="Your story, specialities, experience and what makes you different" />
        <span className="hint">Tell customers who you are, what you are known for and what to expect on a visit.</span>
      </div>
      <div className="set-foot">
        <button type="button" className="btn" onClick={() => { setShort(p.short_description); setLong(p.long_description); ui.toast('Changes discarded'); }}>Discard changes</button>
        <button type="submit" className="btn primary" disabled={save.busy}>Save descriptions</button>
      </div>
    </form>
  );
}

function BranchTab({ data }: { data: SettingsData }) {
  const b = data.branch;
  const [name, setName] = useState(b?.name ?? '');
  const [phone, setPhone] = useState(b?.phone ?? '');
  const [address, setAddress] = useState(b?.address ?? '');
  const [hours, setHours] = useState<Hours[]>(b?.opening_hours ?? []);
  const save = useSave();
  useEffect(() => setHours(b?.opening_hours ?? []), [b]);
  const setH = (i: number, patch: Partial<Hours>) => setHours(hours.map((h, j) => (j === i ? { ...h, ...patch } : h)));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.run(() => put('/business/settings/branch', { name, phone, address, opening_hours: hours }), 'Branch information saved');
  };
  return (
    <form className="form" onSubmit={submit}>
      <div><h3>Branch information</h3><p className="sub">Opening hours decide which days show as closed on your booking calendar.</p></div>
      <div className="grid2">
        <div className="field"><label>Branch name</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div className="field"><label>Branch phone</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      </div>
      <div className="field"><label>Branch address</label><input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
      <div>
        <p className="label" style={{ marginBottom: 10 }}>Opening hours</p>
        <div className="hours">
          {hours.map((h, i) => (
            <div key={h.day} style={{ display: 'contents' }}>
              <b>{h.day}</b>
              <input type="time" value={h.open} disabled={!h.is_open} aria-label={h.day + ' opens'} onChange={(e) => setH(i, { open: e.target.value })} />
              <input type="time" value={h.close} disabled={!h.is_open} aria-label={h.day + ' closes'} onChange={(e) => setH(i, { close: e.target.value })} />
              <label className="check"><input type="checkbox" checked={h.is_open} onChange={(e) => setH(i, { is_open: e.target.checked })} /> Open</label>
            </div>
          ))}
        </div>
      </div>
      <div className="set-foot"><button type="submit" className="btn primary" disabled={save.busy}>Save changes</button></div>
    </form>
  );
}

function StaffTab() {
  const ui = useUi();
  const nav = useNavigate();
  const s = useStaff();
  const active = (s.data?.staff ?? []).filter((x) => x.active);
  const roles: [string, string, (r: string) => boolean][] = [
    ['Managers', 'Everything for their branch, including bookings, staff and branch settings.', (r) => r === 'Manager'],
    ['Front desk (Receptionist)', 'Bookings, customers, transactions and invoices. No settings.', (r) => r === 'Receptionist'],
    ['Stylists and technicians', 'Their own bookings and the customers they serve.', (r) => r !== 'Manager' && r !== 'Receptionist'],
  ];
  return (
    <>
      <div><h3>Staff</h3><p className="sub">{active.length} active team members. Each logs in with their work email and 4-digit PIN.</p></div>
      <ul className="minilist">
        {roles.map(([t, d, match]) => (
          <li key={t}><div className="grow"><b>{t}</b><small>{d}</small></div><span className="hint">{active.filter((x) => match(x.access_level || x.role)).length} people</span></li>
        ))}
      </ul>
      <div className="set-foot">
        <button className="btn" onClick={() => nav('/staff')}>Manage staff</button>
        <button className="btn primary" onClick={() => ui.openModal(() => <StaffModal />)}><Icon name="plus" />Add staff</button>
      </div>
    </>
  );
}

function AccountTab({ data }: { data: SettingsData }) {
  const a = data.account!;
  const { logout } = useAuth();
  const ui = useUi();
  const save = useSave();
  const [f, setF] = useState({ name: a.name, phone: a.phone, email: a.email, password: '', password_confirmation: '' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: k.startsWith('password') ? e.target.value.replace(/\D/g, '').slice(0, 4) : e.target.value });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (f.password && f.password !== f.password_confirmation) return ui.toast('PINs do not match. Type the new PIN twice.');
    if (f.password && f.password.length !== 4) return ui.toast('Your password is a 4-digit PIN.');
    const body: Record<string, string> = { name: f.name, phone: f.phone, email: f.email };
    if (f.password) Object.assign(body, { password: f.password, password_confirmation: f.password_confirmation });
    if (await save.run(() => put('/business/settings/account', body), 'Account settings saved')) setF({ ...f, password: '', password_confirmation: '' });
  };
  return (
    <form className="form" onSubmit={submit}>
      <div><h3>Account settings</h3><p className="sub">Your personal login for Dara Business and the Dara app.</p></div>
      <div className="grid2">
        <div className="field"><label>Full name</label><input value={f.name} onChange={set('name')} required /></div>
        <div className="field"><label>Phone number</label><input type="tel" value={f.phone} onChange={set('phone')} /></div>
      </div>
      <div className="field"><label>Login email</label><input type="email" value={f.email} onChange={set('email')} required /></div>
      <div className="grid2">
        <div className="field"><label>New PIN</label><input type="password" inputMode="numeric" placeholder="Leave blank to keep current" autoComplete="new-password" value={f.password} onChange={set('password')} /></div>
        <div className="field"><label>Confirm new PIN</label><input type="password" inputMode="numeric" autoComplete="new-password" value={f.password_confirmation} onChange={set('password_confirmation')} /></div>
      </div>
      <div className="set-foot">
        <button type="button" className="btn danger" style={{ marginRight: 'auto' }} onClick={logout}>Log out</button>
        <button type="submit" className="btn primary" disabled={save.busy}>Save changes</button>
      </div>
    </form>
  );
}
