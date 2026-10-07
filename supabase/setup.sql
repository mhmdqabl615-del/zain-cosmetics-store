create table if not exists public.store_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  price numeric(12, 2) not null check (price >= 0),
  category text not null default 'Other' check (char_length(trim(category)) between 1 and 60),
  image_url text not null default '' check (char_length(image_url) <= 2048),
  stock integer not null default 0 check (stock >= 0),
  featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_name text not null check (char_length(trim(customer_name)) between 1 and 120),
  customer_phone text not null check (char_length(trim(customer_phone)) between 3 and 40),
  items jsonb not null default '[]'::jsonb
    check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'fulfilled', 'cancelled')),
  notes text not null default '' check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_active_updated_idx
  on public.products (is_active, updated_at desc);
create index if not exists store_orders_created_idx
  on public.store_orders (created_at desc);

create or replace function public.is_store_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.store_admins
    where user_id = (select auth.uid())
  );
$$;

create or replace function public.get_store_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_store_admin() then
    raise exception 'Only an authorized store administrator can view the store summary.'
      using errcode = '42501';
  end if;

  return jsonb_build_object(
    'products', (select count(*) from public.products),
    'active_products', (select count(*) from public.products where is_active),
    'pending_orders', (select count(*) from public.store_orders where status = 'pending'),
    'revenue', (
      select coalesce(sum(total_amount), 0)
      from public.store_orders
      where status <> 'cancelled'
    )
  );
end;
$$;

revoke all on function public.is_store_admin() from public, anon;
revoke all on function public.get_store_summary() from public, anon;
alter table public.store_admins enable row level security;
alter table public.products enable row level security;
alter table public.store_orders enable row level security;

drop policy if exists "admins can view store administrators" on public.store_admins;
create policy "admins can view store administrators"
  on public.store_admins for select to authenticated
  using ((select public.is_store_admin()));

drop policy if exists "public can view active products" on public.products;
create policy "public can view active products"
  on public.products for select to anon, authenticated
  using (is_active);

drop policy if exists "admins can manage products" on public.products;
create policy "admins can manage products"
  on public.products for all to authenticated
  using ((select public.is_store_admin()))
  with check ((select public.is_store_admin()));

drop policy if exists "admins can manage orders" on public.store_orders;
create policy "admins can manage orders"
  on public.store_orders for all to authenticated
  using ((select public.is_store_admin()))
  with check ((select public.is_store_admin()));

grant usage on schema public to anon, authenticated;
grant execute on function public.is_store_admin() to authenticated;
grant execute on function public.get_store_summary() to authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.store_admins to authenticated;
grant select, insert, update, delete on public.store_orders to authenticated;
grant usage, select on sequence public.store_orders_order_number_seq to authenticated;

-- Create/invite the owner through Supabase Dashboard > Authentication > Users,
-- then replace this example email with the invited address and run the script.
do $$
declare
  initial_owner_id uuid;
begin
  select id
    into initial_owner_id
    from auth.users
    where lower(email) = lower('replace-with-your-email@example.com')
    limit 1;

  if initial_owner_id is null then
    raise exception 'Create or invite the owner in Supabase Auth, replace the example email in this SQL, and run it again.';
  end if;

  if not exists (select 1 from public.store_admins) then
    insert into public.store_admins (user_id) values (initial_owner_id);
  elsif not exists (select 1 from public.store_admins where user_id = initial_owner_id) then
    raise exception 'An owner already exists. Ask the existing owner to authorize additional administrators.';
  end if;
end;
$$;
