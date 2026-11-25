import { useQueryClient } from '@tanstack/react-query';
import { useStaff } from '../api/hooks';
import { useAuth } from '../auth/Auth';
import { Icon } from '../components/Icon';
import { DrawerFrame, useUi } from '../components/Ui';
import { Empty, Pill } from '../components/Widgets';
import { canEdit, updateAppointment } from '../lib/bookings';
import { firstName, fmtDayLong, fmtDur, fmtTime, naira, relDate } from '../lib/format';
import { useBookingActions } from '../lib/useBookingActions';
import { useCachedBooking } from '../lib/useCachedBooking';

export function BookingDrawer({ id }: { id: string }) {
  const { me } = useAuth();
  const ui = useUi();
  const qc = useQueryClient();
  const b = useCachedBooking(id);
  const act = useBookingActions();
  const staff = useStaff();
  const canPay = me!.permissions.sections.includes('transactions');

  if (!b) return <DrawerFrame header={<div className="grow"><h2>Booking</h2></div>}><Empty title="Booking not found">It may have been removed. Close this and refresh.</Empty></DrawerFrame>;

  const idx = { Pending: 0, Confirmed: 0, 'In Progress': 1, Completed: 2, Cancelled: 0 }[b.status];
  const open = b.status === 'Confirmed' || b.status === 'Pending';
  const finished = b.status === 'Completed' || b.status === 'Cancelled';
  const editable = canEdit(b);

  const reassign = async (staffId: number) => {
    try {
      await updateAppointment(b, { staffId });
      await qc.invalidateQueries();
      ui.toast('Assigned to ' + firstName(staff.data?.staff.find((s) => s.id === staffId)?.name ?? ''));
    } catch (e) {
      ui.toast(e instanceof Error ? e.message : 'Could not reassign.');
    }
  };

  let primary = null;
  if (act.canStart(b)) primary = <button className="btn primary" onClick={() => act.start(b)}><Icon name="play" />Start job</button>;
  if (b.status === 'In Progress') primary = <button className="btn primary" onClick={() => act.complete(b)}><Icon name="check" />Complete</button>;
  if (b.status === 'Completed' && !b.paid && canPay) primary = <button className="btn primary" onClick={() => act.pay(b)}>Record payment</button>;

  const when = relDate(b.date);
  const pay = b.status === 'Completed'
    ? b.paid ? <span style={{ color: 'var(--done)' }}>Paid</span> : <span style={{ color: 'var(--pend)' }}>Not paid yet</span>
    : b.paid ? <span style={{ color: 'var(--done)' }}>Paid in advance</span> : <span className="muted" style={{ fontWeight: 500 }}>Collected after the job</span>;

  return (
    <DrawerFrame
      header={
        <div className="grow">
          <Pill status={b.status} />
          <h2>{b.customer.name}</h2>
          <p>{b.service}{b.staff ? ' with ' + firstName(b.staff.name) : ''}, {when.charAt(0).toUpperCase() + when.slice(1).toLowerCase()} at {fmtTime(b.start)}</p>
        </div>
      }
      footer={
        <>
          {(open || b.status === 'In Progress') && editable && <button className="btn" onClick={() => act.reschedule(b)}><Icon name="clock" />Reschedule</button>}
          {!finished && <button className="btn danger" onClick={() => act.cancel(b)}>Cancel</button>}
          <span className="primary-slot">
            {open && <button className="btn" disabled title="Start the job first">Complete</button>}
            {primary}
          </span>
        </>
      }
    >
      {b.status === 'Cancelled'
        ? <div className="track cancelled"><div>Booked</div><div>Cancelled</div><div /></div>
        : <div className="track">{['Booked', 'In progress', 'Completed'].map((l, i) => <div key={l} className={i < idx ? 'done' : i === idx ? 'cur' : ''}>{l}</div>)}</div>}
      <dl className="dl">
        <dt>Customer</dt>
        <dd><button className="link" onClick={() => ui.openDrawer({ type: 'customer', id: b.customer.id })}>{b.customer.name}</button><div className="muted tnum" style={{ fontWeight: 500, fontSize: 12.5 }}>{b.customer.phone}</div></dd>
        <dt>Service</dt><dd>{b.service}</dd>
        <dt>Staff</dt>
        <dd>
          {editable && staff.data && !finished ? (
            <select className="sel" value={b.staff?.id ?? ''} aria-label="Assigned staff" onChange={(e) => reassign(Number(e.target.value))}>
              {staff.data.staff.filter((s) => s.bookable && (s.active || s.id === b.staff?.id)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          ) : b.staff?.name ?? 'Not assigned'}
        </dd>
        <dt>Date</dt><dd>{fmtDayLong(b.date)}</dd>
        <dt>Time</dt><dd className="tnum">{fmtTime(b.start)} to {fmtTime(b.start + b.duration)} <span className="muted" style={{ fontWeight: 500 }}>({fmtDur(b.duration)})</span></dd>
        <dt>Price</dt><dd className="tnum">{naira(b.price)}</dd>
        <dt>Payment</dt><dd>{pay}</dd>
        <dt>Notes</dt><dd style={{ fontWeight: 500 }}>{b.notes || <span className="muted">No notes</span>}</dd>
        <dt>Booked via</dt><dd style={{ fontWeight: 500 }}>{b.type === 'order' ? 'WhatsApp or order' : 'Dara app'}</dd>
      </dl>
      {!editable && !finished && (
        <div className="note-app" style={{ borderStyle: 'solid', background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
          <span className="ic" style={{ color: 'var(--muted)' }}><Icon name="info" /></span>
          <div>This booking came in through WhatsApp. The customer reschedules it from WhatsApp, so the time and staff can't be changed here.</div>
        </div>
      )}
    </DrawerFrame>
  );
}
