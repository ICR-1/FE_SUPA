alter table public.projects
  add column link text check (link is null or (char_length(link) <= 500 and link ~* '^https?://[^\s]+$'));
