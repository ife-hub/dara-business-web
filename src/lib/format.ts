// Formatting helpers, ported from the Dara Business prototype.
// Dates are plain 'YYYY-MM-DD' strings in the business's own timezone; "today" comes
// from the server (GET /business/me) so it never depends on the computer's clock.

export const pad = (n: number) => String(n).padStart(2, '0');

let TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

/** Set from GET /business/me so every "today" matches the business timezone. */
export function setToday(isoDate: string) {
  TODAY = parseISO(isoDate);
}
export const today = () => iso(TODAY);
export const todayDate = () => new Date(TODAY);

export const iso = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const parseISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const dayOff = (n: number) => iso(addDays(TODAY, n));
export const daysBetween = (a: string, b: string) => Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 864e5);
export const startOfWeek = (d: Date) => {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  x.setHours(0, 0, 0, 0);
  return x;
};

/** minutes after midnight -> "2:30 PM" */
export const fmtTime = (m: number) => {
  const h = Math.floor(m / 60), mm = m % 60;
  return (h % 12 || 12) + ':' + pad(mm) + ' ' + (h >= 12 ? 'PM' : 'AM');
};
export const fmtHour = (h: number) => (h % 12 || 12) + (h >= 12 ? ' PM' : ' AM');
export const toHHMM = (m: number) => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
export const fromHHMM = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m || 0);
};
export const fmtDate = (s: string) => parseISO(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtDayShort = (s: string) => parseISO(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtDayLong = (s: string) => parseISO(s).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const relDate = (s: string) => {
  const T = today();
  return s === T ? 'Today' : s === dayOff(-1) ? 'Yesterday' : s === dayOff(1) ? 'Tomorrow' : fmtDayShort(s);
};
export const agoText = (s: string | null | undefined) => {
  if (!s) return 'Never';
  const d = daysBetween(s, today());
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 0) return fmtDayShort(s);
  if (d < 31) return d + ' days ago';
  if (d < 365) return Math.round(d / 30) + ' months ago';
  return 'Over a year ago';
};
export const fmtDur = (m: number) => {
  const h = Math.floor(m / 60), r = m % 60;
  return (h ? h + 'h' : '') + (h && r ? ' ' : '') + (r ? r + 'm' : '') || '0m';
};
export const naira = (n: number) => '₦' + Math.round(n || 0).toLocaleString('en-NG');
export const slug = (s: string) => String(s).toLowerCase().replace(/\s+/g, '-');
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const initials = (n: string) =>
  (n || '?').split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
export const firstName = (n: string) => (n || '').trim().split(/\s+/)[0] || '';
export const greeting = (d = new Date()) => {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
