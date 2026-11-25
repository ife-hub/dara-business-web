import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Booking, DashboardData } from '../api/types';

/**
 * Find a booking in whatever lists are already loaded (calendar ranges, dashboard,
 * customer detail) and stay in sync as those refetch after a change.
 */
export function useCachedBooking(id: string): Booking | undefined {
  const qc = useQueryClient();
  const find = () => {
    for (const [, list] of qc.getQueriesData<Booking[]>({ queryKey: ['bookings'] })) {
      const b = list?.find((x) => x.id === id);
      if (b) return b;
    }
    const dash = qc.getQueryData<DashboardData>(['dashboard'])?.today.find((x) => x.id === id);
    if (dash) return dash;
    for (const [, c] of qc.getQueriesData<{ bookings: Booking[] }>({ queryKey: ['customer'] })) {
      const b = c?.bookings?.find((x) => x.id === id);
      if (b) return b;
    }
    return undefined;
  };
  const [b, setB] = useState(find);
  useEffect(() => {
    setB(find());
    return qc.getQueryCache().subscribe(() => setB(find()));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  return b;
}
