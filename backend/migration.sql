-- Coldstart migration — run in Supabase SQL Editor

-- === user_files ===
alter table user_files
  add column if not exists storage_path text;

alter table user_files
  add column if not exists uploaded_at timestamptz default now();

alter table user_files
  drop constraint if exists user_files_user_id_file_name_key;
alter table user_files
  add constraint user_files_user_id_file_name_key unique (user_id, file_name);

-- === user_integrations ===
alter table user_integrations
  drop constraint if exists user_integrations_user_id_provider_key;
alter table user_integrations
  add constraint user_integrations_user_id_provider_key unique (user_id, provider);

-- === user_projects ===
alter table user_projects
  add column if not exists description text default '';
alter table user_projects
  add column if not exists summary text default '';
alter table user_projects
  add column if not exists language text default '';
alter table user_projects
  add column if not exists languages jsonb default '[]'::jsonb;
alter table user_projects
  add column if not exists stars integer default 0;
alter table user_projects
  add column if not exists github_url text default '';
alter table user_projects
  add column if not exists updated_at timestamptz default now();

-- Unique constraint for UPSERT support
alter table user_projects
  drop constraint if exists user_projects_user_id_repo_name_key;
alter table user_projects
  add constraint user_projects_user_id_repo_name_key unique (user_id, repo_name);

-- Create unique index as well (belt and suspenders)
create unique index if not exists unique_user_project
  on user_projects (user_id, repo_name);

-- === Account deletion RPC ===
create or replace function delete_user_account()
returns void
language plpgsql
security definer
as $$
begin
  delete from user_integrations where user_id = auth.uid();
  delete from user_files where user_id = auth.uid();
  delete from user_projects where user_id = auth.uid();
  delete from gmail_connections where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;
