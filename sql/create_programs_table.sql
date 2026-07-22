-- Migration to support community shared programs

create table public.programs (
  id uuid default gen_random_uuid() primary key,
  creator_id uuid references public.profiles(id) not null,
  name text not null,
  description text,
  duration_weeks int not null default 4,
  routine_schema jsonb not null, -- Stores the full routine JSON mapping
  downloads int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.programs enable row level security;

-- Everyone can read community programs
create policy "Programs are viewable by everyone." 
  on public.programs for select 
  using (true);

-- Users can only insert their own programs
create policy "Users can insert their own programs." 
  on public.programs for insert 
  with check (auth.uid() = creator_id);

-- Users can only delete their own programs
create policy "Users can delete their own programs." 
  on public.programs for delete 
  using (auth.uid() = creator_id);
