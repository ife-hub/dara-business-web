import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { post } from '../api/client';
import { Modal, useUi } from '../components/Ui';
import { fmtDur } from '../lib/format';

const SERVICE_CATS = ['Hair', 'Braids', 'Nails', 'Lashes', 'Treatments', 'Makeup', 'Other'];
const PRODUCT_CATS = ['Hair care', 'Extensions', 'Nail care', 'Salon supplies', 'Other'];

export function CatalogModal({ kind }: { kind: 'service' | 'product' }) {
  const ui = useUi();
  const qc = useQueryClient();
  const isSvc = kind === 'service';
  const [name, setName] = useState('');
  const [category, setCategory] = useState(isSvc ? SERVICE_CATS[0] : PRODUCT_CATS[0]);
  const [price, setPrice] = useState('');
  const [dur, setDur] = useState(60);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim() || !(Number(price) > 0)) return setErr('Enter a name and a price.');
    setBusy(true);
    try {
      if (isSvc) await post('/catalog', { name: name.trim(), subcategory: category, price: Number(price), duration: String(dur) });
      else await post('/products', { name: name.trim(), category, subcategory: category, price: Number(price) });
      await qc.invalidateQueries();
      ui.closeModal();
      ui.toast(name.trim() + ' added to your catalog');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not add it.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={isSvc ? 'Add service' : 'Add product'} size="narrow"
      footer={<><button className="btn" onClick={ui.closeModal}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>{isSvc ? 'Add service' : 'Add product'}</button></>}>
      <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="field"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder={isSvc ? 'e.g. Fulani Braids' : 'e.g. Leave-in Conditioner'} /></div>
        <div className="grid2">
          <div className="field"><label>Category</label><select value={category} onChange={(e) => setCategory(e.target.value)}>{(isSvc ? SERVICE_CATS : PRODUCT_CATS).map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="field"><label>Price (₦)</label><input type="number" min={0} step={500} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" /></div>
        </div>
        {isSvc
          ? <div className="field"><label>Duration</label><select value={dur} onChange={(e) => setDur(Number(e.target.value))}>{[30, 45, 60, 90, 120, 180, 240, 300].map((m) => <option key={m} value={m}>{fmtDur(m)}</option>)}</select></div>
          : <p className="hint">Stock for new products is added from the Dara app.</p>}
        {err && <p className="form-error">{err}</p>}
      </form>
    </Modal>
  );
}
