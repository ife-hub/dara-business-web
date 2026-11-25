import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInvoices } from '../api/hooks';
import type { Invoice } from '../api/types';
import { Icon } from '../components/Icon';
import { useUi } from '../components/Ui';
import { ErrorBox, Loading, Pill } from '../components/ui';
import { fmtDate, naira } from '../lib/format';
import { InvoiceModal } from '../modals/InvoiceModal';
import { MarkPaidModal } from '../modals/PaymentModal';

export function Invoices() {
  const ui = useUi();
  const [params] = useSearchParams();
  const [status, setStatus] = useState(params.get('status') || 'all');
  const [q, setQ] = useState('');
  const inv = useInvoices();
  const all = inv.data?.invoices ?? [];
  const cnt = (s: string) => all.filter((i) => s === 'all' || i.status === s).length;

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return all.filter((i) => (status === 'all' || i.status === status) && (!n || (i.number + ' ' + i.customer.name).toLowerCase().includes(n)));
  }, [all, q, status]);

  const markPaid = (i: Invoice) => ui.openModal(() => <MarkPaidModal invoice={i} />);

  return (
    <>
      <div className="strip">
        <div><small>Outstanding</small><strong>{naira(inv.data?.totals.outstanding ?? 0)}</strong></div>
        <div><small>Overdue</small><strong style={{ color: 'var(--over)' }}>{naira(inv.data?.totals.overdue ?? 0)}</strong></div>
        <div><small>Paid, last 30 days</small><strong>{naira(inv.data?.totals.paid_30_days ?? 0)}</strong></div>
        <div><small>Invoices</small><strong>{inv.data?.totals.count ?? 0}</strong></div>
      </div>
      <div className="toolbar">
        <div className="seg" role="tablist">
          {[['all', 'All'], ['Pending', 'Pending'], ['Overdue', 'Overdue'], ['Paid', 'Paid']].map(([v, l]) => (
            <button key={v} className={status === v ? 'on' : ''} onClick={() => setStatus(v)}>{l} <span className="ct">{cnt(v)}</span></button>
          ))}
        </div>
        <label className="search"><Icon name="search" /><input type="search" placeholder="Search invoice number or customer" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search invoices" /></label>
        <span className="grow" />
        <button className="btn primary" onClick={() => ui.openModal(() => <InvoiceModal />)}><Icon name="plus" />Create invoice</button>
      </div>
      <section className="panel">
        {inv.isLoading ? <Loading /> : inv.error ? <ErrorBox error={inv.error} retry={() => inv.refetch()} /> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Invoice</th><th>Customer</th><th className="num">Amount</th><th>Date</th><th>Due date</th><th>Status</th><th /></tr></thead>
              <tbody>
                {list.length ? list.map((i) => (
                  <tr key={i.id} className="click" tabIndex={0} onClick={() => ui.openDrawer({ type: 'invoice', id: i.id })}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && ui.openDrawer({ type: 'invoice', id: i.id })}>
                    <td className="strong tnum">{i.number}</td>
                    <td>{i.customer.name}</td>
                    <td className="num strong">{naira(i.total)}</td>
                    <td>{fmtDate(i.date)}</td>
                    <td>{fmtDate(i.due_date)}{i.status === 'Overdue' && <> <small style={{ color: 'var(--over)', fontWeight: 600 }}>{i.days_late}d late</small></>}</td>
                    <td><Pill status={i.status} /></td>
                    <td className="actions" onClick={(e) => e.stopPropagation()}>
                      {i.status !== 'Paid' && <><button className="btn sm" onClick={() => markPaid(i)}>Mark as paid</button> </>}
                      <button className="btn sm" onClick={() => ui.openDrawer({ type: 'invoice', id: i.id })}>View</button>
                    </td>
                  </tr>
                )) : <tr><td colSpan={7}><div className="empty"><b>No invoices here</b>Create an invoice to bill a customer or company.</div></td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
