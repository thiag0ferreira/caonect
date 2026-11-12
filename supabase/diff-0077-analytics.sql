-- Cãonect • DIFF 007.7 — Indicadores e Crescimento
-- Executar no SQL Editor do MESMO Supabase, APÓS diff-0076-admin.sql.
-- Apenas um RPC de leitura agregada. Não altera nem exclui registros.
begin;

create or replace function public.caonect_admin_analytics(p_months integer default 6)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_months integer := case when p_months=12 then 12 else 6 end;
begin
  -- Reutiliza exatamente a autorização privada do DIFF 007.6.
  perform caonect_private.require_admin();

  return jsonb_build_object(
    'generated_at',now(),
    'months',v_months,

    'summary',jsonb_build_object(
      'users_total',(select count(*) from public.profiles),
      'adopters',(select count(*) from public.profiles where role='adopter'),
      'protectors',(select count(*) from public.profiles where role='protector'),
      'ngos',(select count(*) from public.profiles where role='ngo'),
      'pets_total',(select count(*) from public.pets),
      'pets_available',(select count(*) from public.pets where status='available' and review_status='approved'),
      'pets_adopted_declared',(select count(*) from public.pets where status='adopted'),
      'pets_pending',(select count(*) from public.pets where review_status='pending'),
      'lost_active',(select count(*) from public.lost_found_alerts
        where alert_type='lost' and status='active' and moderation_status='approved'),
      'found_active',(select count(*) from public.lost_found_alerts
        where alert_type='found' and status='active' and moderation_status='approved'),
      'lost_resolved_declared',(select count(*) from public.lost_found_alerts
        where alert_type='lost' and status='resolved'),
      'found_resolved_declared',(select count(*) from public.lost_found_alerts
        where alert_type='found' and status='resolved'),
      'pending_reports',(select count(*) from public.lost_found_reports where status='pending'),
      'reunion_avg_days',(
        select round(avg(((a.resolved_at at time zone 'America/Sao_Paulo')::date - a.event_date)::numeric),1)
        from public.lost_found_alerts a
        where a.alert_type='lost' and a.status='resolved'
          and a.resolved_at is not null
          and (a.resolved_at at time zone 'America/Sao_Paulo')::date >= a.event_date
      )
    ),

    'cities',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'city',c.city,
        'users',(select count(*) from public.profiles p where
          (case when p.city in ('Brasília','Fernandópolis') then p.city else 'Outras / não informada' end)=c.city),
        'pets',(select count(*) from public.pets p where
          (case when p.city in ('Brasília','Fernandópolis') then p.city else 'Outras / não informada' end)=c.city),
        'adopted_declared',(select count(*) from public.pets p where p.status='adopted' and
          (case when p.city in ('Brasília','Fernandópolis') then p.city else 'Outras / não informada' end)=c.city),
        'lost_active',(select count(*) from public.lost_found_alerts a where a.alert_type='lost'
          and a.status='active' and a.moderation_status='approved' and a.city=c.city),
        'lost_resolved_declared',(select count(*) from public.lost_found_alerts a
          where a.alert_type='lost' and a.status='resolved' and a.city=c.city)
      ) order by c.sort_order),'[]'::jsonb)
      from (values
        (1,'Brasília'),
        (2,'Fernandópolis'),
        (3,'Outras / não informada')
      ) as c(sort_order,city)
    ),

    'monthly',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'month',to_char(m.first_day,'YYYY-MM'),
        'users',(select count(*) from public.profiles p where
          (p.created_at at time zone 'America/Sao_Paulo')::date >= m.first_day and
          (p.created_at at time zone 'America/Sao_Paulo')::date < (m.first_day+interval '1 month')::date),
        'pets',(select count(*) from public.pets p where
          (p.created_at at time zone 'America/Sao_Paulo')::date >= m.first_day and
          (p.created_at at time zone 'America/Sao_Paulo')::date < (m.first_day+interval '1 month')::date),
        'alerts',(select count(*) from public.lost_found_alerts a where
          (a.created_at at time zone 'America/Sao_Paulo')::date >= m.first_day and
          (a.created_at at time zone 'America/Sao_Paulo')::date < (m.first_day+interval '1 month')::date),
        'reunions_declared',(select count(*) from public.lost_found_alerts a
          where a.alert_type='lost' and a.status='resolved' and a.resolved_at is not null
          and (a.resolved_at at time zone 'America/Sao_Paulo')::date >= m.first_day
          and (a.resolved_at at time zone 'America/Sao_Paulo')::date < (m.first_day+interval '1 month')::date),
        -- Eventos são marcações, não adoções verificadas. Podem incluir reversões.
        'adoption_marks',(select count(distinct h.pet_id) from public.pet_activity h
          where h.event_type='adopted'
          and (h.created_at at time zone 'America/Sao_Paulo')::date >= m.first_day
          and (h.created_at at time zone 'America/Sao_Paulo')::date < (m.first_day+interval '1 month')::date)
      ) order by m.first_day),'[]'::jsonb)
      from (
        select (date_trunc('month',now() at time zone 'America/Sao_Paulo')
          - make_interval(months=>i))::date as first_day
        from generate_series(v_months-1,0,-1) g(i)
      ) m
    )
  );
end;
$$;

revoke all on function public.caonect_admin_analytics(integer) from public, anon;
grant execute on function public.caonect_admin_analytics(integer) to authenticated;
commit;

-- Testes após executar:
-- Conta admin: select public.caonect_admin_analytics(6) (SQL Editor executa como role privilegiada
-- e não simula o JWT, portanto use o painel logado para testar a autorização).
-- Conta comum: chamada RPC retorna erro 'Acesso restrito à administração do Cãonect'.
-- Não disponibilizar o RPC ao usuário anônimo ou uma service_role no frontend.
