import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCustomers } from '../api/hooks';
import { Icon } from '../components/Icon';
import { useUi } from '../components/Ui';
import { ErrorBox, Loading, Pill } from '../components/Widgets';
import { agoText, initials, naira } from '../lib/format';
import { CustomerModal } from '../modals/CustomerModal';

export function Customers() {
  const ui = useUi();
  const [params] = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(params.get('status') || 'all');
  const c = useCustomers();

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (c.data ?? []).filter((x) => (status === 'all' || x.status === status) && (!n || (x.name + ' ' + x.phone + ' ' + x.email).toLowerCase().includes(n)));
  }, [c.data, q, status]);

  return (
    <>
      <div className="toolbar">
        <label className="search"><Icon name="search" /><input type="search" placeholder="Search name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" /></label>
        <select className="sel" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter customers">
          <option value="all">All customers</option>
          {['Active', 'New', 'Inactive'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <span className="grow" />
        <span className="hint">{c.data ? `${rows.length} of ${c.data.length} customers` : ''}</span>
        <button className="btn primary" onClick={() => ui.openModal(() => <CustomerModal />)}><Icon name="plus" />Add customer</button>
      </div>
      <section className="panel">
        {c.isLoading ? <Loading /> : c.error ? <ErrorBox error={c.error} retry={() => c.refetch()} /> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Customer</th><th>Phone</th><th>Last visit</th><th className="num">Total spent</th><th className="num">Appointments</th><th>Status</th><th /></tr></thead>
              <tbody>
                {rows.length ? rows.map((x) => (
                  <tr key={x.id} className="click" tabIndex={0} onClick={() => ui.openDrawer({ type: 'customer', id: x.id })}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && ui.openDrawer({ type: 'customer', id: x.id })}>
                    <td><div className="who"><span className="av cust">{initials(x.name)}</span><div><b>{x.name}</b><small>{x.email}</small></div></div></td>
                    <td className="tnum">{x.phone}</td>
                    <td>{agoText(x.last_visit)}</td>
                    <td className="num strong">{naira(x.spent)}</td>
                    <td className="num">{x.appointments}</td>
                    <td><Pill status={x.status} /></td>
                    <td className="actions"><button className="btn sm">View</button></td>
                  </tr>
                )) : <tr><td colSpan={7}><div className="empty"><b>No customers match</b>Try another name or phone number, or add a new customer.</div></td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
