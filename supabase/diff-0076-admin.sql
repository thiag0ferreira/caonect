-- Cãonect • DIFF 007.6 — Painel administrativo e moderação auditável
-- Aplicar UMA VEZ no SQL Editor do mesmo projeto Supabase.
-- PRÉ-REQUISITOS: schema.sql, diff-0061, diff-0071, diff-00721.
-- ATENÇÃO: a equipe administrativa NÃO é definida por role do perfil nem por email.
-- Após executar, cadastrar os UUIDs dos administradores conforme documento de homologação.
begin;

-- A lista de administradores e o histórico de ações não são expostos por API.
create schema if not exists caonect_private;
revoke all on schema caonect_private from public, anon, authenticated;
create table if not exists caonect_private.admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 added_at timestamptz not null default now(),
 revoked_at timestamptz
);
create table if not exists caonect_private.moderation_audit (
 id bigint generated always as identity primary key,
 actor_id uuid not null references auth.users(id),
 entity_type text not null check (entity_type in ('pet','alert','report')),
 entity_id uuid not null,
 action text not null,
 note text not null,
 previous_state text,
 next_state text,
 created_at timestamptz not null default now()
);
create index if not exists moderation_audit_created_idx
 on caonect_private.moderation_audit(created_at desc);
revoke all on all tables in schema caonect_private from public, anon, authenticated;
revoke all on all sequences in schema caonect_private from public, anon, authenticated;

-- Somente RPC SECURITY DEFINER pode consultar as tabelas privadas.
create or replace function caonect_private.require_admin()
returns void language plpgsql security definer set search_path = '' as $$
begin
 if (select auth.uid()) is null or not exists(
   select 1 from caonect_private.admins a
   where a.user_id = (select auth.uid()) and a.revoked_at is null
 ) then
  raise exception 'Acesso restrito à administração do Cãonect' using errcode='42501';
 end if;
end $$;
revoke all on function caonect_private.require_admin() from public, anon, authenticated;

create or replace function public.caonect_admin_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
 select (select auth.uid()) is not null and exists(
  select 1 from caonect_private.admins a
  where a.user_id = (select auth.uid()) and a.revoked_at is null
 );
$$;
revoke all on function public.caonect_admin_is_admin() from public, anon;
grant execute on function public.caonect_admin_is_admin() to authenticated;

-- Os contadores respeitam a permissão de administrador verificada no servidor.
create or replace function public.caonect_admin_dashboard()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
 perform caonect_private.require_admin();
 return jsonb_build_object(
  'users', (select count(*) from public.profiles),
  'pets', (select count(*) from public.pets),
  'pending_pets', (select count(*) from public.pets where review_status='pending'),
  'pending_alerts', (select count(*) from public.lost_found_alerts where moderation_status='pending'),
  'pending_reports', (select count(*) from public.lost_found_reports where status='pending'),
  'active_alerts', (select count(*) from public.lost_found_alerts where status='active' and moderation_status='approved')
 );
end $$;
revoke all on function public.caonect_admin_dashboard() from public, anon;
grant execute on function public.caonect_admin_dashboard() to authenticated;

-- Resultados paginados e com campos mínimos; sem email, telefone ou localização GPS.
create or replace function public.caonect_admin_list(
 p_section text, p_limit integer default 50, p_offset integer default 0
)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare n integer := greatest(1,least(coalesce(p_limit,50),100));
declare skip integer := greatest(0,coalesce(p_offset,0));
begin
 perform caonect_private.require_admin();
 if p_section='reports' then
  return coalesce((
   select jsonb_agg(to_jsonb(row_data) order by row_data.created_at desc)
   from (
     select r.id,r.alert_id,r.reason,r.details,r.status,r.created_at,
       a.pet_name as alert_name,a.alert_type,a.species,a.city,a.district,
       a.status as alert_status,a.moderation_status as alert_moderation
     from public.lost_found_reports r
     left join public.lost_found_alerts a on a.id=r.alert_id
     order by r.created_at desc limit n offset skip
   ) row_data
  ),'[]'::jsonb);
 elsif p_section='pets' then
  return coalesce((
   select jsonb_agg(to_jsonb(row_data) order by row_data.created_at desc)
   from (
     select p.id,p.owner_id,p.name,p.species,p.animal_category,p.review_status,
       p.status,p.legal_origin_notes,p.scientific_name,p.city,p.district,
       p.description,p.image_url,p.photo_urls,p.created_at,
       coalesce(pr.display_name,'') as owner_name
     from public.pets p
     left join public.profiles pr on pr.id=p.owner_id
     order by (p.review_status='pending') desc,p.created_at desc
     limit n offset skip
   ) row_data
  ),'[]'::jsonb);
 elsif p_section='alerts' then
  return coalesce((
   select jsonb_agg(to_jsonb(row_data) order by row_data.created_at desc)
   from (
     select a.id,a.owner_id,a.alert_type,a.pet_name,a.category,a.species,
       a.color,a.city,a.district,a.status,a.moderation_status,a.photo_paths,
       a.characteristics,a.description,a.created_at,
       coalesce(pr.display_name,'') as owner_name
     from public.lost_found_alerts a
     left join public.profiles pr on pr.id=a.owner_id
     order by (a.moderation_status='pending') desc,a.created_at desc
     limit n offset skip
   ) row_data
  ),'[]'::jsonb);
 elsif p_section='users' then
  return coalesce((
   select jsonb_agg(to_jsonb(row_data) order by row_data.created_at desc)
   from (
     select p.id,p.display_name,p.role,p.city,p.district,p.created_at,
       (select count(*) from public.pets pe where pe.owner_id=p.id) as pets_count,
       (select count(*) from public.lost_found_alerts la where la.owner_id=p.id) as alerts_count
     from public.profiles p
     order by p.created_at desc limit n offset skip
   ) row_data
  ),'[]'::jsonb);
 else
  raise exception 'Seção administrativa inválida' using errcode='22023';
 end if;
