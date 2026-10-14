-- Tables
create table public.projects (
  id text primary key default gen_random_uuid()::text,
  title_id text, title_en text,
  description_id text, description_en text,
  image_path text,
  tags text,
  created_at timestamptz not null default now()
);
create table public.certificates (
  id text primary key default gen_random_uuid()::text,
  title_id text, title_en text,
  image_path text,
  created_at timestamptz not null default now()
);
create table public.skills (
  id text primary key default gen_random_uuid()::text,
  name varchar(100),
  image_path text,
  created_at timestamptz not null default now()
);
create table public.profiles (
  id int primary key default 1 check (id = 1),
  description_id text, description_en text,
  image_path text,
  cv_url1 text, cv_url2 text,
  updated_at timestamptz not null default now()
);
create table public.musics (
  id bigint generated always as identity primary key,
  title varchar(255), artist varchar(255),
  file_path text, cover_path text,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index musics_one_active on public.musics (is_active) where is_active;

-- Functions
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create function public.is_admin() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

create function public.set_active_music(p_id bigint) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.musics set is_active = false where is_active;
  update public.musics set is_active = true where id = p_id;
end $$;
revoke execute on function public.set_active_music(bigint) from public, anon;
grant execute on function public.set_active_music(bigint) to authenticated;

-- RLS
do $$
declare t text;
begin
  foreach t in array array['projects','certificates','skills','profiles','musics'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "public read" on public.%I for select using (true)', t);
    execute format('create policy "admin insert" on public.%I for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy "admin update" on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy "admin delete" on public.%I for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

-- Storage (public buckets: files readable by URL, no listing policy)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('projek','projek',true, 10485760, array['image/png','image/jpeg','image/webp','image/gif']),
  ('sertif','sertif',true, 10485760, array['image/png','image/jpeg','image/webp','image/x-icon','image/vnd.microsoft.icon']),
  ('skills','skills',true, 5242880,  array['image/png','image/jpeg','image/webp','image/svg+xml']),
  ('profile','profile',true, 10485760, array['image/png','image/jpeg','image/webp']),
  ('music','music',true, 31457280, array['audio/mpeg','audio/mp3','image/png','image/jpeg','image/webp']);

create policy "admin write uploads" on storage.objects for all to authenticated
  using (bucket_id in ('projek','sertif','skills','profile','music') and public.is_admin())
  with check (bucket_id in ('projek','sertif','skills','profile','music') and public.is_admin());
