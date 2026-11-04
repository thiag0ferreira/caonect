-- DIFF 002.1 — relacionamentos e conversas reais.
-- Execute UMA VEZ no SQL Editor do projeto Cãonect, após schema.sql.
create table if not exists public.pet_favorites (
 user_id uuid not null references auth.users(id) on delete cascade,
 pet_id uuid not null references public.pets(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key (user_id, pet_id)
);
create table if not exists public.adoption_requests (
 id uuid primary key default gen_random_uuid(),
 pet_id uuid not null references public.pets(id) on delete cascade,
 adopter_id uuid not null references auth.users(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 intent text not null default 'question' check (intent in ('question','adoption')),
 status text not null default 'pending' check (status in ('pending','in_review','approved','rejected','cancelled')),
 created_at timestamptz not null default now(),
 unique(pet_id,adopter_id),
 check (adopter_id <> owner_id)
);
create table if not exists public.adoption_messages (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.adoption_requests(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(length(trim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index if not exists adoption_requests_owner_idx on public.adoption_requests(owner_id,created_at desc);
create index if not exists adoption_requests_adopter_idx on public.adoption_requests(adopter_id,created_at desc);
create index if not exists adoption_messages_request_idx on public.adoption_messages(request_id,created_at);
alter table public.pet_favorites enable row level security;
alter table public.adoption_requests enable row level security;
alter table public.adoption_messages enable row level security;
revoke all on public.pet_favorites, public.adoption_requests, public.adoption_messages from anon,authenticated;
grant select,insert,delete on public.pet_favorites to authenticated;
grant select,insert,update on public.adoption_requests to authenticated;
grant select,insert on public.adoption_messages to authenticated;

drop policy if exists fav_select_own on public.pet_favorites;
create policy fav_select_own on public.pet_favorites for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists fav_insert_own on public.pet_favorites;
create policy fav_insert_own on public.pet_favorites for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.pets p where p.id=pet_id and p.status='available'));
drop policy if exists fav_delete_own on public.pet_favorites;
create policy fav_delete_own on public.pet_favorites for delete to authenticated using(user_id=(select auth.uid()));

drop policy if exists requests_participants_read on public.adoption_requests;
create policy requests_participants_read on public.adoption_requests for select to authenticated
 using(adopter_id=(select auth.uid()) or owner_id=(select auth.uid()));
drop policy if exists requests_adopter_create on public.adoption_requests;
create policy requests_adopter_create on public.adoption_requests for insert to authenticated
 with check(
 adopter_id=(select auth.uid()) and adopter_id<>owner_id and status='pending'
 and exists(select 1 from public.pets p where p.id=pet_id and p.owner_id=owner_id and p.status='available')
 );
-- Somente o protetor pode atualizar uma solicitação; a atualização não pode
-- trocar identidade do pedido, graças ao gatilho abaixo.
drop policy if exists requests_owner_update on public.adoption_requests;
create policy requests_owner_update on public.adoption_requests for update to authenticated
 using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create or replace function public.lock_request_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
 if new.pet_id is distinct from old.pet_id or
    new.adopter_id is distinct from old.adopter_id or
    new.owner_id is distinct from old.owner_id or
    new.created_at is distinct from old.created_at then
    raise exception 'Os participantes da solicitação não podem ser alterados';
 end if;
 return new;
end $$;
drop trigger if exists lock_caonect_request_identity on public.adoption_requests;
create trigger lock_caonect_request_identity before update on public.adoption_requests
for each row execute function public.lock_request_identity();

drop policy if exists messages_participants_read on public.adoption_messages;
create policy messages_participants_read on public.adoption_messages for select to authenticated
 using(exists(select 1 from public.adoption_requests r where r.id=request_id
 and (r.adopter_id=(select auth.uid()) or r.owner_id=(select auth.uid()))));
drop policy if exists messages_participants_write on public.adoption_messages;
create policy messages_participants_write on public.adoption_messages for insert to authenticated
 with check(sender_id=(select auth.uid()) and exists(
 select 1 from public.adoption_requests r where r.id=request_id
 and (r.adopter_id=(select auth.uid()) or r.owner_id=(select auth.uid()))
 and r.status not in ('rejected','cancelled')
 ));
-- A troca de mensagens é privada entre os participantes da solicitação.
-- Não exponha e-mail e telefone do usuário na interface pública.
