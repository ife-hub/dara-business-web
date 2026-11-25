import { ReactNode } from 'react';
import { initials, slug } from '../lib/format';

export const Pill = ({ status, children, style }: { status: string; children?: ReactNode; style?: React.CSSProperties }) => (
  <span className={'pill st-' + slug(status)} style={style}>{children ?? status}</span>
);

export const Avatar = ({ name, color, size, cust, dim }: { name: string; color?: string; size?: 'sm' | 'lg'; cust?: boolean; dim?: boolean }) => (
  <span className={'av' + (size ? ' ' + size : '') + (cust ? ' cust' : '')} style={{ background: color, opacity: dim ? 0.45 : undefined }} title={name}>
    {initials(name)}
  </span>
);

export const Empty = ({ title, children, style }: { title: string; children?: ReactNode; style?: React.CSSProperties }) => (
  <div className="empty" style={style}>
    <b>{title}</b>
    {children}
  </div>
);

export const Loading = () => <div className="empty"><b>Loading…</b></div>;

export const ErrorBox = ({ error, retry }: { error: unknown; retry?: () => void }) => (
  <div className="empty">
    <b>Could not load this</b>
    {error instanceof Error ? error.message : 'Something went wrong.'}
    {retry && <div style={{ marginTop: 10 }}><button className="btn sm" onClick={retry}>Try again</button></div>}
  </div>
);

/** Status colour variables used by calendar chips (from the prototype). */
export const STATUS_VAR: Record<string, string> = { Pending: 'pend', Confirmed: 'conf', 'In Progress': 'prog', Completed: 'done', Cancelled: 'canc' };
