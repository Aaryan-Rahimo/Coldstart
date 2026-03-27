-- Documents table
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  file_name text,
  file_type text check (file_type in ('pdf', 'csv')),
  storage_path text,
  parsed_content text,
  uploaded_at timestamp with time zone default now()
);

-- Drafts table
create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  company_name text,
  contact_email text,
  subject text,
  body text,
  status text default 'pending' check (status in ('pending', 'sent', 'accepted', 'rejected')),
  created_at timestamp with time zone default now()
);

alter table public.documents enable row level security;
alter table public.drafts enable row level security;

create policy if not exists "documents_select_own" on public.documents
  for select
  using (auth.uid() = user_id);

create policy if not exists "documents_insert_own" on public.documents
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "documents_update_own" on public.documents
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "documents_delete_own" on public.documents
  for delete
  using (auth.uid() = user_id);

create policy if not exists "drafts_select_own" on public.drafts
  for select
  using (auth.uid() = user_id);

create policy if not exists "drafts_insert_own" on public.drafts
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "drafts_update_own" on public.drafts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "drafts_delete_own" on public.drafts
  for delete
  using (auth.uid() = user_id);

-- Storage buckets
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy if not exists "documents_bucket_read_own" on storage.objects
  for select
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy if not exists "documents_bucket_insert_own" on storage.objects
  for insert
  with check (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy if not exists "documents_bucket_delete_own" on storage.objects
  for delete
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy if not exists "avatars_bucket_insert_own" on storage.objects
  for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy if not exists "avatars_bucket_update_own" on storage.objects
  for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy if not exists "avatars_bucket_read_public" on storage.objects
  for select
  using (bucket_id = 'avatars');

-- Self-service account deletion helper.
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_user_account() to authenticated;

-- Files table for storage bucket uploads (csvs and pdfs)
create table if not exists public.files (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  file_type text not null,
  file_url text not null,
  created_at timestamptz default now()
);

alter table public.files enable row level security;

create policy if not exists "Users can manage their own files"
  on public.files for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