end $$;
revoke all on function public.caonect_admin_list(text,integer,integer) from public, anon;
grant execute on function public.caonect_admin_list(text,integer,integer) to authenticated;

-- Triggers originais continuam protegendo o anunciante. Só o RPC confiável,
-- executado como postgres, pode alterar o estado de moderação.
-- O sinal de contexto é LOCAL à transação e é verificado JUNTO com current_user.
create or replace function public.caonect_review_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
 if tg_op='INSERT' then
  if new.animal_category in ('Cachorros','Gatos') then
   new.review_status='approved';
  else
   new.review_status='pending';
  end if;
 elsif (select auth.uid()) is not null and not (
   current_user='postgres'
   and coalesce(current_setting('caonect.admin_action',true),'')='on'
 ) then
  if new.review_status is distinct from old.review_status then
   raise exception 'A revisão do anúncio não pode ser alterada pelo anunciante';
  end if;
  if new.animal_category is distinct from old.animal_category or
     new.species is distinct from old.species then
   new.review_status=case when old.review_status='approved'
       and old.animal_category in ('Cachorros','Gatos')
       and new.animal_category in ('Cachorros','Gatos') then 'approved'
     else 'pending' end;
  elsif new.animal_category not in ('Cachorros','Gatos')
    and (
      new.description is distinct from old.description or
      new.image_url is distinct from old.image_url or
      new.photo_urls is distinct from old.photo_urls or
      new.legal_origin_notes is distinct from old.legal_origin_notes or
      new.scientific_name is distinct from old.scientific_name or
      new.breed is distinct from old.breed
    ) then
    -- Conteúdo e comprovação alterados após avaliação EXIGEM nova revisão.
    new.review_status='pending';
  end if;
 end if;
 return new;
end $$;

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
  if (select auth.uid()) is not null
     and new.moderation_status is distinct from old.moderation_status
     and not (current_user='postgres'
         and coalesce(current_setting('caonect.admin_action',true),'')='on') then
   raise exception 'Somente a moderação pode alterar a análise do alerta';
  end if;
  if old.status='resolved' and new.status='active' then
   raise exception 'Para voltar a procurar, crie um novo alerta';
  end if;
 end if;
 if tg_op='INSERT' then
  new.moderation_status=case
   when (new.category='Cachorros' and new.species='Cachorro')
     or (new.category='Gatos' and new.species='Gato') then 'approved'
   else 'pending' end;
 elsif new.species is distinct from old.species or new.category is distinct from old.category then
  new.moderation_status=case
   when old.moderation_status='approved'
    and old.category in ('Cachorros','Gatos')
    and ((new.category='Cachorros' and new.species='Cachorro')
      or (new.category='Gatos' and new.species='Gato')) then 'approved'
   else 'pending' end;
 elsif tg_op='UPDATE'
    and new.category not in ('Cachorros','Gatos')
    and (select auth.uid()) is not null
    and not (current_user='postgres' and coalesce(current_setting('caonect.admin_action',true),'')='on')
    and (
     new.description is distinct from old.description or
     new.characteristics is distinct from old.characteristics or
     new.behavior is distinct from old.behavior or
     new.photo_paths is distinct from old.photo_paths or
     new.color is distinct from old.color
    ) then
  -- Edição de anúncio especial previamente aprovado volta à fila de revisão.
  new.moderation_status='pending';
 end if;
 if cardinality(new.photo_paths) not between 1 and 3 then
  raise exception 'Adicione de 1 a 3 fotos';
 end if;
 foreach path in array new.photo_paths loop
  if path is null or path !~ ('^' || new.owner_id::text || '/[0-9a-f-]{36}\.jpg$') then
   raise exception 'Os arquivos devem pertencer à pasta do responsável';
  end if;
 end loop;
 new.updated_at=now();
 new.resolved_at=case when new.status='resolved'
   then coalesce(new.resolved_at,now()) else null end;
 return new;
end $$;

