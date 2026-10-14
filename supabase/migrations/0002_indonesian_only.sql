alter table public.projects drop column title_en, drop column description_en;
alter table public.projects rename column title_id to title;
alter table public.projects rename column description_id to description;
alter table public.certificates drop column title_en;
alter table public.certificates rename column title_id to title;
alter table public.profiles drop column description_en;
alter table public.profiles rename column description_id to description;
