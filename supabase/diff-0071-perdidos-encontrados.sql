-- Cãonect • DIFF 007.1
-- Central de pets perdidos e encontrados | Brasília/DF e Fernandópolis/SP
-- Executar no SQL Editor do projeto após o DIFF 006.4.
-- NÃO modifica tabelas de pets, adoções, mensagens ou perfis existentes.
begin;

create table if not exists public.lost_found_alerts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  alert_type text not null check (alert_type in ('lost','found')),
  pet_name text,
  category text not null,
  species text not null,
  breed text not null default '',
  color text not null,
  size text not null check (size in ('Pequeno','Médio','Grande','Não sei')),
  characteristics text not null,
  behavior text not null default '',
  city text not null,
  state text not null,
  district text not null,
  approximate_area text not null default '',
  event_date date not null,
  custody_status text,
  description text not null default '',
  photo_paths text[] not null,
  status text not null default 'active' check (status in ('active','resolved','archived')),
  moderation_status text not null default 'approved'
    check (moderation_status in ('approved','pending','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint lf_city_check check (
    (city='Brasília' and state='DF') or
    (city='Fernandópolis' and state='SP')
  ),
  constraint lf_names_check check (
    length(coalesce(pet_name,''))<=80 and
    (alert_type='found' or length(trim(coalesce(pet_name,'')))>=2)
  ),
  constraint lf_text_check check (
    length(species) between 2 and 90 and
    length(category) between 2 and 90 and
    length(breed)<=100 and
    length(color) between 2 and 80 and
    length(characteristics) between 8 and 700 and
    length(behavior)<=400 and
    length(district) between 2 and 80 and
    length(approximate_area)<=160 and
    length(description)<=1500
  ),
  constraint lf_photo_count check(cardinality(photo_paths) between 1 and 3),
  constraint lf_event_date check(event_date <= current_date),
  constraint lf_custody_check check (
    (alert_type='lost' and custody_status is null) or
    (alert_type='found' and custody_status in (
      'with_me','with_organization','sighting_only','with_service'
    ))
  )
);

