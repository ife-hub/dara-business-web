import { useAuth } from '../auth/Auth';
import { useCustomer } from '../api/hooks';
import { Icon } from '../components/Icon';
import { DrawerFrame, useUi } from '../components/Ui';
import { Empty, Loading, Pill } from '../components/Widgets';
import { agoText, firstName, fmtDate, fmtTime, initials, naira, relDate } from '../lib/format';
import { BookingModal } from '../modals/BookingModal';
import { TransactionModal } from '../modals/TransactionModal';
import { InvoiceModal } from '../modals/InvoiceModal';
import { openAppLink } from '../modals/AppHandoff';

export function CustomerDrawer({ id }: { id: number }) {
  const { me } = useAuth();
  const ui = useUi();
  const q = useCustomer(id);
  const can = (s: string) => me!.permissions.sections.includes(s as never);

  if (q.isLoading) return <DrawerFrame header={<div className="grow"><h2>Customer</h2></div>}><Loading /></DrawerFrame>;
  if (!q.data) return <DrawerFrame header={<div className="grow"><h2>Customer</h2></div>}><Empty title="Customer not found">{(q.error as Error)?.message}</Empty></DrawerFrame>;
  const { customer: c, bookings, payments, invoices } = q.data;
  const recent = [...bookings].sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start)).slice(0, 6);

  return (
    <DrawerFrame
      header={
        <>
          <span className="av lg cust">{initials(c.name)}</span>
          <div className="grow">
            <Pill status={c.status}>{c.status} customer</Pill>
            <h2 style={{ marginTop: 6 }}>{c.name}</h2>
            <p className="tnum">{c.phone}{c.email && <> <span className="muted">|</span> {c.email}</>}</p>
          </div>
        </>
      }
    >
      <div className="stats4">
        <div><small>Total spent</small><b>{naira(c.spent)}</b></div>
        <div><small>Visits</small><b>{c.visits}</b></div>
        <div><small>Last visit</small><b>{agoText(c.last_visit)}</b></div>
        <div><small>Next booking</small><b>{c.next_booking ? relDate(c.next_booking.slice(0, 10)) : 'None'}</b></div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {can('bookings') && <button className="btn primary sm" onClick={() => { ui.closeDrawer(); ui.openModal(() => <BookingModal customerId={c.id} />); }}><Icon name="plus" />New booking</button>}
        {can('transactions') && <button className="btn sm" onClick={() => ui.openModal(() => <TransactionModal customerId={c.id} />)}><Icon name="plus" />Add transaction</button>}
        {can('invoices') && <button className="btn sm" onClick={() => ui.openModal(() => <InvoiceModal customerId={c.id} />)}><Icon name="plus" />Create invoice</button>}
      </div>
      <div className="sec">
        <h4>Appointments</h4>
        <ul className="minilist">
          {recent.length ? recent.map((b) => (
            <li key={b.id} className="click" onClick={() => ui.openDrawer({ type: 'booking', id: b.id })}>
              <div className="grow"><b>{b.service}</b><small>{relDate(b.date)}, {fmtTime(b.start)}{b.staff ? ' with ' + firstName(b.staff.name) : ''}</small></div>
              <Pill status={b.status} />
            </li>
          )) : <li className="none">No appointments yet</li>}
        </ul>
      </div>
      {can('transactions') && (
        <div className="sec">
          <h4>Transactions</h4>
          <ul className="minilist">
            {payments.length ? payments.slice(0, 5).map((t) => (
              <li key={t.id}><div className="grow"><b>{t.item || 'Payment'}</b><small>{relDate(t.date)}, {t.method}</small></div><b className="tnum">{naira(t.amount)}</b></li>
            )) : <li className="none">No transactions yet</li>}
          </ul>
        </div>
      )}
      {can('invoices') && (
        <div className="sec">
          <h4>Invoices</h4>
          <ul className="minilist">
            {invoices.length ? invoices.map((i) => (
              <li key={i.id} className="click" onClick={() => ui.openDrawer({ type: 'invoice', id: i.id })}>
                <div className="grow"><b>{i.number}</b><small>Due {fmtDate(i.due_date)}</small></div>
                <b className="tnum" style={{ marginRight: 6 }}>{naira(i.total)}</b>
                <Pill status={i.status} />
              </li>
            )) : <li className="none">No invoices</li>}
          </ul>
        </div>
      )}
      {c.notes && <div className="sec"><h4>Notes</h4><p style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{c.notes}</p></div>}
      <div className="note-app">
        <span className="ic"><Icon name="phone" /></span>
        <div><b>Want the full picture?</b> Visit patterns, preferences, rewards and messages for {firstName(c.name)} are on the Dara app. <button className="link" onClick={() => openAppLink(ui)}>Open Dara App</button></div>
      </div>
    </DrawerFrame>
  );
}
