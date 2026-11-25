import { useQueryClient } from '@tanstack/react-query';
import type { Booking, BookingStatus } from '../api/types';
import { useUi, ConfirmModal } from '../components/Ui';
import { PaymentModal } from '../modals/PaymentModal';
import { RescheduleModal } from '../modals/RescheduleModal';
import { canSetStatus, setBookingStatus } from './bookings';
import { fmtTime, relDate } from './format';

/** Start / complete / pay / reschedule / cancel, shared by the dashboard, calendar and drawer. */
export function useBookingActions() {
  const ui = useUi();
  const qc = useQueryClient();

  const status = async (b: Booking, s: BookingStatus, msg: string) => {
    try {
      await setBookingStatus(b, s);
      await qc.invalidateQueries();
      ui.toast(msg);
      return true;
    } catch (e) {
      ui.toast(e instanceof Error ? e.message : 'Could not update the booking.');
      return false;
    }
  };

  const pay = (b: Booking) => ui.openModal(() => <PaymentModal booking={b} />);

  return {
    canStart: (b: Booking) => (b.status === 'Confirmed' || b.status === 'Pending') && canSetStatus(b, 'In Progress'),
    start: (b: Booking) => status(b, 'In Progress', 'Job started for ' + b.customer.name),
    complete: async (b: Booking) => {
      if (await status(b, 'Completed', 'Job completed for ' + b.customer.name)) {
        if (!b.paid) pay({ ...b, status: 'Completed' });
      }
    },
    pay,
    reschedule: (b: Booking) => ui.openModal(() => <RescheduleModal booking={b} />),
    cancel: (b: Booking) =>
      ui.openModal(() => (
        <ConfirmModal
          title="Cancel this booking?"
          text={`${b.customer.name}'s ${b.service} on ${relDate(b.date)} at ${fmtTime(b.start)} will be cancelled and the slot freed up.`}
          ok="Cancel booking"
          danger
          onOk={async () => {
            if (await status(b, 'Cancelled', 'Booking cancelled')) {
              ui.closeModal();
              ui.closeDrawer();
            }
          }}
        />
      )),
  };
}
