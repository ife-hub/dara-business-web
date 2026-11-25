import { useState } from 'react';
import { useCatalog } from '../api/hooks';
import { useAuth } from '../auth/Auth';
import { Icon } from '../components/Icon';
import { useUi } from '../components/Ui';
import { ErrorBox, Loading } from '../components/Widgets';
import { fmtDur, naira } from '../lib/format';
import { CatalogModal } from '../modals/CatalogModal';

export function Catalog() {
  const { me } = useAuth();
  const ui = useUi();
  const [tab, setTab] = useState<'services' | 'products'>('services');
  const [q, setQ] = useState('');
  const c = useCatalog();
  const isSvc = tab === 'services';
  const owner = me!.user.role === 'owner';
  const n = q.trim().toLowerCase();
  const list = (c.data?.[tab] ?? []).filter((x) => !n || (x.name + ' ' + x.category).toLowerCase().includes(n));

  return (
    <>
      <div className="toolbar">
        <div className="seg" role="tablist">
          <button className={isSvc ? 'on' : ''} onClick={() => { setTab('services'); setQ(''); }}>Services <span className="ct">{c.data?.services.length ?? 0}</span></button>
          <button className={!isSvc ? 'on' : ''} onClick={() => { setTab('products'); setQ(''); }}>Products <span className="ct">{c.data?.products.length ?? 0}</span></button>
        </div>
        <label className="search"><Icon name="search" /><input type="search" placeholder={'Search ' + tab} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search catalog" /></label>
        <span className="grow" />
        {owner && (isSvc
          ? <button className="btn primary" onClick={() => ui.openModal(() => <CatalogModal kind="service" />)}><Icon name="plus" />Add service</button>
          : <button className="btn primary" onClick={() => ui.openModal(() => <CatalogModal kind="product" />)}><Icon name="plus" />Add product</button>)}
      </div>
      <section className="panel">
        {c.isLoading ? <Loading /> : c.error ? <ErrorBox error={c.error} retry={() => c.refetch()} /> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Name</th><th>Category</th><th className="num">Price</th>{isSvc && <><th className="num">Duration</th><th className="num">Booked, last 30 days</th></>}</tr></thead>
              <tbody>
                {list.length ? list.map((x) => (
                  <tr key={x.id}>
                    <td className="strong">{x.name}{!x.is_active && <span className="muted"> (hidden)</span>}</td>
                    <td>{x.category}</td>
                    <td className="num strong">{naira(x.price)}</td>
                    {isSvc && <><td className="num">{fmtDur(x.duration ?? 0)}</td><td className="num">{x.booked_30_days ?? 0}</td></>}
                  </tr>
                )) : <tr><td colSpan={5}><div className="empty"><b>Nothing found</b>Try another name or add a new item.</div></td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