create table if not exists public.lost_found_tips (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.lost_found_alerts(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message text not null check(length(trim(message)) between 10 and 1500),
  sighting_date date,
  approximate_area text not null default '' check(length(approximate_area)<=160),
  created_at timestamptz not null default now(),
  constraint lf_tip_date_check check(sighting_date is null or sighting_date<=current_date)
);

create index if not exists lf_alert_search on public.lost_found_alerts
 (city,alert_type,status,moderation_status,created_at desc);
create index if not exists lf_alert_owner on public.lost_found_alerts(owner_id,created_at desc);
create index if not exists lf_tip_alert on public.lost_found_tips(alert_id,created_at desc);
create index if not exists lf_tip_sender on public.lost_found_tips(sender_id,created_at desc);

-- Garante a titularidade, os arquivos da própria conta e as transições de status.
-- O frontend envia apenas imagens JPEG reprocessadas antes do upload.
create or replace function public.caonect_lf_guard()
returns trigger language plpgsql set search_path = '' as $$
declare path text;
begin
  if new.event_date>current_date then
    raise exception 'A data não pode ser futura';
  end if;
  if tg_op='UPDATE' then
    if new.owner_id is distinct from old.owner_id or
       new.alert_type is distinct from old.alert_type then
      raise exception 'Não é possível transferir a titularidade ou trocar o tipo do alerta';
    end if;
    if (select auth.uid()) is not null and
       new.moderation_status is distinct from old.moderation_status then
      raise exception 'Somente a moderação pode alterar a análise do alerta';
    end if;
    if old.status='resolved' and new.status='active' then
      raise exception 'Para voltar a procurar, crie um novo alerta';
    end if;
  end if;

  if tg_op='INSERT' or
     new.species is distinct from old.species or
     new.category is distinct from old.category then
    if new.category in ('Cachorros','Gatos') and
       ((new.category='Cachorros' and new.species='Cachorro') or
        (new.category='Gatos' and new.species='Gato')) then
      new.moderation_status='approved';
    else
      new.moderation_status='pending';
    end if;
  end if;

  if cardinality(new.photo_paths) not between 1 and 3 then
    raise exception 'Adicione de 1 a 3 fotos';
  end if;
  foreach path in array new.photo_paths loop
    if path is null or
      path !~ ('^' || new.owner_id::text || '/[0-9a-f-]{36}\\.jpg$') then
      raise exception 'Os arquivos devem pertencer à pasta do responsável';
    end if;
  end loop;

  new.updated_at=now();
  new.resolved_at=case when new.status='resolved'
    then coalesce(new.resolved_at,now()) else null end;
  return new;
end $$;

drop trigger if exists caonect_lf_guard on public.lost_found_alerts;
create trigger caonect_lf_guard before insert or update
on public.lost_found_alerts for each row
execute function public.caonect_lf_guard();

alter table public.lost_found_alerts enable row level security;
alter table public.lost_found_tips enable row level security;

drop policy if exists lf_alert_read on public.lost_found_alerts;
create policy lf_alert_read on public.lost_found_alerts
for select to anon,authenticated
using (
  (moderation_status='approved' and status in ('active','resolved'))
  or owner_id=(select auth.uid())
);

drop policy if exists lf_alert_insert on public.lost_found_alerts;
create policy lf_alert_insert on public.lost_found_alerts
for insert to authenticated
with check(owner_id=(select auth.uid()));

drop policy if exists lf_alert_update on public.lost_found_alerts;
create policy lf_alert_update on public.lost_found_alerts
for update to authenticated
using(owner_id=(select auth.uid()))
with check(owner_id=(select auth.uid()));

drop policy if exists lf_alert_delete on public.lost_found_alerts;
create policy lf_alert_delete on public.lost_found_alerts
for delete to authenticated
using(owner_id=(select auth.uid()));

drop policy if exists lf_tip_read on public.lost_found_tips;
create policy lf_tip_read on public.lost_found_tips
for select to authenticated
using (
  sender_id=(select auth.uid()) or
  exists(
    select 1 from public.lost_found_alerts a
    where a.id=alert_id and a.owner_id=(select auth.uid())
  )
);

drop policy if exists lf_tip_insert on public.lost_found_tips;
create policy lf_tip_insert on public.lost_found_tips
for insert to authenticated
with check (
  sender_id=(select auth.uid()) and
  exists (
    select 1 from public.lost_found_alerts a
    where a.id=alert_id
      and a.owner_id<>(select auth.uid())
      and a.moderation_status='approved'
      and a.status='active'
  )
);

-- Fotos compartilhadas publicamente não devem conter EXIF.
-- A remoção acontece no navegador antes do upload.
-- O armazenamento restringe formato/tamanho; sanitização no servidor será
-- necessária antes de permitir fotos de terceiros sem revisão.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('lost-found-photos','lost-found-photos',true,2097152,array['image/jpeg'])
on conflict(id) do update set
  public=true,file_size_limit=2097152,allowed_mime_types=array['image/jpeg'];

drop policy if exists lf_photo_upload on storage.objects;
create policy lf_photo_upload on storage.objects
for insert to authenticated
with check (
  bucket_id='lost-found-photos' and
  (storage.foldername(name))[1]=(select auth.uid())::text
  and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f-]{36}\\.jpg$')
);

drop policy if exists lf_photo_delete on storage.objects;
create policy lf_photo_delete on storage.objects
for delete to authenticated
using (
  bucket_id='lost-found-photos' and
  (storage.foldername(name))[1]=(select auth.uid())::text
);

commit;

-- Observações:
-- 1) Anúncios de espécies além de cão/gato ficam pendentes até existir moderação.
-- 2) Fotos são públicas e passam por reprocessamento no cliente; não há
--    remoção EXIF garantida pelo servidor nesta versão.
-- 3) Nenhum telefone, endereço exato ou coordenada GPS é coletado.
-- 4) As informações privadas de avistamento ficam visíveis só ao emissor
--    e ao titular do alerta.
