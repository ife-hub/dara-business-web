import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../api/hooks';
import { useAuth } from '../auth/Auth';
import { Icon } from '../components/Icon';
import { useUi } from '../components/Ui';
import { Avatar, ErrorBox, Loading, Pill } from '../components/Widgets';
import { fmtDur, fmtTime, firstName, greeting, naira, slug } from '../lib/format';
import { useBookingActions } from '../lib/useBookingActions';
import { BookingModal } from '../modals/BookingModal';
import { CustomerModal } from '../modals/CustomerModal';
import { TransactionModal } from '../modals/TransactionModal';
import { InvoiceModal } from '../modals/InvoiceModal';

export function Dashboard() {
  const { me } = useAuth();
  const ui = useUi();
  const nav = useNavigate();
  const q = useDashboard();
  const act = useBookingActions();
  const can = (s: string) => me!.permissions.sections.includes(s as never);

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorBox error={q.error} retry={() => q.refetch()} />;
  const d = q.data;
  const k = d.kpis;

  const kpi = (label: string, val: string | number, sub: string, go: string, hl?: boolean) => (
    <button className={'kpi ' + (hl ? 'hl' : '')} onClick={() => nav(go)}>
      <small>{label}</small>
      <strong className={String(val).startsWith('₦') ? 'money' : ''}>{val}</strong>
      <span>{sub}</span>
    </button>
  );

  const attentionStyle: Record<string, [string, string, () => void]> = {
    unpaid_jobs: ['var(--prog-bg)', 'var(--prog)', () => {
      const id = d.attention.find((a) => a.kind === 'unpaid_jobs')?.booking_id;
      if (id) ui.openDrawer({ type: 'booking', id });
    }],
    overdue_invoices: ['var(--over-bg)', 'var(--over)', () => nav('/invoices?status=Overdue')],
    pending_bookings: ['var(--pend-bg)', 'var(--pend)', () => nav('/bookings?status=Pending&mode=week')],
    low_stock: ['var(--blue-soft)', 'var(--blue)', () => nav('/inventory?low=1')],
  };

  return (
    <>
      <section className="dash-head">
        <div>
          <h2 className="greet">{greeting()}, {firstName(me!.user.name) || d.first_name}</h2>
          <p className="muted">
            {k.bookings_today} bookings today. {k.in_progress ? `${k.in_progress} in the chair right now, ` : ''}{k.remaining_today} still to come.
          </p>
        </div>
        <div className="quick">
          {can('bookings') && <button className="btn primary" onClick={() => ui.openModal(() => <BookingModal />)}><Icon name="plus" />New booking</button>}
          {can('customers') && <button className="btn" onClick={() => ui.openModal(() => <CustomerModal />)}><Icon name="plus" />Add customer</button>}
          {can('transactions') && <button className="btn" onClick={() => ui.openModal(() => <TransactionModal />)}><Icon name="plus" />Add transaction</button>}
          {can('invoices') && <button className="btn" onClick={() => ui.openModal(() => <InvoiceModal />)}><Icon name="plus" />Create invoice</button>}
        </div>
      </section>

      <section className="kpis" aria-label="Today at a glance">
        {kpi("Today's bookings", k.bookings_today, k.remaining_today + ' still to come', '/bookings?mode=day', true)}
        {kpi('Upcoming bookings', k.upcoming_7_days, 'Next 7 days', '/bookings?mode=week')}
        {kpi('Jobs in progress', k.in_progress, k.in_progress ? k.in_progress_names.join(', ') : 'None right now', '/bookings?mode=day')}
        {kpi('Completed jobs', k.completed_today, 'Today', '/bookings?mode=day')}
        {can('transactions') && kpi("Today's revenue", naira(k.revenue_today), k.payments_today + ' payments received', '/transactions?range=today')}
        {can('invoices') && kpi('Outstanding invoices', naira(k.outstanding_amount), `${k.outstanding_count} unpaid, ${k.overdue_count} overdue`, '/invoices')}
        {kpi('New customers', k.new_customers_7_days, 'Last 7 days', '/customers?status=New')}
      </section>

      <div className="dash-grid">
        <section className="panel">
          <header className="panel-h"><h3>Today's schedule</h3><button className="link" onClick={() => nav('/bookings?mode=day')}>Open day view</button></header>
          <ol className="sched">
            {d.today.length ? d.today.map((b) => (
              <li key={b.id} className={'is-' + slug(b.status)} tabIndex={0}
                onClick={() => ui.openDrawer({ type: 'booking', id: b.id })}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && ui.openDrawer({ type: 'booking', id: b.id })}>
                <time>{fmtTime(b.start)}<small>{fmtDur(b.duration)}</small></time>
                <span className="bar" />
                <div className="who">
                  {b.staff ? <Avatar name={b.staff.name} color={b.staff.color} size="sm" /> : <span className="av sm" />}
                  <div style={{ minWidth: 0 }}><b>{b.customer.name}</b><small>{b.service}{b.staff ? ' with ' + firstName(b.staff.name) : ''}</small></div>
                </div>
                <Pill status={b.status} />
                <span onClick={(e) => e.stopPropagation()}>
                  {act.canStart(b) ? <button className="btn sm" onClick={() => act.start(b)}><Icon name="play" />Start</button>
                    : b.status === 'In Progress' ? <button className="btn sm primary" onClick={() => act.complete(b)}><Icon name="check" />Complete</button>
                    : b.status === 'Completed' && !b.paid && can('transactions') ? <button className="btn sm soft" onClick={() => act.pay(b)}>Record payment</button>
                    : <span className="muted small" style={{ width: 74, textAlign: 'right', display: 'inline-block' }}>{naira(b.price)}</span>}
                </span>
              </li>
            )) : <li className="empty" style={{ display: 'block' }}><b>No bookings today</b>Add one to fill the calendar.</li>}
          </ol>
        </section>

        <div className="dash-side">
          <section className="panel">
            <header className="panel-h"><h3>Needs your attention</h3></header>
            <ul className="att">
              {d.attention.length ? d.attention.map((a) => {
                const [bg, fg, go] = attentionStyle[a.kind];
                const detail = a.kind === 'overdue_invoices' ? naira(a.amount ?? 0) + ' waiting to be collected' : a.detail;
                return (
                  <li key={a.kind}>
                    <button onClick={go}>
                      <span className="dot" style={{ background: bg, color: fg }}>{a.count}</span>
                      <span style={{ minWidth: 0 }}><b>{a.title}</b><small>{detail}</small></span>
                      <span className="chev"><Icon name="chevR" /></span>
                    </button>
                  </li>
                );
              }) : <li className="empty">Nothing needs you right now.</li>}
            </ul>
          </section>

          <section className="panel">
            <header className="panel-h"><h3>Staff today</h3>{can('staff') && <button className="link" onClick={() => nav('/staff')}>Manage staff</button>}</header>
            <ul className="load">
              {d.staff.map((s) => (
                <li key={s.id}>
                  <Avatar name={s.name} color={s.color} size="sm" />
                  <div>
                    <b>{firstName(s.name)}</b> <small>{s.role}</small>
                    <div className="meter"><i style={{ width: Math.min(100, Math.round((s.minutes / 600) * 100)) + '%', background: s.color }} /></div>
                  </div>
                  <small>{s.bookings} {s.bookings === 1 ? 'booking' : 'bookings'}{s.minutes ? ', ' + fmtDur(s.minutes) : ''}</small>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
