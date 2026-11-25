import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBookings, useStaff } from '../api/hooks';
import type { Booking, Hours } from '../api/types';
import { STATUSES } from '../api/types';
import { useAuth } from '../auth/Auth';
import { Icon } from '../components/Icon';
import { useUi } from '../components/Ui';
import { Avatar, Empty, STATUS_VAR } from '../components/ui';
import { addDays, cap, firstName, fmtHour, fmtTime, iso, parseISO, slug, startOfWeek, today, todayDate } from '../lib/format';
import { BookingModal } from '../modals/BookingModal';

type Mode = 'day' | 'week' | 'month';
const HOUR_PX = 64;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Side-by-side lanes for overlapping bookings (from the prototype). */
export function lanes<T extends { start: number; duration: number }>(list: T[]): (T & { lane: number; lanes: number })[] {
  const s = list.slice().sort((a, b) => a.start - b.start || b.duration - a.duration);
  const out: (T & { lane: number; lanes: number })[] = [];
  let group: (T & { lane: number; lanes: number })[] = [];
  let gEnd = -1;
  const flush = () => {
    const ends: number[] = [];
    group.forEach((e) => {
      let i = ends.findIndex((x) => x <= e.start);
      if (i < 0) {
        i = ends.length;
        ends.push(0);
      }
      ends[i] = e.start + e.duration;
      e.lane = i;
    });
    group.forEach((e) => (e.lanes = ends.length));
    out.push(...group);
    group = [];
    gEnd = -1;
  };
  s.forEach((e) => {
    if (group.length && e.start >= gEnd) flush();
    group.push({ ...e, lane: 0, lanes: 1 });
    gEnd = Math.max(gEnd, e.start + e.duration);
  });
  if (group.length) flush();
  return out;
}

/** Calendar hours: 8 AM to 8 PM, widened to cover the branch's opening hours. */
export function dayWindow(hours: Hours[]): [number, number] {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const open = hours.filter((h) => h.is_open);
  const start = Math.min(8 * 60, ...open.map((h) => Math.floor(toMin(h.open) / 60) * 60));
  const end = Math.max(20 * 60, ...open.map((h) => Math.ceil(toMin(h.close) / 60) * 60));
  return [start, end];
}

