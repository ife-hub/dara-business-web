import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInventory } from '../api/hooks';
import { Icon } from '../components/Icon';
import { useUi } from '../components/Ui';
import { ErrorBox, Loading, Pill } from '../components/ui';
import { AppHandoffModal } from '../modals/AppHandoff';

export function Inventory() {
  const ui = useUi();
  const [params] = useSearchParams();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [low, setLow] = useState(params.get('low') === '1');
  const inv = useInventory();
  const items = inv.data?.items ?? [];
  const cats = [...new Set(items.map((x) => x.category))];

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return items.filter((x) => (cat === 'all' || x.category === cat) && (!low || x.status !== 'In stock') && (!n || x.name.toLowerCase().includes(n)));
  }, [items, q, cat, low]);

  const edit = () => ui.openModal(() => <AppHandoffModal />);
  const synced = inv.data?.synced_at ? new Date(inv.data.synced_at) : null;

  return (
    <>
      <div className="banner">
        <span className="ic"><Icon name="phone" /></span>
        <div className="grow"><b>You are viewing stock levels.</b> Counts, restocks and adjustments are made on the Dara app and sync here.</div>
        <button className="btn" onClick={edit}><Icon name="edit" />Edit inventory</button>
      </div>
      <div className="toolbar">
        <label className="search"><Icon name="search" /><input type="search" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search inventory" /></label>
        <select className="sel" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button className={'btn ' + (low ? 'soft' : '')} aria-pressed={low} onClick={() => setLow(!low)}>
          Low stock <span className="pill st-low-stock" style={{ height: 20, padding: '0 7px' }}>{inv.data?.low_count ?? 0}</span>
        </button>
        <span className="grow" />
        {synced && <span className="hint">Last updated from the Dara app {synced.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} at {synced.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>}
      </div>
      <section className="panel">
        {inv.isLoading ? <Loading /> : inv.error ? <ErrorBox error={inv.error} retry={() => inv.refetch()} /> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Product</th><th>Category</th><th>Current quantity</th><th>Unit</th><th>Reorder at</th><th>Status</th><th /></tr></thead>
              <tbody>
                {list.length ? list.map((x) => {
                  const pct = Math.min(100, Math.round((x.quantity / Math.max(1, x.reorder * 3)) * 100));
                  return (
                    <tr key={x.id}>
                      <td className="strong">{x.name}</td>
                      <td>{x.category}</td>
                      <td><div className="stock"><b className="tnum" style={{ minWidth: 28 }}>{x.quantity}</b><span className="bar"><i className={x.status === 'Out of stock' ? 'out' : x.status === 'Low stock' ? 'low' : ''} style={{ width: Math.max(pct, x.status === 'Out of stock' ? 0 : 4) + '%' }} /></span></div></td>
                      <td>{x.unit}</td>
                      <td className="tnum muted">{x.reorder}</td>
                      <td><Pill status={x.status} /></td>
                      <td className="actions"><button className="btn sm" onClick={edit}>Edit</button></td>
                    </tr>
                  );
                }) : <tr><td colSpan={7}><div className="empty"><b>No products match</b>{items.length ? 'Clear the filters to see all stock.' : 'Add products and stock counts on the Dara app.'}</div></td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
