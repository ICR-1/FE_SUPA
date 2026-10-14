-- Urutan tampil yang bisa diatur lewat drag & drop di admin. NULL (item baru) tampil paling akhir.
alter table public.projects add column if not exists position integer;
alter table public.certificates add column if not exists position integer;
alter table public.skills add column if not exists position integer;

update public.projects t set position = r.rn from (select id, row_number() over (order by created_at) - 1 as rn from public.projects) r where t.id = r.id and t.position is null;
update public.certificates t set position = r.rn from (select id, row_number() over (order by created_at) - 1 as rn from public.certificates) r where t.id = r.id and t.position is null;
update public.skills t set position = r.rn from (select id, row_number() over (order by created_at) - 1 as rn from public.skills) r where t.id = r.id and t.position is null;

notify pgrst, 'reload schema';
