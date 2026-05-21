-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Create policies for profiles
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- Create save_slots table
create table if not exists public.save_slots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  slot_number integer not null,
  slot_name text,
  save_data jsonb not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, slot_number)
);

-- Enable RLS
alter table public.save_slots enable row level security;

-- Create policies for save_slots
create policy "Users can view their own saves." on public.save_slots
  for select using (auth.uid() = user_id);

create policy "Users can insert their own saves." on public.save_slots
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own saves." on public.save_slots
  for update using (auth.uid() = user_id);

create policy "Users can delete their own saves." on public.save_slots
  for delete using (auth.uid() = user_id);

-- Create a trigger to automatically create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
