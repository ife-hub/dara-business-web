import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { put } from '../api/client';
import type { Booking, Invoice } from '../api/types';
import { Modal, useUi } from '../components/Ui';
import { METHODS, recordPayment } from '../lib/bookings';
import { naira } from '../lib/format';

function PaymentForm({ title, sub, amount: initial, skipLabel, onSave }: {
  title: string; sub: string; amount: number; skipLabel?: string; onSave: (amount: number, method: string) => Promise<void>;
}) {
  const ui = useUi();
  const [amount, setAmount] = useState(String(Math.round(initial)));
  const [method, setMethod] = useState<string>(METHODS[0]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const amt = Number(amount) || 0;
    if (amt <= 0) return setErr('Enter an amount greater than ₦0.');
    setBusy(true);
    try {
      await onSave(amt, method);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not record the payment.');
      setBusy(false);
    }
  };
  return (
    <Modal title={title} sub={sub} size="narrow"
      footer={<><button className="btn" onClick={ui.closeModal}>{skipLabel ?? 'Skip for now'}</button><button className="btn primary" onClick={save} disabled={busy}>Record payment</button></>}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="grid2">
          <div className="field"><label>Amount (₦)</label><input type="number" min={0} step={500} value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="field"><label>Payment method</label><select value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></div>
        </div>
        {err && <p className="form-error">{err}</p>}
      </form>
    </Modal>
  );
}

/** "Record payment" for a finished booking: adds a transaction linked to it. */
export function PaymentModal({ booking: b }: { booking: Booking }) {
  const ui = useUi();
  const qc = useQueryClient();
  return (
    <PaymentForm title="Record payment" sub={`${b.customer.name}, ${b.service}`} amount={b.price}
      onSave={async (amount, method) => {
        await recordPayment({ customerId: b.customer.id, item: b.service, amount, method, booking: b });
        await qc.invalidateQueries();
        ui.closeModal();
        ui.toast(`${naira(amount)} received from ${b.customer.name}`);
      }} />
  );
}

/** "Mark as paid" for an invoice: records the payment and closes the invoice. */
export function MarkPaidModal({ invoice: i }: { invoice: Invoice }) {
  const ui = useUi();
  const qc = useQueryClient();
  return (
    <PaymentForm title={`Mark ${i.number} as paid`} sub={`Records the payment against ${i.customer.name}.`} amount={i.total} skipLabel="Cancel"
      onSave={async (amount, method) => {
        await recordPayment({ customerId: i.customer.id, item: 'Invoice ' + i.number, amount, method });
        await put(`/invoices/${i.id}/collect-payment`);
        await qc.invalidateQueries();
        ui.closeModal();
        ui.toast(`${i.number} marked as paid`);
      }} />
  );
}
