import { patch, post } from '../api/client';
import type { Booking, BookingStatus } from '../api/types';
import { toHHMM } from './format';

/** Desktop status -> backend status, per booking type (see BookingPresenter in dara-backend). */
const APPOINTMENT_STATUS: Partial<Record<BookingStatus, string>> = {
  Confirmed: 'accepted', 'In Progress': 'ongoing', Completed: 'completed', Cancelled: 'cancelled',
};
const ORDER_STATUS: Partial<Record<BookingStatus, string>> = {
  'In Progress': 'processing', Completed: 'completed', Cancelled: 'cancelled',
};

export const canSetStatus = (b: Booking, s: BookingStatus) => !!(b.type === 'appointment' ? APPOINTMENT_STATUS : ORDER_STATUS)[s];

export function setBookingStatus(b: Booking, s: BookingStatus) {
  if (b.type === 'appointment') {
    return patch(`/appointment/${b.record_id}/status`, { status: APPOINTMENT_STATUS[s] });
  }
  return patch(`/order/${b.record_id}/status`, { status: ORDER_STATUS[s] });
}

/** Only in-app appointments can be moved or reassigned from desktop. WhatsApp bookings are moved by the customer on WhatsApp. */
export const canEdit = (b: Booking) => b.type === 'appointment';

export function updateAppointment(b: Booking, changes: { date?: string; start?: number; staffId?: number; notes?: string }) {
  const body: Record<string, unknown> = {};
  if (changes.date) body.date = changes.date;
  if (changes.start !== undefined) body.time = toHHMM(changes.start);
  if (changes.staffId) body.staff_id = changes.staffId;
  if (changes.notes !== undefined) body.notes = changes.notes;
  return patch(`/appointment/${b.record_id}`, body);
}

export const METHODS = ['Transfer', 'POS / Card', 'Cash'] as const;
export const methodValue = (m: string) => (m === 'POS / Card' ? 'pos' : m.toLowerCase());

/** Record money received; optionally settles a booking (marks it paid). */
export function recordPayment(o: {
  customerId: number; item: string; amount: number; method: string; quantity?: number; booking?: Booking; staffId?: number | null;
}) {
  return post('/transactions/create', {
    customerId: o.customerId,
    paymentType: methodValue(o.method),
    attendingStaff: o.staffId ?? o.booking?.staff?.id ?? undefined,
    appointmentId: o.booking?.type === 'appointment' ? o.booking.record_id : undefined,
    orderId: o.booking?.type === 'order' ? o.booking.record_id : undefined,
    items: [{ productOrService: o.item, quantity: o.quantity ?? 1, amount: o.amount }],
  });
}

/** Overlap check for a staff member's day (same rule as the prototype). */
export function conflictFor(list: Booking[], o: { staffId: number; date: string; start: number; duration: number }, ignoreId?: string) {
  return list.find(
    (a) => a.id !== ignoreId && a.staff?.id === o.staffId && a.date === o.date && a.status !== 'Cancelled' &&
      a.start < o.start + o.duration && o.start < a.start + a.duration,
  );
}
