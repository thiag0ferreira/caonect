-- Cãonect • DIFF 007.2.1 — Proteção contra abuso e estabilização
-- APLICAR no Supabase SQL Editor ANTES de publicar o frontend desta branch.
-- Não altera dados de adoção, pets, chats, perfis, nem remove alertas existentes.
begin;

-- 1. Histórico de denúncias, restrito a quem denunciou e à equipe via SQL Editor.
create table if not exists public.lost_found_reports (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.lost_found_alerts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam','fraud','abuse','privacy','misinformation','other')),
  details text not null default '' check (length(details) <= 600),
  status text not null default 'pending' check (status in ('pending','reviewed','dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (alert_id, reporter_id),
  constraint lf_report_details_check check (reason <> 'other' or length(trim(details)) >= 10)
);

create index if not exists lf_reports_pending on public.lost_found_reports(status,created_at desc);
create index if not exists lf_reports_user on public.lost_found_reports(reporter_id,created_at desc);

alter table public.lost_found_reports enable row level security;
revoke all on table public.lost_found_reports from public, anon;
grant select, insert on table public.lost_found_reports to authenticated;
drop policy if exists lf_report_read on public.lost_found_reports;
create policy lf_report_read on public.lost_found_reports
  for select to authenticated
  using (reporter_id = (select auth.uid()));
drop policy if exists lf_report_insert on public.lost_found_reports;
create policy lf_report_insert on public.lost_found_reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'pending'
    and reviewed_at is null
    and exists (
      select 1 from public.lost_found_alerts a
      where a.id = alert_id and a.owner_id <> (select auth.uid())
        and a.status in ('active','resolved')
        and a.moderation_status = 'approved'
    )
  );

-- 2. Limitar avisos por usuário (não apenas no navegador).
-- O bloqueio transacional por usuário reduz corridas entre requisições paralelas.
create or replace function public.caonect_lf_tip_guard()
returns trigger language plpgsql set search_path = '' as $$
declare recent_hour integer;
declare recent_same integer;
begin
  if (select auth.uid()) is not null and new.sender_id <> (select auth.uid()) then
    raise exception 'O remetente deve ser a conta autenticada';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.sender_id::text, 70121));
  select count(*) into recent_hour from public.lost_found_tips t
    where t.sender_id = new.sender_id
      and t.created_at >= now() - interval '1 hour';
  if recent_hour >= 6 then
    raise exception 'Limite de seis mensagens por hora. Tente novamente mais tarde.';
  end if;

  select count(*) into recent_same from public.lost_found_tips t
    where t.sender_id = new.sender_id and t.alert_id = new.alert_id
      and t.created_at >= now() - interval '10 minutes';
  if recent_same >= 2 then
    raise exception 'Aguarde antes de enviar outra informação para este alerta.';
  end if;

  new.created_at = now();
  return new;
end $$;

drop trigger if exists caonect_lf_tip_guard on public.lost_found_tips;
create trigger caonect_lf_tip_guard before insert on public.lost_found_tips
for each row execute function public.caonect_lf_tip_guard();

-- 3. Limitar denúncias por pessoa e impedir alterações forjadas no histórico.
create or replace function public.caonect_lf_report_guard()
returns trigger language plpgsql set search_path = '' as $$
declare n integer;
begin
  if (select auth.uid()) is not null and new.reporter_id <> (select auth.uid()) then
    raise exception 'Denúncia deve pertencer à conta autenticada';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.reporter_id::text, 70122));
  select count(*) into n from public.lost_found_reports r
    where r.reporter_id = new.reporter_id
      and r.created_at >= now() - interval '24 hours';
  if n >= 10 then
    raise exception 'Limite de denúncias atingido. Tente novamente mais tarde.';
  end if;
  new.status = 'pending';
  new.reviewed_at = null;
  new.created_at = now();
  return new;
end $$;

drop trigger if exists caonect_lf_report_guard on public.lost_found_reports;
create trigger caonect_lf_report_guard before insert on public.lost_found_reports
for each row execute function public.caonect_lf_report_guard();

-- 4. Não permitir forjar a data original nem reabrir anúncios concluídos.
-- Guarda existente mantida; adicionamos uma função separada para proteger auditoria.
create or replace function public.caonect_lf_audit_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_at = now();
    new.resolved_at = case when new.status = 'resolved' then now() else null end;
  else
    new.created_at = old.created_at;
    new.resolved_at = case
      when new.status = 'resolved' and old.status = 'resolved' then old.resolved_at
      when new.status = 'resolved' then now()
      else null end;
    if old.status = 'archived' and new.status <> 'archived' then
      raise exception 'Alerta arquivado. Crie outro anúncio para reabrir.';
    end if;
    if old.status = 'resolved' and new.status = 'active' then
      raise exception 'Reencontro concluído. Crie outro anúncio para reabrir.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists caonect_lf_audit_guard on public.lost_found_alerts;
create trigger caonect_lf_audit_guard
  before insert or update on public.lost_found_alerts
  for each row execute function public.caonect_lf_audit_guard();

commit;

-- VERIFICAÇÕES (executar junto; nenhuma modificação adicional)
select
  (select relrowsecurity from pg_catalog.pg_class where oid='public.lost_found_alerts'::regclass) as alertas_com_rls,
  (select relrowsecurity from pg_catalog.pg_class where oid='public.lost_found_tips'::regclass) as avisos_com_rls,
  (select relrowsecurity from pg_catalog.pg_class where oid='public.lost_found_reports'::regclass) as denuncias_com_rls,
  pg_catalog.has_table_privilege('authenticated','public.lost_found_reports','INSERT') as logado_pode_denunciar,
  not pg_catalog.has_table_privilege('anon','public.lost_found_reports','SELECT') as denuncias_privadas,
  not pg_catalog.has_table_privilege('anon','public.lost_found_tips','SELECT') as avisos_privados;

-- IMPORTANTE: denúncias vão para a tabela lost_found_reports e precisam
-- ser acompanhadas manualmente pela equipe no SQL Editor.
-- Não há bloqueio automático nem painel administrativo nesta versão.
