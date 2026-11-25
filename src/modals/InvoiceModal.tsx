import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { post } from '../api/client';
import { useCatalog, useCustomers, useInvoices } from '../api/hooks';
import { Icon } from '../components/Icon';
import { Modal, useUi } from '../components/Ui';
import { dayOff, naira } from '../lib/format';

interface Line { name: string; qty: number; price: number }

export function InvoiceModal({ customerId: initialCustomer }: { customerId?: number }) {
  const ui = useUi();
  const qc = useQueryClient();
  const customers = useCustomers();
  const catalog = useCatalog();
  const invoices = useInvoices();
  const items = [...(catalog.data?.services ?? []), ...(catalog.data?.products ?? [])];
  const sorted = [...(customers.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const [customerId, setCustomerId] = useState<number | ''>(initialCustomer ?? '');
  const [due, setDue] = useState(dayOff(7));
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (customerId === '' && sorted[0]) setCustomerId(sorted[0].id); }, [sorted, customerId]);
  useEffect(() => { if (!lines.length && items[0]) setLines([{ name: items[0].name, qty: 1, price: items[0].price }]); }, [items, lines.length]);

  const sub = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const disc = Math.max(0, Number(discount) || 0);
  const total = Math.max(0, sub - disc);
  const setLine = (i: number, patch: Partial<Line>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const itemOptions = (
    <>
      {catalog.data?.services.length ? <optgroup label="Services">{catalog.data.services.map((s) => <option key={'s' + s.id}>{s.name}</option>)}</optgroup> : null}
      {catalog.data?.products.length ? <optgroup label="Products">{catalog.data.products.map((p) => <option key={'p' + p.id}>{p.name}</option>)}</optgroup> : null}
    </>
  );

  const save = async (send: boolean) => {
    const valid = lines.filter((l) => l.qty > 0);
    if (!customerId) return setErr('Choose who the invoice is for.');
    if (!valid.length) return setErr('Add at least one line with a quantity.');
    setBusy(true);
    try {
      const res = await post<{ data: { id: number; invoice_no: string } }>('/invoices', {
        customer_id: customerId,
        due_date: due,
        subTotalAmount: sub,
        discountType: disc ? 'amount' : undefined,
        discountAmount: disc || undefined,
        totalAmount: total,
        notes: notes.trim() || undefined,
        invoice_items: valid.map((l) => ({ service: l.name, quantity: l.qty, price: l.price })),
      });
      let msg = res.data.invoice_no + ' saved';
      if (send) {
        try {
          await post(`/business/invoices/${res.data.id}/send`);
          msg = res.data.invoice_no + ' emailed to ' + (sorted.find((c) => c.id === customerId)?.name ?? 'the customer');
        } catch (e) {
          msg = res.data.invoice_no + ' saved, but not sent: ' + (e instanceof Error ? e.message : '');
        }
      }
      await qc.invalidateQueries();
      ui.closeModal();
      ui.openDrawer({ type: 'invoice', id: res.data.id });
      ui.toast(msg);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create the invoice.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Create invoice" sub={invoices.data ? 'Next number: ' + invoices.data.next_number : undefined} size="wide"
      footer={<>
        <button className="btn left" onClick={ui.closeModal}>Cancel</button>
        <button className="btn" onClick={() => save(false)} disabled={busy}>Save</button>
        <button className="btn primary" onClick={() => save(true)} disabled={busy}><Icon name="send" />Save and email</button>
      </>}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); save(false); }}>
        <div className="grid2">
          <div className="field"><label>Customer</label>
            <select value={customerId} onChange={(e) => setCustomerId(Number(e.target.value))}>
              {!sorted.length && <option value="">{customers.isLoading ? 'Loading…' : 'No customers yet'}</option>}
              {sorted.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Due date</label><input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
        </div>
        <div>
          <div className="line-h"><span>Service or product</span><span>Qty</span><span>Price (₦)</span><span>Amount</span><span /></div>
          <div className="lines" style={{ marginTop: 6 }}>
            {lines.map((l, i) => (
              <div className="line" key={i}>
                <select className="inp" aria-label="Item" value={l.name} onChange={(e) => setLine(i, { name: e.target.value, price: items.find((x) => x.name === e.target.value)?.price ?? l.price })}>{itemOptions}</select>
                <input className="inp" type="number" min={1} aria-label="Quantity" value={l.qty} onChange={(e) => setLine(i, { qty: Math.max(0, Number(e.target.value) || 0) })} />
                <input className="inp" type="number" min={0} step={500} aria-label="Price" value={l.price} onChange={(e) => setLine(i, { price: Math.max(0, Number(e.target.value) || 0) })} />
                <span className="lt">{naira(l.qty * l.price)}</span>
                <button type="button" className="icon-btn bare" aria-label="Remove line" disabled={lines.length === 1} style={lines.length === 1 ? { opacity: 0.3 } : undefined}
                  onClick={() => setLines(lines.filter((_, j) => j !== i))}><Icon name="trash" /></button>
              </div>
            ))}
          </div>
          <button type="button" className="btn sm" style={{ marginTop: 10 }} onClick={() => items[0] && setLines([...lines, { name: items[0].name, qty: 1, price: items[0].price }])}><Icon name="plus" />Add line</button>
        </div>
        <div className="totals">
          <div><span className="muted">Subtotal</span><b className="tnum">{naira(sub)}</b></div>
          <div><span className="muted">Discount (₦)</span><input type="number" min={0} step={500} value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
          <div className="g"><span>Total</span><span className="tnum">{naira(total)}</span></div>
        </div>
        <div className="field"><label>Notes <span className="muted" style={{ fontWeight: 500 }}>(optional)</span></label><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Shown on the invoice, e.g. deposit terms" /></div>
        {err && <p className="form-error">{err}</p>}
      </form>
    </Modal>
  );
}
