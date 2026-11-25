import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBookings, useStaff } from '../api/hooks';
import type { Booking } from '../api/types';
import { useAuth } from '../auth/Auth';
import { Modal, useUi } from '../components/Ui';
import { conflictFor, updateAppointment } from '../lib/bookings';
import { firstName, fmtTime, relDate, today } from '../lib/format';
import { dayWindow } from '../pages/Bookings';

export function RescheduleModal({ booking: b }: { booking: Booking }) {
  const { me } = useAuth();
  const ui = useUi();
  const qc = useQueryClient();
  const staffQ = useStaff();
  const bookable = (staffQ.data?.staff ?? []).filter((s) => s.active && s.bookable);
  const [DAY_START, DAY_END] = dayWindow(me!.branch.opening_hours);
  const [date, setDate] = useState(b.date);
  const [start, setStart] = useState(b.start);
  const [staffId, setStaffId] = useState(b.staff?.id ?? 0);
  const [warn, setWarn] = useState('');
  const [busy, setBusy] = useState(false);
  const day = useBookings(date, date);
  const clash = useMemo(() => conflictFor(day.data ?? [], { staffId, date, start, duration: b.duration }, b.id), [day.data, staffId, date, start, b]);

  const times: number[] = [];
  for (let m = DAY_START; m < DAY_END; m += 30) times.push(m);

  const save = async () => {
    if (clash) return setWarn(`${firstName(bookable.find((s) => s.id === staffId)?.name ?? '')} is booked with ${clash.customer.name} at ${fmtTime(clash.start)}. Pick another time or staff member.`);
    setBusy(true);
    try {
      await updateAppointment(b, { date, start, staffId: staffId !== b.staff?.id ? staffId : undefined });
      await qc.invalidateQueries();
      ui.closeModal();
      ui.toast(`Rescheduled to ${relDate(date)} at ${fmtTime(start)}`);
    } catch (e) {
      setWarn(e instanceof Error ? e.message : 'Could not reschedule.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Reschedule booking" sub={`${b.customer.name}, ${b.service}`} size="narrow"
      footer={<><button className="btn" onClick={ui.closeModal}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>Save new time</button></>}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); save(); }} onChange={() => setWarn('')}>
        <div className="field"><label>Date</label><input type="date" value={date} min={today()} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="grid2">
          <div className="field"><label>Time</label><select value={start} onChange={(e) => setStart(Number(e.target.value))}>{times.map((m) => <option key={m} value={m}>{fmtTime(m)}</option>)}</select></div>
          <div className="field"><label>Staff</label><select value={staffId} onChange={(e) => setStaffId(Number(e.target.value))}>{bookable.map((s) => <option key={s.id} value={s.id}>{firstName(s.name)}</option>)}</select></div>
        </div>
        <p className="hint">The customer and staff get an email with the new time, and reminders move with it.</p>
        {warn && <p className="warn">{warn}</p>}
      </form>
    </Modal>
  );
}
