-- CÃONECT DIFF 003.2 - FORMULÁRIO E CONCLUSÃO DE ADOÇÃO
-- Executar no SQL Editor após os DIFFs anteriores.
-- Preserva conversas e adoções existentes.
create table if not exists public.adoption_questionnaires (
 request_id uuid primary key references public.adoption_requests(id) on delete cascade,
 adopter_id uuid not null references auth.users(id) on delete cascade,
 housing text not null check (housing in ('casa','apartamento','outro')),
 household text not null check (household in ('sozinho','familia','compartilhado','outro')),
 children text not null check (children in ('sim','nao','prefiro_nao_informar')),
 other_pets text not null check (other_pets in ('sim','nao')),
 daily_time text not null check (daily_time in ('ate_2h','2_a_5h','mais_5h','varia')),
 experience text not null check (experience in ('primeira_vez','ja_tive','tenho_atualmente')),
 motivation text not null check (length(trim(motivation)) between 20 and 1500),
 created_at timestamptz not null default now()
);
create index if not exists adoption_questionnaires_adopter_idx on public.adoption_questionnaires(adopter_id);
alter table public.adoption_questionnaires enable row level security;
revoke all on public.adoption_questionnaires from anon,authenticated;
grant select,insert on public.adoption_questionnaires to authenticated;
drop policy if exists questionnaire_participants_read on public.adoption_questionnaires;
create policy questionnaire_participants_read on public.adoption_questionnaires
 for select to authenticated using (
   exists(select 1 from public.adoption_requests r
    where r.id=request_id and
    (r.adopter_id=(select auth.uid()) or r.owner_id=(select auth.uid())))
 );
drop policy if exists questionnaire_adopter_insert on public.adoption_questionnaires;
create policy questionnaire_adopter_insert on public.adoption_questionnaires
 for insert to authenticated with check (
   adopter_id=(select auth.uid()) and exists(
      select 1 from public.adoption_requests r
      where r.id=request_id and r.adopter_id=(select auth.uid())
        and r.status not in ('rejected','cancelled','completed')
   )
 );
-- Um questionário já enviado não pode ser alterado pelo usuário.
-- Para responder novamente, será necessário um fluxo específico de revisão.

alter table public.adoption_requests drop constraint if exists adoption_requests_status_check;
alter table public.adoption_requests add constraint adoption_requests_status_check
 check(status in ('pending','in_review','approved','rejected','cancelled','completed'));
alter table public.adoption_requests add column if not exists completed_at timestamptz;

-- A conclusão da adoção ocorre em uma única transação no banco.
-- Só o responsável pelo animal pode concluir uma solicitação já aprovada,
-- e o animal precisa estar disponível ou reservado.
create or replace function public.caonect_complete_adoption(p_request_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_request public.adoption_requests%rowtype;
declare v_pet_status text;
begin
 select * into v_request from public.adoption_requests
 where id=p_request_id for update;
 if not found then raise exception 'Solicitação não encontrada'; end if;
 if (select auth.uid()) is null or v_request.owner_id <> (select auth.uid())
 then raise exception 'Operação não autorizada'; end if;
 if v_request.status <> 'approved' then
   raise exception 'A solicitação precisa estar aprovada antes da conclusão';
 end if;
 select status into v_pet_status from public.pets
 where id=v_request.pet_id and owner_id=v_request.owner_id for update;
 if v_pet_status is null or v_pet_status not in ('available','reserved') then
   raise exception 'Este pet não está disponível para conclusão';
 end if;
 update public.pets set status='adopted' where id=v_request.pet_id;
 update public.adoption_requests set status='completed',completed_at=now()
  where id=p_request_id;
 -- Pedidos de outras pessoas são encerrados sem exposição dos dados privados.
 update public.adoption_requests set status='rejected'
  where pet_id=v_request.pet_id and id<>p_request_id
    and status in ('pending','in_review','approved');
end $$;
revoke all on function public.caonect_complete_adoption(uuid) from public,anon;
grant execute on function public.caonect_complete_adoption(uuid) to authenticated;

-- Bloqueia conclusão direta pelo cliente: somente o procedimento atômico
-- pode registrar status completed e completed_at.
-- O papel de Postgres que executa a função de conclusão bypassa a RLS,
-- mas este trigger verifica a identidade do responsável via auth.uid().
create or replace function public.caonect_guard_completed_request()
returns trigger language plpgsql set search_path = ''
as $$
begin
 if new.status='completed' and old.status is distinct from 'completed' then
   if new.completed_at is null or old.status<>'approved' or
     not exists(select 1 from public.pets where id=new.pet_id and status='adopted') then
     raise exception 'Conclusão inválida. Utilize o fluxo de adoção';
   end if;
 end if;
 if old.status='completed' and new.status<>'completed' then
   raise exception 'Uma adoção concluída não pode ser reaberta';
 end if;
 return new;
end $$;
drop trigger if exists caonect_guard_completed on public.adoption_requests;
create trigger caonect_guard_completed before update on public.adoption_requests
for each row execute function public.caonect_guard_completed_request();

-- Acessos antigos são mantidos. O status approved significa aprovação
-- da solicitação, NÃO que o pet foi entregue.
