import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCatalog, useCustomers } from '../api/hooks';
import { Modal, useUi } from '../components/Ui';
import { METHODS, recordPayment } from '../lib/bookings';
import { naira } from '../lib/format';

export function TransactionModal({ customerId: initialCustomer }: { customerId?: number }) {
  const ui = useUi();
  const qc = useQueryClient();
  const customers = useCustomers();
  const catalog = useCatalog();
  const items = [...(catalog.data?.services ?? []), ...(catalog.data?.products ?? [])];
  const [customerId, setCustomerId] = useState<number | ''>(initialCustomer ?? '');
  const [item, setItem] = useState('');
  const [qty, setQty] = useState('1');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>(METHODS[0]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const sorted = [...(customers.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => { if (customerId === '' && sorted[0]) setCustomerId(sorted[0].id); }, [sorted, customerId]);
  useEffect(() => {
    if (!item && items[0]) {
      setItem(items[0].name);
      setAmount(String(Math.round(items[0].price)));
    }
  }, [items, item]);

  const pick = (name: string) => {
    setItem(name);
    const p = items.find((x) => x.name === name);
    if (p) setAmount(String(Math.round(p.price * (Number(qty) || 1))));
  };

  const save = async () => {
    const amt = Number(amount) || 0;
    if (!customerId) return setErr('Choose the customer who paid. Add them first if they are new.');
    if (!item) return setErr('Choose what was paid for.');
    if (amt <= 0) return setErr('Enter an amount greater than ₦0.');
    setBusy(true);
    try {
      await recordPayment({ customerId: Number(customerId), item, amount: amt, method, quantity: Number(qty) || 1 });
      await qc.invalidateQueries();
      ui.closeModal();
      ui.toast(naira(amt) + ' recorded');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not record the transaction.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Add transaction" sub="Record money received for a service or product."
      footer={<><button className="btn" onClick={ui.closeModal}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>Add transaction</button></>}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="field"><label>Customer</label>
          <select value={customerId} onChange={(e) => setCustomerId(Number(e.target.value))}>
            {!sorted.length && <option value="">{customers.isLoading ? 'Loading…' : 'No customers yet'}</option>}
            {sorted.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid3">
          <div className="field"><label>Service or product</label>
            <select value={item} onChange={(e) => pick(e.target.value)}>
              {catalog.data?.services.length ? <optgroup label="Services">{catalog.data.services.map((s) => <option key={'s' + s.id}>{s.name}</option>)}</optgroup> : null}
              {catalog.data?.products.length ? <optgroup label="Products">{catalog.data.products.map((p) => <option key={'p' + p.id}>{p.name}</option>)}</optgroup> : null}
            </select>
          </div>
          <div className="field"><label>Quantity</label><input type="number" min={1} value={qty} onChange={(e) => { setQty(e.target.value); const p = items.find((x) => x.name === item); if (p) setAmount(String(Math.round(p.price * (Number(e.target.value) || 1)))); }} /></div>
          <div className="field"><label>Amount (₦)</label><input type="number" min={0} step={500} value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        </div>
        <div className="field"><label>Payment method</label><select value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></div>
        {err && <p className="form-error">{err}</p>}
      </form>
    </Modal>
  );
}
