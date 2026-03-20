-- Payments table
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  amount numeric(10,2) not null,
  type text not null check (type in ('aanbetaling','termijn','restbedrag','overig')),
  payment_date date not null default current_date,
  method text check (method in ('contant','pin','overboeking','overig')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create index if not exists payments_customer_id_idx on public.payments(customer_id);

-- Suppliers table
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  website text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.suppliers enable row level security;

-- Orders table
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  product_description text not null,
  reference_number text,
  order_date date,
  expected_delivery_date date,
  actual_delivery_date date,
  status text not null default 'besteld' check (status in ('besteld','verwacht','ontvangen','klaar')),
  price numeric(10,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists orders_status_expected_delivery_idx on public.orders(status, expected_delivery_date);

-- Customer tasks table
create table if not exists public.customer_tasks (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.customer_tasks enable row level security;

create index if not exists customer_tasks_customer_id_idx on public.customer_tasks(customer_id);
create index if not exists customer_tasks_pending_idx on public.customer_tasks(completed_at, due_date) where completed_at is null;