export function Bookings() {
  const { me } = useAuth();
  const ui = useUi();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>((params.get('mode') as Mode) || 'week');
  const [date, setDate] = useState<Date>(params.get('date') ? parseISO(params.get('date')!) : todayDate());
  const [q, setQ] = useState('');
  const [staffFilter, setStaffFilter] = useState(params.get('staff') || 'all');
  const [statusFilter, setStatusFilter] = useState(params.get('status') || 'all');
  const bodyRef = useRef<HTMLDivElement>(null);

  const hours = me!.branch.opening_hours;
  const [DAY_START, DAY_END] = dayWindow(hours);
  const isClosed = (d: Date) => !hours.find((h) => h.day === WEEKDAYS[d.getDay()])?.is_open;

  useEffect(() => {
    sessionStorage.setItem('dara.cal.date', iso(date));
  }, [date]);

  // Date range to load for the current view
  const [from, to] = useMemo(() => {
    if (mode === 'day') return [iso(date), iso(date)];
    if (mode === 'week') {
      const ws = startOfWeek(date);
      return [iso(ws), iso(addDays(ws, 6))];
    }
    const gs = startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
    return [iso(gs), iso(addDays(gs, 41))];
  }, [mode, date]);

  const bookings = useBookings(from, to);
  const staffQ = useStaff();
  const staff = staffQ.data?.staff ?? [];

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (bookings.data ?? []).filter(
      (b) =>
        (staffFilter === 'all' || String(b.staff?.id) === staffFilter) &&
        (statusFilter === 'all' || b.status === statusFilter) &&
        (!needle || (b.customer.name + ' ' + b.service + ' ' + (b.staff?.name ?? '')).toLowerCase().includes(needle)),
    );
  }, [bookings.data, q, staffFilter, statusFilter]);

  const T = today();
  const title =
    mode === 'day'
      ? date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : mode === 'week'
        ? (() => {
            const ws = startOfWeek(date), we = addDays(ws, 6);
            return ws.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' – ' + we.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          })()
        : date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const move = (k: number) => {
    const x = new Date(date);
    if (mode === 'day') x.setDate(x.getDate() + k);
    else if (mode === 'week') x.setDate(x.getDate() + 7 * k);
    else {
      x.setDate(1);
      x.setMonth(x.getMonth() + k);
    }
    setDate(x);
  };

  const openBooking = (b: Booking) => ui.openDrawer({ type: 'booking', id: b.id });
  const bookSlot = (dateIso: string, e: React.MouseEvent<HTMLDivElement>, staffId?: number) => {
    if ((e.target as HTMLElement).closest('[data-booking]')) return;
    const r = e.currentTarget.getBoundingClientRect();
    let m = DAY_START + Math.floor(((e.clientY - r.top) / HOUR_PX) * 2) * 30;
    m = Math.min(Math.max(m, DAY_START), DAY_END - 30);
    ui.openModal(() => <BookingModal date={dateIso} start={m} staffId={staffId} />);
  };

  const H = ((DAY_END - DAY_START) / 60) * HOUR_PX;
  const gutter = (
    <div className="cg-gutter">
      {Array.from({ length: (DAY_END - DAY_START) / 60 }, (_, i) => DAY_START / 60 + i).map((h) => (
        <span key={h} style={{ top: ((h * 60 - DAY_START) / 60) * HOUR_PX }}>{fmtHour(h)}</span>
      ))}
    </div>
  );
  const nowLine = (d: string) => {
    if (d !== T) return null;
    const n = new Date(), m = n.getHours() * 60 + n.getMinutes();
    if (m < DAY_START || m > DAY_END) return null;
    return <div className="now" style={{ top: ((m - DAY_START) / 60) * HOUR_PX }} />;
  };
  const event = (a: Booking & { lane: number; lanes: number }, showStaff: boolean) => {
    const st = Math.max(a.start, DAY_START), en = Math.min(a.start + a.duration, DAY_END);
    if (en <= st) return null;
    const top = ((st - DAY_START) / 60) * HOUR_PX, h = ((en - st) / 60) * HOUR_PX - 2;
    const w = 100 / a.lanes, left = a.lane * w, v = STATUS_VAR[a.status];
    return (
      <button key={a.id} data-booking className={'ev st-' + slug(a.status) + (h < 46 ? ' compact' : '')} onClick={() => openBooking(a)}
        style={{ top, height: h, left: `calc(${left}% + 3px)`, width: `calc(${w}% - 6px)`, color: `var(--${v})`, backgroundColor: `var(--${v}-bg)` }}
        title={`${fmtTime(a.start)} ${a.customer.name}, ${a.service}${a.staff ? ' with ' + firstName(a.staff.name) : ''} (${a.status})`}>
        <span className="t">{fmtTime(a.start)}</span>
        <span className="n">{a.customer.name}</span>
        <span className="s">{a.service}</span>
        <span className="m">{showStaff && a.staff ? <span>{firstName(a.staff.name)}</span> : <span />}<em>{a.status}</em></span>
      </button>
    );
  };

  let body: React.ReactNode;
  if (mode === 'week') {
    const ws = startOfWeek(date), days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    body = (
      <div className="cg" style={{ ['--cols' as string]: 7, ['--hour' as string]: HOUR_PX + 'px' }}>
        <div className="cg-head">
          <div className="cg-corner" />
          {days.map((d) => {
            const s = iso(d), n = list.filter((a) => a.date === s && a.status !== 'Cancelled').length;
            return (
              <div key={s} className={'cg-dh' + (s === T ? ' is-today' : '')}>
                <span>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</span><strong>{d.getDate()}</strong>
                <span style={{ marginLeft: 'auto', fontWeight: 500 }}>{isClosed(d) ? 'Closed' : n ? n + ' booked' : ''}</span>
              </div>
            );
          })}
        </div>
        <div className="cg-body" style={{ height: H }}>
          {gutter}
          {days.map((d) => {
            const s = iso(d);
            return (
              <div key={s} className={'cg-col' + (isClosed(d) ? ' closed' : '') + (s === T ? ' is-today' : '')} onClick={(e) => bookSlot(s, e)}>
                {lanes(list.filter((a) => a.date === s)).map((a) => event(a, true))}
                {nowLine(s)}
              </div>
            );
          })}
        </div>
      </div>
    );
  } else if (mode === 'day') {
    const d = iso(date);
    let cols = staff.filter((s) => s.bookable && (s.active || list.some((a) => a.staff?.id === s.id && a.date === d)));
    // Staff without access to the staff list still see whoever appears in their bookings.
    if (!cols.length) {
      const seen = new Map<number, { id: number; name: string; color: string }>();
      list.forEach((a) => a.staff && seen.set(a.staff.id, a.staff));
      cols = [...seen.values()].map((s) => ({ ...s, bookable: true, active: true } as never));
    }
    if (staffFilter !== 'all') cols = cols.filter((s) => String(s.id) === staffFilter);
    body = !cols.length ? (
      <Empty title="No staff to show">Change the staff filter to see the calendar.</Empty>
    ) : (
      <div className="cg day" style={{ ['--cols' as string]: cols.length, ['--hour' as string]: HOUR_PX + 'px' }}>
        <div className="cg-head">
          <div className="cg-corner" />
          {cols.map((s) => {
            const n = list.filter((a) => a.date === d && a.staff?.id === s.id && a.status !== 'Cancelled').length;
            return (
              <div key={s.id} className="cg-dh staff">
                <Avatar name={s.name} color={s.color} size="sm" />
                <div><b>{s.name}</b><small>{n} {n === 1 ? 'booking' : 'bookings'}</small></div>
              </div>
            );
          })}
        </div>
        <div className="cg-body" style={{ height: H }}>
          {gutter}
          {cols.map((s) => (
            <div key={s.id} className={'cg-col' + (isClosed(date) ? ' closed' : '')} onClick={(e) => bookSlot(d, e, s.id)}>
              {lanes(list.filter((a) => a.date === d && a.staff?.id === s.id)).map((a) => event(a, false))}
              {nowLine(d)}
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    const first = new Date(date.getFullYear(), date.getMonth(), 1), gs = startOfWeek(first);
    body = (
      <div className="mg">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((x) => <div key={x} className="mg-h">{x}</div>)}
        {Array.from({ length: 42 }, (_, i) => {
          const day = addDays(gs, i), s = iso(day);
          const evs = list.filter((a) => a.date === s).sort((a, b) => a.start - b.start);
          return (
            <div key={s} className={'mc' + (day.getMonth() !== date.getMonth() ? ' out' : '') + (s === T ? ' is-today' : '')}
              onClick={(e) => { if (!(e.target as HTMLElement).closest('[data-booking]')) { setDate(day); setMode('day'); } }}>
              <span className="dn">{day.getDate()}</span>
              {evs.slice(0, 3).map((a) => {
                const v = STATUS_VAR[a.status];
                return (
                  <button key={a.id} data-booking className={'chip st-' + slug(a.status)} style={{ background: `var(--${v}-bg)`, color: `var(--${v})` }} onClick={() => openBooking(a)}>
                    <b>{fmtTime(a.start).replace(':00', '')}</b><span>{a.customer.name}</span>
                  </button>
                );
              })}
              {evs.length > 3 && <span className="more">+{evs.length - 3} more</span>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div className="cal-bar">
        <div className="cal-nav">
          <button className="btn" onClick={() => setDate(todayDate())}>Today</button>
          <div className="btn-pair">
            <button className="icon-btn" onClick={() => move(-1)} aria-label="Previous"><Icon name="chevL" /></button>
            <button className="icon-btn" onClick={() => move(1)} aria-label="Next"><Icon name="chevR" /></button>
          </div>
          <h2 className="cal-title">{title}</h2>
        </div>
        <div className="seg">
          {(['day', 'week', 'month'] as Mode[]).map((m) => (
            <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{cap(m)}</button>
          ))}
        </div>
      </div>
      <div className="cal-filters">
        <label className="search"><Icon name="search" /><input type="search" placeholder="Search customer, service or staff" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search bookings" /></label>
        <select className="sel" value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} aria-label="Filter by staff">
          <option value="all">All staff</option>
          {staff.filter((s) => s.bookable).map((s) => <option key={s.id} value={s.id}>{s.name}{s.active ? '' : ' (inactive)'}</option>)}
        </select>
        <select className="sel" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="legend">
          {[['Pending', 'pend'], ['Confirmed', 'conf'], ['In progress', 'prog'], ['Completed', 'done']].map(([l, v]) => (
            <span key={l}><i style={{ background: `var(--${v})` }} />{l}</span>
          ))}
        </div>
        <span className="grow" />
        <span className="hint">{bookings.isFetching ? 'Loading…' : 'Click an empty slot to book it'}</span>
      </div>
      <div className="cal" ref={bodyRef}>{bookings.error ? <Empty title="Could not load bookings">{(bookings.error as Error).message}</Empty> : body}</div>
    </>
  );
}
