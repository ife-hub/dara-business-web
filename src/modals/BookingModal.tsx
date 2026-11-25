import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { post } from '../api/client';
import { useBookings, useCatalog, useCustomers, useStaff } from '../api/hooks';
import { useAuth } from '../auth/Auth';
import { Icon } from '../components/Icon';
import { Modal, useUi } from '../components/Ui';
import { conflictFor } from '../lib/bookings';
import { firstName, fmtDur, fmtTime, relDate, toHHMM, today } from '../lib/format';
import { dayWindow } from '../pages/Bookings';
import { CustomerModal } from './CustomerModal';

export interface BookingDraft { customerId?: number; serviceId?: number; staffId?: number; date?: string; start?: number; notes?: string }

export function BookingModal(p: BookingDraft) {
  const { me } = useAuth();
  const ui = useUi();
  const qc = useQueryClient();
  const customers = useCustomers();
  const catalog = useCatalog();
  const staffQ = useStaff();
  const services = (catalog.data?.services ?? []).filter((s) => s.is_active);
  const bookable = (staffQ.data?.staff ?? []).filter((s) => s.active && s.bookable);
  const [DAY_START, DAY_END] = dayWindow(me!.branch.opening_hours);

  const [customerId, setCustomerId] = useState<number | ''>(p.customerId ?? '');
  const [serviceId, setServiceId] = useState<number | ''>(p.serviceId ?? '');
  const [staffId, setStaffId] = useState<number | ''>(p.staffId ?? '');
  const [date, setDate] = useState(p.date ?? today());
  const [start, setStart] = useState(p.start ?? 600);
  const [notes, setNotes] = useState(p.notes ?? '');
  const [warn, setWarn] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (serviceId === '' && services[0]) setServiceId(services[0].id); }, [services, serviceId]);
  useEffect(() => { if (staffId === '' && bookable[0]) setStaffId(bookable[0].id); }, [bookable, staffId]);
  useEffect(() => { if (customerId === '' && customers.data?.[0]) setCustomerId([...customers.data].sort((a, b) => a.name.localeCompare(b.name))[0].id); }, [customers.data, customerId]);
  useEffect(() => setWarn(''), [serviceId, staffId, date, start]);

  const svc = services.find((s) => s.id === serviceId);
  const duration = svc?.duration ?? 60;
  const dayBookings = useBookings(date, date);
  const clash = useMemo(
    () => (staffId ? conflictFor(dayBookings.data ?? [], { staffId: Number(staffId), date, start, duration }) : undefined),
    [dayBookings.data, staffId, date, start, duration],
  );

  const times: number[] = [];
  for (let m = DAY_START; m < DAY_END; m += 30) times.push(m);
  const customerOptions = [...(customers.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  const save = async () => {
    if (!customerId) return setWarn('Choose a customer, or add a new one.');
    if (!serviceId) return setWarn('Choose a service. Add services in Catalog first if the list is empty.');
    if (!staffId) return setWarn('Choose who will do this booking.');
    if (!date) return setWarn('Choose a date for this booking.');
    if (clash) return setWarn(`${firstName(bookable.find((s) => s.id === staffId)?.name ?? '')} already has ${clash.customer.name} (${clash.service}) at ${fmtTime(clash.start)}. Pick another time or staff member.`);
    setBusy(true);
    try {
      await post('/appointment', {
        customer_id: customerId, products: [serviceId], date, time: toHHMM(start), duration: String(duration), staff_id: staffId, notes: notes.trim() || undefined,
      });
      await qc.invalidateQueries();
      ui.closeModal();
      sessionStorage.setItem('dara.cal.date', date);
      ui.toast(`Booking created for ${customerOptions.find((c) => c.id === customerId)?.name ?? 'customer'}, ${relDate(date)} at ${fmtTime(start)}`);
    } catch (e) {
      setWarn(e instanceof Error ? e.message : 'Could not create the booking.');
    } finally {
      setBusy(false);
    }
  };

  const newCustomer = () =>
    ui.openModal(() => <CustomerModal onSaved={(id) => ui.openModal(() => <BookingModal customerId={id} serviceId={serviceId || undefined} staffId={staffId || undefined} date={date} start={start} notes={notes} />)} />);

  return (
    <Modal title="New booking" sub="Customers get an email confirmation and reminders before the appointment."
      footer={<><button className="btn" onClick={ui.closeModal}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Create booking'}</button></>}>
      <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="field">
          <label htmlFor="bkCust">Customer</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select id="bkCust" style={{ flex: 1 }} value={customerId} onChange={(e) => setCustomerId(Number(e.target.value))}>
              {!customerOptions.length && <option value="">{customers.isLoading ? 'Loading…' : 'No customers yet'}</option>}
              {customerOptions.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</option>)}
            </select>
            <button type="button" className="btn" onClick={newCustomer}><Icon name="plus" />New</button>
          </div>
        </div>
        <div className="grid2">
          <div className="field"><label htmlFor="bkSvc">Service</label>
            <select id="bkSvc" value={serviceId} onChange={(e) => setServiceId(Number(e.target.value))}>
              {!services.length && <option value="">{catalog.isLoading ? 'Loading…' : 'No services yet'}</option>}
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="bkStaff">Staff</label>
            <select id="bkStaff" value={staffId} onChange={(e) => setStaffId(Number(e.target.value))}>
              {bookable.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid2">
          <div className="field"><label htmlFor="bkDate">Date</label><input id="bkDate" type="date" value={date} min={today()} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="field"><label htmlFor="bkTime">Time</label>
            <select id="bkTime" value={start} onChange={(e) => setStart(Number(e.target.value))}>{times.map((m) => <option key={m} value={m}>{fmtTime(m)}</option>)}</select>
          </div>
        </div>
        <p className="hint">{svc ? `Takes ${fmtDur(duration)}. Ends at ${fmtTime(start + duration)}. Price ₦${Math.round(svc.price).toLocaleString('en-NG')}.` : ''}</p>
        <div className="field"><label htmlFor="bkNotes">Notes</label><textarea id="bkNotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Style, length, products the customer is bringing" /></div>
        {warn && <p className="warn">{warn}</p>}
      </form>
    </Modal>
  );
}
