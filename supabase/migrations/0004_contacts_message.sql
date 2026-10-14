drop index if exists public.contacts_email_unique;
alter table public.contacts
  add column name text check (name is null or char_length(name) between 1 and 100),
  add column message text check (message is null or char_length(message) between 1 and 2000);
drop policy "visitor insert" on public.contacts;
create policy "visitor insert" on public.contacts for insert to anon, authenticated
  with check (char_length(email) <= 254 and char_length(btrim(name)) between 1 and 100 and char_length(btrim(message)) between 1 and 2000);
