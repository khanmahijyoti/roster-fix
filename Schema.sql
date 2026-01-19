-- ==========================================
-- 1. UTILITY FUNCTIONS (Must run first)
-- ==========================================
CREATE OR REPLACE FUNCTION get_week_start(check_date DATE DEFAULT CURRENT_DATE)
RETURNS DATE AS $$
BEGIN
  -- Returns the Monday of the given week
  RETURN check_date - (EXTRACT(DOW FROM check_date)::INTEGER + 6) % 7;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==========================================
-- 2. TABLES
-- ==========================================

-- Organizations
create table public.organizations (
  id uuid not null default gen_random_uuid (),
  name text not null,
  created_at timestamp with time zone null default now(),
  constraint organizations_pkey primary key (id)
) TABLESPACE pg_default;

-- Owners
create table public.owners (
  id uuid not null default gen_random_uuid (),
  email text not null,
  created_at timestamp with time zone null default now(),
  constraint owners_pkey primary key (id),
  constraint owners_email_key unique (email)
) TABLESPACE pg_default;

-- Businesses
create table public.businesses (
  id uuid not null default gen_random_uuid (),
  name text not null,
  location text null,
  owner_id uuid null,
  operating_hours jsonb null,
  organization_id uuid null,
  constraint businesses_pkey primary key (id),
  constraint businesses_organization_id_fkey foreign KEY (organization_id) references organizations (id),
  constraint businesses_owner_id_fkey foreign KEY (owner_id) references owners (id)
) TABLESPACE pg_default;

-- Employees
create table public.employees (
  id uuid not null default gen_random_uuid (),
  name text not null,
  role text null,
  owner_id uuid null,
  organization_id uuid null,
  email text null,
  auth_user_id uuid null,
  system_role text null default 'worker'::text,
  constraint employees_pkey primary key (id),
  constraint employees_email_key unique (email),
  constraint employees_auth_user_id_fkey foreign KEY (auth_user_id) references auth.users (id),
  constraint employees_organization_id_fkey foreign KEY (organization_id) references organizations (id),
  constraint employees_owner_id_fkey foreign KEY (owner_id) references owners (id)
) TABLESPACE pg_default;

-- Availability
create table public.availability (
  id uuid not null default gen_random_uuid (),
  employee_id uuid not null,
  day_of_week text not null,
  is_available boolean null default true,
  shift_time text null default 'morning'::text,
  constraint availability_pkey primary key (id),
  constraint availability_employee_id_day_shift_key unique (employee_id, day_of_week, shift_time),
  constraint availability_employee_id_fkey foreign KEY (employee_id) references employees (id)
) TABLESPACE pg_default;

-- Invitations
create table public.invitations (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  code text not null,
  created_by uuid null,
  max_uses integer null default 1,
  uses_count integer null default 0,
  expires_at timestamp without time zone null,
  is_active boolean null default true,
  created_at timestamp without time zone null default now(),
  constraint invitations_pkey primary key (id),
  constraint invitations_code_key unique (code),
  constraint invitations_created_by_fkey foreign KEY (created_by) references employees (id),
  constraint invitations_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;

-- Shifts (FIXED SYNTAX HERE)
create table public.shifts (
  id uuid not null default gen_random_uuid (),
  employee_id uuid not null,
  business_id uuid not null,
  organization_id uuid not null,
  day_of_week text not null,
  shift_time text not null,
  start_time time without time zone null default '08:00:00'::time without time zone,
  end_time time without time zone null default '17:00:00'::time without time zone,
  created_at timestamp with time zone null default now(),
  -- FIX: Precision (5,2) moved to the correct place
  hours_worked numeric(5, 2) GENERATED ALWAYS as (
    (
      EXTRACT(
        epoch
        from
          case
            when (end_time < start_time) then ((end_time - start_time) + '24:00:00'::interval)
            else (end_time - start_time)
          end
      ) / (3600)::numeric
    )
  ) STORED,
  constraint shifts_pkey primary key (id),
  constraint shifts_employee_id_day_of_week_shift_time_key unique (employee_id, day_of_week, shift_time),
  constraint shifts_business_id_fkey foreign KEY (business_id) references businesses (id),
  constraint shifts_employee_id_fkey foreign KEY (employee_id) references employees (id),
  constraint shifts_organization_id_fkey foreign KEY (organization_id) references organizations (id)
) TABLESPACE pg_default;

-- Weekly Reports
create table public.weekly_reports (
  id uuid not null default gen_random_uuid (),
  employee_id uuid not null,
  business_id uuid not null,
  week_start date not null,
  week_end date not null,
  total_hours numeric(5, 2) not null default 0,
  shift_count integer not null default 0,
  working_days text[] not null default '{}'::text[],
  shifts_data jsonb null,
  created_at timestamp with time zone null default now(),
  constraint weekly_reports_pkey primary key (id),
  constraint weekly_reports_employee_id_week_start_key unique (employee_id, week_start),
  constraint weekly_reports_business_id_fkey foreign KEY (business_id) references businesses (id) on delete CASCADE,
  constraint weekly_reports_employee_id_fkey foreign KEY (employee_id) references employees (id) on delete CASCADE
) TABLESPACE pg_default;

-- Indexes
create index IF not exists idx_weekly_reports_employee on public.weekly_reports using btree (employee_id) TABLESPACE pg_default;
create index IF not exists idx_weekly_reports_week_start on public.weekly_reports using btree (week_start desc) TABLESPACE pg_default;
create index IF not exists idx_weekly_reports_business on public.weekly_reports using btree (business_id) TABLESPACE pg_default;

-- ==========================================
-- 3. VIEWS
-- ==========================================

create or replace view public.employee_weekly_hours as
select
  employee_id,
  sum(hours_worked) as total_hours,
  count(*) as shift_count,
  array_agg(
    distinct day_of_week
    order by
      day_of_week
  ) as working_days
from
  shifts
group by
  employee_id;

create or replace view public.current_week_hours as
select
  e.id as employee_id,
  e.name as employee_name,
  s.business_id,
  b.name as business_name,
  COALESCE(sum(s.hours_worked), 0::numeric) as total_hours,
  count(s.id) as shift_count,
  array_agg(
    distinct s.day_of_week
    order by
      s.day_of_week
  ) filter (
    where
      s.day_of_week is not null
  ) as working_days,
  get_week_start (CURRENT_DATE) as week_start,
  get_week_start (CURRENT_DATE) + '6 days'::interval as week_end
from
  employees e
  join shifts s on e.id = s.employee_id
  and s.created_at >= get_week_start (CURRENT_DATE)
  and s.created_at < (
    get_week_start (CURRENT_DATE) + '7 days'::interval
  )
  left join businesses b on s.business_id = b.id
group by
  e.id,
  e.name,
  s.business_id,
  b.name;