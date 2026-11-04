-- CÃONECT DIFF 002.2 — PERFIL, RAÇA, PROXIMIDADE E MURAL
-- Execute no SQL Editor somente do projeto caonect.
-- Preserva animais, usuários e solicitações existentes.
alter table public.pets add column if not exists breed text not null default 'Sem raça definida (SRD)';
alter table public.pets add column if not exists approximate_lat numeric(5,2);
alter table public.pets add column if not exists approximate_lng numeric(5,2);
alter table public.pets drop constraint if exists pets_approximate_lat_range;
alter table public.pets add constraint pets_approximate_lat_range check(approximate_lat between -90 and 90);
alter table public.pets drop constraint if exists pets_approximate_lng_range;
alter table public.pets add constraint pets_approximate_lng_range check(approximate_lng between -180 and 180);
alter table public.pets drop constraint if exists pets_breed_length;
alter table public.pets add constraint pets_breed_length check(length(breed) <= 80);
-- Protege a identidade do usuário e seu papel contra alterações no cliente.
create or replace function public.caonect_lock_profile_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.role is distinct from old.role then
    raise exception 'Não é permitido alterar a identidade ou o tipo de conta';
  end if;
  return new;
end $$;
drop trigger if exists caonect_profile_identity on public.profiles;
create trigger caonect_profile_identity before update on public.profiles
for each row execute function public.caonect_lock_profile_identity();

create table if not exists public.pet_activity (
 id bigint generated always as identity primary key,
 pet_id uuid not null references public.pets(id) on delete cascade,
 event_type text not null check(event_type in ('published','available','reserved','adopted')),
 pet_name text not null,
 district text not null,
 city text not null,
 created_at timestamptz not null default now()
);
create index if not exists pet_activity_recent_idx on public.pet_activity(created_at desc);
alter table public.pet_activity enable row level security;
revoke all on public.pet_activity from anon, authenticated;
grant select on public.pet_activity to anon, authenticated;
drop policy if exists activity_public_read on public.pet_activity;
create policy activity_public_read on public.pet_activity for select to anon,authenticated using(true);
-- O cliente NÃO pode inventar eventos: somente gatilho do banco.
create or replace function public.caonect_record_pet_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare event_name text;
begin
  if TG_OP = 'INSERT' then
    event_name := case when new.status = 'available' then 'published' else new.status end;
  elsif new.status is distinct from old.status then
    event_name := new.status;
  else
    return new;
  end if;
  insert into public.pet_activity(pet_id,event_type,pet_name,district,city)
  values(new.id,event_name,new.name,new.district,new.city);
  return new;
end $$;
drop trigger if exists caonect_pet_activity on public.pets;
create trigger caonect_pet_activity after insert or update of status on public.pets
for each row execute function public.caonect_record_pet_activity();
-- Retroativo: publica somente um evento inicial para pets existentes, sem
-- fingir mudanças de estado que não foram registradas no passado.
insert into public.pet_activity(pet_id,event_type,pet_name,district,city,created_at)
select p.id,case when p.status='available' then 'published' else p.status end,
p.name,p.district,p.city,p.created_at
from public.pets p
where not exists (select 1 from public.pet_activity a where a.pet_id=p.id);

-- Events são públicos para mostrar atividade agregada, sem nomes de adotantes,
-- telefones, mensagens ou dados de perfil.
