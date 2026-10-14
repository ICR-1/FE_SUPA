create table public.contacts (
  id bigint generated always as identity primary key,
  email text not null check (char_length(email) between 5 and 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now()
);
create unique index contacts_email_unique on public.contacts (lower(email));
alter table public.contacts enable row level security;
create policy "visitor insert" on public.contacts for insert to anon, authenticated with check (char_length(email) <= 254);
create policy "admin read" on public.contacts for select to authenticated using (public.is_admin());
create policy "admin delete" on public.contacts for delete to authenticated using (public.is_admin());
