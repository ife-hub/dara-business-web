// Shapes returned by /api/v1/business/* (see dara-backend app/Http/Controllers/Business).

export type Role = 'owner' | 'manager' | 'front_desk' | 'practitioner';
export type Section = 'dashboard' | 'bookings' | 'customers' | 'transactions' | 'invoices' | 'catalog' | 'staff' | 'training' | 'inventory' | 'settings';
export type SettingsTab = 'business' | 'profile' | 'branch' | 'staff' | 'account';

export interface Hours { day: string; open: string; close: string; is_open: boolean }

export interface Me {
  user: { type: 'owner' | 'staff'; id: number; name: string; email: string; role: Role; role_label: string; learner_key: string };
  business: { id: number; name: string; category: string | null; currency: string };
  branch: { id: number | null; name: string; opening_hours: Hours[] };
  permissions: { sections: Section[]; settings_tabs: SettingsTab[] };
  timezone: string;
  today: string;
}

export type BookingStatus = 'Pending' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled';
export const STATUSES: BookingStatus[] = ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'];

export interface Booking {
  id: string; // "appointment:12" | "order:7"
  type: 'appointment' | 'order';
  record_id: number;
  date: string;
  start: number;
  duration: number;
  status: BookingStatus;
  paid: boolean;
  price: number;
  services: { id: number; name: string; price: number }[];
  service: string;
  customer: { id: number; name: string; phone: string; email: string };
  staff: { id: number; name: string; color: string } | null;
  notes: string;
}

export interface DashboardData {
  date: string;
  first_name: string;
  today: Booking[];
  kpis: {
    bookings_today: number; remaining_today: number; upcoming_7_days: number; in_progress: number; in_progress_names: string[];
    completed_today: number; revenue_today: number; payments_today: number; outstanding_amount: number; outstanding_count: number;
    overdue_count: number; new_customers_7_days: number;
  };
  attention: { kind: 'unpaid_jobs' | 'overdue_invoices' | 'pending_bookings' | 'low_stock'; count: number; title: string; detail?: string; amount?: number; booking_id?: string }[];
  staff: { id: number; name: string; role: string; color: string; bookings: number; minutes: number }[];
}

export interface Customer {
  id: number; name: string; phone: string; email: string; joined: string; last_visit: string | null;
  spent: number; visits: number; appointments: number; next_booking: string | null; status: 'New' | 'Active' | 'Inactive';
  notes?: string; birthday?: string | null;
}

export interface Transaction {
  id: number; date: string; time: string; customer: { id: number; name: string }; item: string; method: string; notes: string; amount: number;
  appointment_id: number | null; order_id: number | null;
}

export interface Invoice {
  id: number; number: string; customer: { id: number; name: string; phone: string; email: string }; date: string; due_date: string;
  status: 'Pending' | 'Overdue' | 'Paid'; days_late: number; subtotal: number; discount: number; tax: number; total: number; notes: string;
  sent_at: string | null; items?: { name: string; quantity: number; price: number }[];
}

export interface CatalogItem { id: number; name: string; category: string; price: number; is_active: boolean; image: string | null; duration?: number; booked_30_days?: number; quantity?: number | null }

export interface StaffMember {
  id: number; name: string; role: string; access_level: string; phone: string; email: string; branch_id: number | null; branch_name: string;
  active: boolean; bookable: boolean; color: string; skills: unknown; bookings_today: number;
}

export interface InventoryItem { id: number; name: string; category: string; quantity: number; unit: string; reorder: number; status: 'In stock' | 'Low stock' | 'Out of stock' }

export interface Learner { key: string; name: string; type: 'owner' | 'staff'; role?: string; color?: string }
export interface Lesson { id: number; position: number; type: 'video' | 'read'; title: string; minutes: number; text: string; video_url: string | null; done: boolean }
export interface Course { id: number; title: string; segment: string; level: string; description: string; minutes: number; done: number; total: number; due_date: string | null; assigned: boolean; lessons: Lesson[] }
export interface ArticleSummary { id: number; title: string; topic: string; minutes: number; published_at: string; excerpt: string; read: boolean }
export interface TeamRow { id: number; learner: Learner; course: { id: number; title: string }; due_date: string | null; done: number; total: number; reminded_at: string | null }
export interface TrainingData {
  topics: string[]; segments: string[]; learner: string; learners: Learner[]; can_manage: boolean;
  articles: ArticleSummary[]; courses: Course[]; team?: TeamRow[];
}

export interface SettingsData {
  tabs: SettingsTab[]; categories: string[];
  business?: { name: string; category: string | null; phone: string; email: string; address: string; currency: string; invoice_prefix: string };
  profile?: { short_description: string; long_description: string; photos: { id: number; url: string }[]; limits: { photos: number; short: number; long: number } };
  branch?: { id: number; name: string; phone: string; address: string; opening_hours: Hours[] } | null;
  account?: { name: string; phone: string; email: string };
}

export interface Ok<T> { status: true; data: T }