-- Operações tipadas, auditadas e com motivo obrigatório.
-- Não existe exclusão física de cadastros, mensagens ou imagens.
create or replace function public.caonect_admin_moderate(
 p_entity text, p_id uuid, p_action text, p_note text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare before_state text;
declare after_state text;
declare animal_category text;
declare origin_notes text;
declare v_status text;
begin
 perform caonect_private.require_admin();
 if p_id is null or length(trim(coalesce(p_note,'')))<10
   or length(p_note)>1000 then
  raise exception 'Informe uma justificativa de 10 a 1000 caracteres' using errcode='22023';
 end if;
 if p_entity not in ('pet','alert','report') then
  raise exception 'Tipo de conteúdo inválido' using errcode='22023';
 end if;

 -- Com a role postgres, o gatilho permite alteração de revisão APENAS
 -- com este sinal de contexto de transação (nenhuma permissão no cliente).
 perform set_config('caonect.admin_action','on',true);

 if p_entity='pet' then
  if p_action not in ('approve','reject','hide') then
   raise exception 'Ação inválida para animal' using errcode='22023';
  end if;
  select p.review_status,p.animal_category,p.legal_origin_notes
    into before_state,animal_category,origin_notes
    from public.pets p where p.id=p_id for update;
  if not found then raise exception 'Animal não encontrado' using errcode='P0002'; end if;

  -- Espécies que exigem análise não podem ser aprovadas sem informação
  -- mínima de origem; a verificação efetiva da documentação é manual.
  if p_action='approve' and animal_category not in ('Cachorros','Gatos')
    and length(trim(coalesce(origin_notes,'')))<15 then
   raise exception 'Exija informações de origem legal e confira os documentos antes de aprovar' using errcode='22023';
  end if;
  v_status=case when p_action='approve' then 'approved' else 'rejected' end;
  update public.pets set review_status=v_status where id=p_id;
  after_state=v_status;

 elsif p_entity='alert' then
  if p_action not in ('approve','reject','archive') then
   raise exception 'Ação inválida para alerta' using errcode='22023';
  end if;
  select a.moderation_status||'/'||a.status
    into before_state from public.lost_found_alerts a where a.id=p_id for update;
  if not found then raise exception 'Alerta não encontrado' using errcode='P0002'; end if;
  if p_action='archive' then
   update public.lost_found_alerts set status='archived' where id=p_id;
  else
   update public.lost_found_alerts
    set moderation_status=case when p_action='approve' then 'approved' else 'rejected' end
    where id=p_id;
  end if;
  select a.moderation_status||'/'||a.status into after_state
    from public.lost_found_alerts a where a.id=p_id;

 else
  if p_action not in ('reviewed','dismissed') then
   raise exception 'Ação inválida para denúncia' using errcode='22023';
  end if;
  select r.status into before_state from public.lost_found_reports r
   where r.id=p_id for update;
  if not found then raise exception 'Denúncia não encontrada' using errcode='P0002'; end if;
  update public.lost_found_reports set status=p_action,reviewed_at=now() where id=p_id;
  after_state=p_action;
 end if;

 perform set_config('caonect.admin_action','off',true);
 insert into caonect_private.moderation_audit
  (actor_id,entity_type,entity_id,action,note,previous_state,next_state)
 values ((select auth.uid()),p_entity,p_id,p_action,trim(p_note),before_state,after_state);
 return jsonb_build_object('ok',true,'entity',p_entity,'action',p_action,'state',after_state);
end $$;
revoke all on function public.caonect_admin_moderate(text,uuid,text,text) from public, anon;
grant execute on function public.caonect_admin_moderate(text,uuid,text,text) to authenticated;

-- O histórico é somente leitura pelo RPC. Sem identificação de denunciantes.
create or replace function public.caonect_admin_audit(p_limit integer default 40)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
 perform caonect_private.require_admin();
 return coalesce((
  select jsonb_agg(to_jsonb(x) order by x.created_at desc)
  from (select id,actor_id,entity_type,entity_id,action,note,previous_state,
          next_state,created_at
        from caonect_private.moderation_audit
        order by created_at desc limit greatest(1,least(coalesce(p_limit,40),100))) x
 ),'[]'::jsonb);
end $$;
revoke all on function public.caonect_admin_audit(integer) from public, anon;
grant execute on function public.caonect_admin_audit(integer) to authenticated;

commit;

-- CHECKLIST DE ATIVAÇÃO (executar separadamente após o script):
-- 1) Supabase > Authentication > Users > copie o UID da SUA conta.
-- 2) No SQL Editor, substitua o UUID e execute SOMENTE:
--    insert into caonect_private.admins(user_id) values ('COLE_O_UUID_AQUI'::uuid)
--    on conflict(user_id) do update set revoked_at=null;
-- 3) Abra a versão Preview do Cãonect e entre com essa conta.
-- 4) NUNCA coloque service_role nem UUID administrador no React, .env ou GitHub.
-- 5) Não adicione contas apenas pelo e-mail sem validar o UUID autenticado.
