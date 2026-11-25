import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

/** What the side drawer shows. */
export type DrawerState =
  | { type: 'booking'; id: string }
  | { type: 'customer'; id: number }
  | { type: 'invoice'; id: number }
  | { type: 'article'; id: number; learner: string };

interface UiApi {
  toast: (msg: string) => void;
  openModal: (render: () => ReactNode) => void;
  closeModal: () => void;
  openDrawer: (d: DrawerState) => void;
  closeDrawer: () => void;
  drawer: DrawerState | null;
  modalOpen: boolean;
}

const UiContext = createContext<UiApi | null>(null);

export const useUi = () => {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi outside UiProvider');
  return ctx;
};

export function UiProvider({ children, renderDrawer }: { children: ReactNode; renderDrawer: (d: DrawerState) => ReactNode }) {
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);
  const timer = useRef<number>();
  const [modal, setModal] = useState<(() => ReactNode) | null>(null);
  const [drawer, setDrawer] = useState<DrawerState | null>(null);

  const toast = useCallback((m: string) => {
    setMsg(m);
    setShow(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShow(false), 3200);
  }, []);
  const openModal = useCallback((render: () => ReactNode) => setModal(() => render), []);
  const closeModal = useCallback(() => setModal(null), []);
  const openDrawer = useCallback((d: DrawerState) => setDrawer(d), []);
  const closeDrawer = useCallback(() => setDrawer(null), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (modal) setModal(null);
      else if (drawer) setDrawer(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal, drawer]);

  return (
    <UiContext.Provider value={{ toast, openModal, closeModal, openDrawer, closeDrawer, drawer, modalOpen: !!modal }}>
      {children}
      <div className={'drawer-wrap' + (drawer ? ' open' : '')} aria-hidden={!drawer}>
        <div className="drawer-bg" onClick={closeDrawer} />
        {drawer && renderDrawer(drawer)}
      </div>
      <div>{modal && modal()}</div>
      <div className={'toast' + (show ? ' show' : '')} role="status">
        <Icon name="check" />
        <span>{msg}</span>
      </div>
    </UiContext.Provider>
  );
}

/** Modal frame (markup and classes from the prototype). Render it from openModal(). */
export function Modal({ title, sub, size, children, footer }: { title: string; sub?: ReactNode; size?: 'narrow' | 'wide'; children: ReactNode; footer?: ReactNode }) {
  const { closeModal } = useUi();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const f = ref.current?.querySelector<HTMLElement>('input:not([type=hidden]):not([disabled]), select, textarea, .btn.primary');
      f?.focus();
    }, 30);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && closeModal()}>
      <div className={'modal ' + (size ?? '')} role="dialog" aria-modal="true" aria-labelledby="mTitle" ref={ref}>
        <div className="m-h">
          <div>
            <h2 id="mTitle">{title}</h2>
            {sub && <p>{sub}</p>}
          </div>
          <button className="icon-btn bare" onClick={closeModal} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="m-b">{children}</div>
        {footer && <div className="m-f">{footer}</div>}
      </div>
    </div>
  );
}

/** Drawer frame. */
export function DrawerFrame({ wide, header, children, footer }: { wide?: boolean; header: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const { closeDrawer } = useUi();
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const t = window.setTimeout(() => ref.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <aside className={'drawer' + (wide ? ' wide' : '')} role="dialog" aria-modal="true">
      <header className="dr-h">
        {header}
        <button className="icon-btn" onClick={closeDrawer} aria-label="Close" ref={ref}>
          <Icon name="x" />
        </button>
      </header>
      <div className="dr-b">{children}</div>
      {footer && <footer className="dr-f">{footer}</footer>}
    </aside>
  );
}

/** "Are you sure?" dialog. */
export function ConfirmModal({ title, text, ok, danger, cancelLabel, onOk }: { title: string; text: ReactNode; ok: string; danger?: boolean; cancelLabel?: string; onOk: () => void | Promise<void> }) {
  const { closeModal } = useUi();
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={title}
      size="narrow"
      footer={
        <>
          <button className="btn" onClick={closeModal}>{cancelLabel ?? 'Keep it'}</button>
          <button
            className={'btn ' + (danger ? 'danger' : 'primary')}
            style={danger ? { background: 'var(--over)', color: '#fff', borderColor: 'var(--over)' } : undefined}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onOk();
              } finally {
                setBusy(false);
              }
            }}
          >
            {ok}
          </button>
        </>
      }
    >
      <p style={{ color: 'var(--ink-2)' }}>{text}</p>
    </Modal>
  );
}
