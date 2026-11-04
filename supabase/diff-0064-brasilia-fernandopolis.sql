-- DIFF 006.4 — Cãonect Brasília/DF + Fernandópolis/SP
-- Uma única base Supabase; preserva usuários, pets, fotos e chats.
begin;
alter table public.profiles add column if not exists state text;
alter table public.pets add column if not exists state text;

update public.profiles set state = case when lower(city) in ('fernandópolis','fernandopolis') then 'SP' else 'DF' end where state is null;
update public.pets set state = case when lower(city) in ('fernandópolis','fernandopolis') then 'SP' else 'DF' end where state is null;

alter table public.profiles alter column state set default 'DF';
alter table public.pets alter column state set default 'DF';
alter table public.profiles alter column state set not null;
alter table public.pets alter column state set not null;

-- Valida a cidade escolhida sem reescrever o endereço dos cadastros antigos.
create or replace function public.caonect_validate_city()
returns trigger language plpgsql set search_path = '' as $$
begin
 if new.city = 'Brasília' and new.state = 'DF' then return new; end if;
 if new.city = 'Fernandópolis' and new.state = 'SP' then return new; end if;
 raise exception 'Cidade/UF não atendida pelo Cãonect neste momento';
end $$;

drop trigger if exists caonect_city_profile_guard on public.profiles;
create trigger caonect_city_profile_guard before insert or update of city,state on public.profiles
for each row execute function public.caonect_validate_city();
drop trigger if exists caonect_city_pet_guard on public.pets;
create trigger caonect_city_pet_guard before insert or update of city,state on public.pets
for each row execute function public.caonect_validate_city();

-- A conta recém-criada recebe a cidade real informada durante o registro.
create or replace function public.handle_new_caonect_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_city text;
begin
 v_city := case when new.raw_user_meta_data->>'city' = 'Fernandópolis' then 'Fernandópolis' else 'Brasília' end;
 insert into public.profiles(id,display_name,role,city,state,district,neighborhood)
 values(
  new.id,
  left(coalesce(new.raw_user_meta_data->>'display_name',''),100),
  case when new.raw_user_meta_data->>'role' in ('adopter','protector','ngo')
    then new.raw_user_meta_data->>'role' else 'adopter' end,
  v_city,
  case when v_city='Fernandópolis' then 'SP' else 'DF' end,
  left(coalesce(new.raw_user_meta_data->>'district',''),80),
  left(coalesce(new.raw_user_meta_data->>'neighborhood',''),80)
 ) on conflict(id) do nothing;
 return new;
end $$;

create index if not exists caonect_pets_city_state_status
 on public.pets(state,city,status,created_at desc);

commit;

-- A Associação Pelos e Patas poderá criar sua conta como ONG.
-- NÃO registrar/verificar organizações automaticamente sem autenticação
-- e validação de vínculo com a associação.
