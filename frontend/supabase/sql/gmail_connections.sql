create table if not exists gmail_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  access_token text not null,
  refresh_token text,
  expiry_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Only the owning user can read/write their own row
alter table gmail_connections enable row level security;

create policy "Users can manage their own gmail connection"
  on gmail_connections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
