import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, patch, post, put } from './client';
import type {
  Booking, CatalogItem, Customer, DashboardData, Invoice, InventoryItem, SettingsData, StaffMember, Transaction, TrainingData,
} from './types';

const data = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export const useDashboard = () => useQuery({ queryKey: ['dashboard'], queryFn: () => data(get<{ data: DashboardData }>('/business/dashboard')) });

export const useBookings = (from: string, to: string) =>
  useQuery({
    queryKey: ['bookings', from, to],
    queryFn: () => data(get<{ data: { bookings: Booking[] } }>(`/business/bookings?from=${from}&to=${to}`)).then((d) => d.bookings),
    placeholderData: (prev) => prev,
  });

export const useCustomers = (enabled = true) =>
  useQuery({ queryKey: ['customers'], enabled, queryFn: () => data(get<{ data: { customers: Customer[] } }>('/business/customers')).then((d) => d.customers) });

export const useCustomer = (id: number) =>
  useQuery({
    queryKey: ['customer', id],
    queryFn: () => data(get<{ data: { customer: Customer; bookings: Booking[]; payments: Transaction[]; invoices: Invoice[] } }>(`/business/customers/${id}`)),
  });

export const useTransactions = (range: string, method: string) =>
  useQuery({
    queryKey: ['transactions', range, method],
    queryFn: () =>
      data(get<{ data: { transactions: Transaction[]; totals: { amount: number; count: number; by_method: Record<string, number> }; truncated: boolean } }>(
        `/business/transactions?range=${range}&method=${encodeURIComponent(method)}`,
      )),
    placeholderData: (prev) => prev,
  });

export const useInvoices = (enabled = true) =>
  useQuery({
    queryKey: ['invoices'],
    enabled,
    queryFn: () => data(get<{ data: { invoices: Invoice[]; totals: { outstanding: number; overdue: number; paid_30_days: number; count: number }; next_number: string } }>('/business/invoices')),
  });

export const useInvoice = (id: number) => useQuery({ queryKey: ['invoice', id], queryFn: () => data(get<{ data: { invoice: Invoice } }>(`/business/invoices/${id}`)).then((d) => d.invoice) });

export const useCatalog = (enabled = true) =>
  useQuery({ queryKey: ['catalog'], enabled, queryFn: () => data(get<{ data: { services: CatalogItem[]; products: CatalogItem[] } }>('/business/catalog')) });

export const useStaff = (enabled = true) =>
  useQuery({ queryKey: ['staff'], enabled, queryFn: () => data(get<{ data: { staff: StaffMember[]; roles: string[]; colors: string[] } }>('/business/staff')) });

export const useInventory = () =>
  useQuery({ queryKey: ['inventory'], queryFn: () => data(get<{ data: { items: InventoryItem[]; low_count: number; synced_at: string | null } }>('/business/inventory')) });

export const useSettings = () => useQuery({ queryKey: ['settings'], queryFn: () => data(get<{ data: SettingsData }>('/business/settings')) });

export const useTraining = (learner: string) =>
  useQuery({
    queryKey: ['training', learner],
    queryFn: () => data(get<{ data: TrainingData }>(`/business/training?learner=${encodeURIComponent(learner)}`)),
    placeholderData: (prev) => prev,
  });

export const useArticle = (id: number) =>
  useQuery({ queryKey: ['article', id], queryFn: () => data(get<{ data: { article: { id: number; title: string; topic: string; minutes: number; published_at: string; excerpt: string; body: string[] } } }>(`/business/training/articles/${id}`)).then((d) => d.article) });

/**
 * Every write refreshes everything, like the prototype's rerender(): bookings change
 * the dashboard, customers, staff counts and so on.
 */
export function useWrite<TArgs, TResult = unknown>(fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries() });
}

export const api = { get, post, put, patch, del };
