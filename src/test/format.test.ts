import { addDays, daysBetween, firstName, fmtDur, fmtHour, fmtTime, fromHHMM, initials, iso, naira, parseISO, setToday, dayOff, startOfWeek, toHHMM, today } from '../lib/format';

describe('format helpers', () => {
  it('formats minutes since midnight as clock times', () => {
    expect(fmtTime(0)).toBe('12:00 AM');
    expect(fmtTime(9 * 60 + 5)).toBe('9:05 AM');
    expect(fmtTime(14 * 60 + 30)).toBe('2:30 PM');
    expect(fmtHour(12)).toBe('12 PM');
  });

  it('round-trips HH:MM', () => {
    expect(toHHMM(615)).toBe('10:15');
    expect(fromHHMM('10:15')).toBe(615);
  });

  it('formats durations and money', () => {
    expect(fmtDur(45)).toMatch(/45/);
    expect(fmtDur(90)).toMatch(/1/);
    expect(naira(25000)).toBe('₦25,000');
    expect(naira(Number.NaN)).toBe('₦0');
  });

  it('does date arithmetic on local dates without timezone drift', () => {
    expect(iso(parseISO('2026-03-01'))).toBe('2026-03-01');
    expect(iso(addDays(parseISO('2026-02-28'), 1))).toBe('2026-03-01');
    expect(daysBetween('2026-01-01', '2026-01-15')).toBe(14);
    expect(startOfWeek(parseISO('2026-11-25')).getDay()).toBe(startOfWeek(parseISO('2026-11-29')).getDay());
  });

  it('uses the business "today" from the server', () => {
    setToday('2026-11-25');
    expect(today()).toBe('2026-11-25');
    expect(dayOff(7)).toBe('2026-12-02');
  });

  it('builds names and initials', () => {
    expect(initials('Jane Ade')).toBe('JA');
    expect(firstName('  Blessing Okafor ')).toBe('Blessing');
  });
});
