import { dayWindow, lanes } from '../pages/Bookings';
import { conflictFor, methodValue } from '../lib/bookings';
import type { Booking } from '../api/types';

describe('calendar lanes', () => {
  it('puts overlapping bookings side by side and others full width', () => {
    const out = lanes([
      { id: 'a', start: 600, duration: 60 },
      { id: 'b', start: 630, duration: 60 },
      { id: 'c', start: 800, duration: 30 },
    ]);
    const by = Object.fromEntries(out.map((e) => [e.id, e]));
    expect(by.a.lanes).toBe(2);
    expect(by.b.lanes).toBe(2);
    expect(by.a.lane).not.toBe(by.b.lane);
    expect(by.c.lanes).toBe(1);
  });

  it('reuses a lane once the earlier booking has ended', () => {
    const out = lanes([
      { id: 'a', start: 600, duration: 120 },
      { id: 'b', start: 630, duration: 30 },
      { id: 'c', start: 660, duration: 30 },
    ]);
    expect(out.every((e) => e.lanes === 2)).toBe(true);
  });
});

describe('dayWindow', () => {
  it('defaults to 8 AM – 8 PM and widens for opening hours', () => {
    expect(dayWindow([])).toEqual([480, 1200]);
    expect(dayWindow([{ day: 'Sat', open: '07:30', close: '21:15', is_open: true }])).toEqual([420, 1320]);
    expect(dayWindow([{ day: 'Sun', open: '05:00', close: '23:00', is_open: false }])).toEqual([480, 1200]);
  });
});

describe('booking helpers', () => {
  const b = (o: Partial<Booking>) => ({ id: 'a1', date: '2026-11-25', start: 600, duration: 60, status: 'Confirmed', staff: { id: 1 }, ...o }) as unknown as Booking;

  it('finds a clash for the same staff and day only', () => {
    const list = [b({})];
    expect(conflictFor(list, { staffId: 1, date: '2026-11-25', start: 630, duration: 30 })).toBeTruthy();
    expect(conflictFor(list, { staffId: 1, date: '2026-11-25', start: 660, duration: 30 })).toBeUndefined();
    expect(conflictFor(list, { staffId: 2, date: '2026-11-25', start: 630, duration: 30 })).toBeUndefined();
    expect(conflictFor(list, { staffId: 1, date: '2026-11-25', start: 630, duration: 30 }, 'a1')).toBeUndefined();
    expect(conflictFor([b({ status: 'Cancelled' } as Partial<Booking>)], { staffId: 1, date: '2026-11-25', start: 630, duration: 30 })).toBeUndefined();
  });

  it('maps payment methods to API values', () => {
    expect(methodValue('POS / Card')).toBe('pos');
    expect(methodValue('Transfer')).toBe('transfer');
  });
});
