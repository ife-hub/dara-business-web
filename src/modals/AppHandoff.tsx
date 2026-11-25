import { post } from '../api/client';
import { Icon } from '../components/Icon';
import { Modal, useUi } from '../components/Ui';

type Ui = ReturnType<typeof useUi>;

/** Emails the logged-in person a link to open the Dara app (WhatsApp delivery is parked). */
export async function openAppLink(ui: Ui) {
  ui.closeModal();
  try {
    const res = await post<{ data: { sent_to: string } }>('/business/app-link');
    ui.toast('Link sent to ' + res.data.sent_to + '. Open it on your phone to go to the Dara app.');
  } catch (e) {
    ui.toast(e instanceof Error ? e.message : 'Could not send the link.');
  }
}

export function AppHandoffModal() {
  const ui = useUi();
  return (
    <Modal title="Edit inventory" size="narrow"
      footer={<><button className="btn" onClick={ui.closeModal}>Not now</button><button className="btn primary" onClick={() => openAppLink(ui)}><Icon name="phone" />Open Dara App</button></>}>
      <div className="handoff">
        <div className="phone"><div className="rows"><i /><i /><i /><i /></div></div>
        <h3>Inventory management is available on the Dara mobile app.</h3>
        <p>Count stock, receive deliveries and scan products from your phone on the shop floor. Changes show up here straight away.</p>
      </div>
    </Modal>
  );
}
