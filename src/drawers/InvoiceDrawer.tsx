import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { post } from '../api/client';
import { useInvoice, useSettings } from '../api/hooks';
import type { Invoice } from '../api/types';
import { useAuth } from '../auth/Auth';
import { Icon } from '../components/Icon';
import { DrawerFrame, useUi } from '../components/Ui';
import { Empty, Loading, Pill } from '../components/Widgets';
import { fmtDate, naira } from '../lib/format';
import { MarkPaidModal } from '../modals/PaymentModal';

export function InvoiceDoc({ i, business }: { i: Invoice; business: { name: string; address?: string; phone?: string; email?: string } }) {
  return (
    <div className="invdoc">
      <div className="top">
        <div>
          <h3>{business.name}</h3>
          {business.address && <p>{business.address}</p>}
          {(business.phone || business.email) && <p>{[business.phone, business.email].filter(Boolean).join(', ')}</p>}
        </div>
        <div className="no"><small className="muted">Invoice</small><b>{i.number}</b><Pill status={i.status} style={{ marginTop: 6 }} /></div>
      </div>
      <div className="meta">
        <div><small>Billed to</small><b>{i.customer.name}</b><div className="muted">{i.customer.phone}</div></div>
        <div><small>Issued</small><b>{fmtDate(i.date)}</b></div>
        <div><small>Due</small><b>{fmtDate(i.due_date)}</b></div>
      </div>
      <table>
        <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Amount</th></tr></thead>
        <tbody>{(i.items ?? []).map((l, k) => <tr key={k}><td>{l.name}</td><td className="num">{l.quantity}</td><td className="num">{naira(l.price)}</td><td className="num">{naira(l.quantity * l.price)}</td></tr>)}</tbody>
      </table>
      <div className="tot">
        <div><span>Subtotal</span><span className="tnum">{naira(i.subtotal)}</span></div>
        {i.discount > 0 && <div><span>Discount</span><span className="tnum">−{naira(i.discount)}</span></div>}
        {i.tax > 0 && <div><span>Tax</span><span className="tnum">{naira(i.tax)}</span></div>}
        <div className="g"><span>Total</span><span className="tnum">{naira(i.total)}</span></div>
      </div>
      {i.notes && <p className="foot"><b>Notes:</b> {i.notes}</p>}
      <p className="foot">Use {i.number} as your payment reference.</p>
    </div>
  );
}

export function InvoiceDrawer({ id }: { id: number }) {
  const { me } = useAuth();
  const ui = useUi();
  const qc = useQueryClient();
  const q = useInvoice(id);
  const settings = useSettings();
  const [printing, setPrinting] = useState(false);
  const [sending, setSending] = useState(false);

  if (q.isLoading) return <DrawerFrame wide header={<div className="grow"><h2>Invoice</h2></div>}><Loading /></DrawerFrame>;
  if (!q.data) return <DrawerFrame wide header={<div className="grow"><h2>Invoice</h2></div>}><Empty title="Invoice not found">{(q.error as Error)?.message}</Empty></DrawerFrame>;
  const i = q.data;
  const biz = settings.data?.business ?? { name: me!.business.name };

  const send = async () => {
    setSending(true);
    try {
      await post(`/business/invoices/${i.id}/send`);
      await qc.invalidateQueries();
      ui.toast(`${i.number} emailed to ${i.customer.name}`);
    } catch (e) {
      ui.toast(e instanceof Error ? e.message : 'Could not send the invoice.');
    } finally {
      setSending(false);
    }
  };
  const print = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 50);
  };

  return (
    <DrawerFrame wide
      header={<div className="grow"><Pill status={i.status} /><h2>{i.number}</h2><p>{i.customer.name}, {naira(i.total)}{i.sent_at ? ', sent by email' : ', not sent yet'}</p></div>}
      footer={
        <>
          <button className="btn" onClick={print}><Icon name="printer" />Print / Download</button>
          <button className="btn" onClick={send} disabled={sending}><Icon name="send" />{i.sent_at ? 'Send again' : 'Send by email'}</button>
          <span className="primary-slot">{i.status !== 'Paid' && <button className="btn primary" onClick={() => ui.openModal(() => <MarkPaidModal invoice={i} />)}><Icon name="check" />Mark as paid</button>}</span>
        </>
      }>
      <InvoiceDoc i={i} business={biz} />
      {printing && createPortal(<InvoiceDoc i={i} business={biz} />, document.getElementById('printArea')!)}
    </DrawerFrame>
  );
}
