import { useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/Auth';
import { DrawerState, UiProvider, useUi } from './components/Ui';
import { Icon } from './components/Icon';
import { useDashboard, useInvoices } from './api/hooks';
import type { Section } from './api/types';
import { initials, today } from './lib/format';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Bookings } from './pages/Bookings';
import { Customers } from './pages/Customers';
import { Transactions } from './pages/Transactions';
import { Invoices } from './pages/Invoices';
import { Catalog } from './pages/Catalog';
import { Staff } from './pages/Staff';
import { Training } from './pages/Training';
import { Inventory } from './pages/Inventory';
import { Settings } from './pages/Settings';
import { BookingDrawer } from './drawers/BookingDrawer';
import { CustomerDrawer } from './drawers/CustomerDrawer';
import { InvoiceDrawer } from './drawers/InvoiceDrawer';
import { ArticleDrawer } from './drawers/ArticleDrawer';
import { BookingModal } from './modals/BookingModal';
import { openAppLink } from './modals/AppHandoff';

const NAV: [Section, string, string][] = [
  ['dashboard', 'Dashboard', 'grid'], ['bookings', 'Bookings', 'calendar'], ['customers', 'Customers', 'users'],
  ['transactions', 'Transactions', 'swap'], ['invoices', 'Invoices', 'file'], ['catalog', 'Catalog', 'tag'],
  ['staff', 'Staff', 'staff'], ['training', 'Staff Training', 'cap'], ['inventory', 'Inventory', 'box'], ['settings', 'Settings', 'sliders'],
];

export const TITLES: Record<Section, [string, string]> = {
  dashboard: ['Dashboard', ''],
  bookings: ['Bookings', 'Every appointment across your team'],
  customers: ['Customers', 'Contact details, visits and spend'],
  transactions: ['Transactions', 'Money received at the counter'],
  invoices: ['Invoices', 'Bills sent to customers and companies'],
  catalog: ['Catalog', 'Services and products you sell'],
  staff: ['Staff', 'Your team and who is working today'],
  training: ['Staff Training', 'Articles and courses from Dara Academy'],
  inventory: ['Inventory', 'Stock levels, synced from the Dara app'],
  settings: ['Settings', 'Business, branch and account'],
};

function renderDrawer(d: DrawerState) {
  switch (d.type) {
    case 'booking': return <BookingDrawer id={d.id} />;
    case 'customer': return <CustomerDrawer id={d.id} />;
    case 'invoice': return <InvoiceDrawer id={d.id} />;
    case 'article': return <ArticleDrawer id={d.id} learner={d.learner} />;
  }
}

export function App() {
  const { me, ready } = useAuth();
  if (!ready) return null;
  if (!me) return <Login />;
  return (
    <UiProvider renderDrawer={renderDrawer}>
      <Shell />
    </UiProvider>
  );
}

function Shell() {
  const { me, logout } = useAuth();
  const ui = useUi();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const sections = me!.permissions.sections;
  const can = (s: Section) => sections.includes(s);

  const section = (location.pathname.split('/')[1] || 'dashboard') as Section;
  const [title, sub] = TITLES[section] ?? TITLES.dashboard;

  const dash = useDashboard();
  const invoices = useInvoices(can('invoices'));
  const todayCount = dash.data?.kpis.bookings_today;
  const overdue = invoices.data?.invoices.filter((i) => i.status === 'Overdue').length ?? 0;

  const newBooking = () => {
    ui.closeDrawer();
    ui.openModal(() => <BookingModal date={section === 'bookings' ? sessionStorage.getItem('dara.cal.date') || today() : today()} />);
  };

  // "N" opens a new booking (from the prototype)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag) || ui.modalOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key === 'n' || e.key === 'N') && can('bookings')) {
        e.preventDefault();
        newBooking();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    setMenuOpen(false);
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  const todayLabel = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div id="app" className="app">
      <aside className={'sidebar' + (menuOpen ? ' open' : '')} id="sidebar">
        <div className="sb-top">
          <div className="logo">
            <svg className="mk" width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" /><path d="M11 9h5a7 7 0 0 1 0 14h-5z" fill="none" strokeWidth="3" /></svg>dara
          </div>
          <div className="biz">
            <span className="av">{initials(me!.business.name)}</span>
            <div><b>{me!.business.name}</b><small>{me!.branch.name}</small></div>
          </div>
        </div>
        <nav className="nav" aria-label="Main">
          {NAV.filter(([s]) => can(s)).map(([s, label, icon]) => (
            <NavLink key={s} to={'/' + s} className={({ isActive }) => (isActive ? 'on' : '')}>
              <Icon name={icon} />
              {label}
              {s === 'bookings' && todayCount !== undefined && <span className="badge" title="Bookings today">{todayCount}</span>}
              {s === 'invoices' && overdue > 0 && <span className="badge alert" title="Overdue invoices">{overdue}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sb-app">
          <b><Icon name="phone" />On your phone</b>
          <p>Customer insights, rewards, campaigns and messages live on the Dara app.</p>
          <button className="btn sm soft" onClick={() => openAppLink(ui)}>Open Dara App</button>
        </div>
        <div className="sb-user">
          <span className="av sm" style={{ background: '#1F4FE0' }}>{initials(me!.user.name)}</span>
          <div><b>{me!.user.name}</b><small>{me!.user.role_label}</small></div>
          <button className="icon-btn bare" onClick={logout} title="Log out" aria-label="Log out"><Icon name="logout" /></button>
        </div>
      </aside>
      <div className={'scrim' + (menuOpen ? ' show' : '')} onClick={() => setMenuOpen(false)} />
      <div className="main" id="main" ref={mainRef} onScroll={(e) => e.currentTarget.classList.toggle('scrolled', e.currentTarget.scrollTop > 4)}>
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <div>
            <h1>{title}</h1>
            <p>{section === 'dashboard' ? new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : sub}</p>
          </div>
          <div className="top-actions">
            <span className="today-chip"><Icon name="calendar" />{todayLabel}</span>
            {can('bookings') && (
              <button className="btn primary" onClick={newBooking} title="New booking (press N)">
                <Icon name="plus" /><span className="lbl">New booking</span> <kbd className="lbl">N</kbd>
              </button>
            )}
          </div>
        </header>
        <div className="view" id="view">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            {can('dashboard') && <Route path="/dashboard" element={<Dashboard />} />}
            {can('bookings') && <Route path="/bookings" element={<Bookings />} />}
            {can('customers') && <Route path="/customers" element={<Customers />} />}
            {can('transactions') && <Route path="/transactions" element={<Transactions />} />}
            {can('invoices') && <Route path="/invoices" element={<Invoices />} />}
            {can('catalog') && <Route path="/catalog" element={<Catalog />} />}
            {can('staff') && <Route path="/staff" element={<Staff />} />}
            {can('training') && <Route path="/training" element={<Training />} />}
            {can('inventory') && <Route path="/inventory" element={<Inventory />} />}
            {can('settings') && <Route path="/settings" element={<Settings />} />}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
