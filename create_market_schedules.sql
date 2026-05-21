-- Market Schedules Table
create table public.market_schedules (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    market_id text not null,
    day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6),
    is_active boolean default true not null,
    
    -- Ensure we don't have duplicate schedules for the same market and day
    unique(market_id, day_of_week)
);

-- Enable RLS (if needed)
alter table public.market_schedules enable row level security;

-- Create policy to allow all (assuming authenticated app handles logic)
create policy "Enable full access for authenticated users" on public.market_schedules
    for all using (true) with check (true);
