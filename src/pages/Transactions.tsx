import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTransactions } from '../api/hooks';
import { Icon } from '../components/Icon';
import { useUi } from '../components/Ui';
import { ErrorBox, Loading } from '../components/ui';
import { METHODS } from '../lib/bookings';
import { naira, relDate } from '../lib/format';
import { TransactionModal } from '../modals/TransactionModal';

export function Transactions() {
  const ui = useUi();
  const [params] = useSearchParams();
  const [q, setQ] = useState('');
  const [range, setRange] = useState(params.get('range') || '30');
  const [method, setMethod] = useState('all');
  const t = useTransactions(range, method);

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (t.data?.transactions ?? []).filter((x) => !n || (x.customer.name + ' ' + x.item + ' ' + x.notes).toLowerCase().includes(n));
  }, [t.data, q]);
  const total = rows.reduce((s, x) => s + x.amount, 0);
  const by = (m: string) => rows.filter((x) => x.method === m).reduce((s, x) => s + x.amount, 0);

  return (
    <>
      <div className="strip">
        <div><small>Total received</small><strong>{naira(total)}</strong></div>
        <div><small>Transactions</small><strong>{rows.length}</strong></div>
        {METHODS.map((m) => <div key={m}><small>{m}</small><strong>{naira(by(m))}</strong></div>)}
      </div>
      <div className="toolbar">
        <label className="search"><Icon name="search" /><input type="search" placeholder="Search customer or item" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search transactions" /></label>
        <select className="sel" value={range} onChange={(e) => setRange(e.target.value)} aria-label="Filter by date">
          {[['today', 'Today'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['all', 'All time']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="sel" value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Filter by payment method">
          <option value="all">All payment methods</option>
          {[...METHODS, 'Online'].map((m) => <option key={m}>{m}</option>)}
        </select>
        <span className="grow" />
        <button className="btn primary" onClick={() => ui.openModal(() => <TransactionModal />)}><Icon name="plus" />Add transaction</button>
      </div>
      <section className="panel">
        {t.isLoading ? <Loading /> : t.error ? <ErrorBox error={t.error} retry={() => t.refetch()} /> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Customer</th><th>Service or product</th><th>Payment method</th><th>Notes</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {rows.length ? rows.map((x) => (
                  <tr key={x.id} className={x.customer.id ? 'click' : ''} onClick={() => x.customer.id && ui.openDrawer({ type: 'customer', id: x.customer.id })}>
                    <td style={{ whiteSpace: 'nowrap' }}>{relDate(x.date)}</td>
                    <td><b style={{ fontWeight: 600 }}>{x.customer.name}</b></td>
                    <td>{x.item}</td>
                    <td>{x.method}</td>
                    <td className="muted">{x.notes}</td>
                    <td className="num strong">{naira(x.amount)}</td>
                  </tr>
                )) : <tr><td colSpan={6}><div className="empty"><b>No transactions in this range</b>Change the date or payment method filter.</div></td></tr>}
              </tbody>
            </table>
            {t.data?.truncated && <p className="hint" style={{ padding: 12 }}>Showing the latest 500. Narrow the date range to see older ones.</p>}
          </div>
        )}
      </section>
    </>
  );
}
