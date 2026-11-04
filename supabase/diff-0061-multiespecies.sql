-- DIFF 006.1 — Cãonect multiespécies (Distrito Federal)
-- Execute no SQL Editor do MESMO projeto Supabase, depois dos DIFFs anteriores.
-- Preserva os cadastros de cães e gatos existentes.
begin;

alter table public.pets add column if not exists animal_category text;
alter table public.pets add column if not exists scientific_name text;
alter table public.pets add column if not exists legal_origin_notes text not null default '';
alter table public.pets add column if not exists review_status text not null default 'approved';

update public.pets
set animal_category=case species
 when 'Cachorro' then 'Cachorros'
 when 'Gato' then 'Gatos'
 else 'Outros' end
where animal_category is null;
alter table public.pets alter column animal_category set not null;

alter table public.pets drop constraint if exists pets_species_check;
alter table public.pets add constraint pets_species_check check (
 species in ('Cachorro','Gato','Calopsita','Canário','Periquito','Outra ave',
 'Hamster','Coelho','Porquinho-da-índia','Chinchila','Outro pequeno mamífero',
 'Serpente','Lagarto','Quelônio','Outro réptil','Peixe','Outro animal aquático','Outro animal')
);
alter table public.pets drop constraint if exists pets_animal_category_check;
alter table public.pets add constraint pets_animal_category_check check(
 animal_category in ('Cachorros','Gatos','Aves','Pequenos mamíferos','Répteis','Peixes e aquáticos','Outros')
);
alter table public.pets drop constraint if exists pets_review_status_check;
alter table public.pets add constraint pets_review_status_check check(review_status in ('approved','pending','rejected'));
alter table public.pets drop constraint if exists pets_scientific_name_len;
alter table public.pets add constraint pets_scientific_name_len check(scientific_name is null or length(scientific_name)<=120);
alter table public.pets drop constraint if exists pets_origin_note_len;
alter table public.pets add constraint pets_origin_note_len check(length(legal_origin_notes)<=1500);
alter table public.pets drop constraint if exists pets_category_species_check;
alter table public.pets add constraint pets_category_species_check check (
 (animal_category='Cachorros' and species='Cachorro') or
 (animal_category='Gatos' and species='Gato') or
 (animal_category='Aves' and species in ('Calopsita','Canário','Periquito','Outra ave')) or
 (animal_category='Pequenos mamíferos' and species in ('Hamster','Coelho','Porquinho-da-índia','Chinchila','Outro pequeno mamífero')) or
 (animal_category='Répteis' and species in ('Serpente','Lagarto','Quelônio','Outro réptil')) or
 (animal_category='Peixes e aquáticos' and species in ('Peixe','Outro animal aquático')) or
 (animal_category='Outros' and species='Outro animal')
);

-- Somente a conta administrativa/service_role pode definir a revisão.
-- Novas espécies ficam pendentes, mesmo que o autor altere o cadastro.
create or replace function public.caonect_review_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
 if tg_op='INSERT' then
   if new.animal_category in ('Cachorros','Gatos') then
     new.review_status='approved';
   else
     new.review_status='pending';
   end if;
 elsif (select auth.uid()) is not null then
   if new.review_status is distinct from old.review_status then
     raise exception 'A revisão do anúncio não pode ser alterada pelo anunciante';
   end if;
   if new.animal_category is distinct from old.animal_category or
      new.species is distinct from old.species then
      new.review_status=case when new.animal_category in ('Cachorros','Gatos')
        then 'approved' else 'pending' end;
   end if;
 end if;
 return new;
end $$;
drop trigger if exists caonect_pet_review_guard on public.pets;
create trigger caonect_pet_review_guard before insert or update on public.pets
for each row execute function public.caonect_review_guard();

-- A vitrine só exibe anúncios aprovados; donos continuam vendo seus cadastros.
drop policy if exists pets_select_public_or_owner on public.pets;
create policy pets_select_public_or_owner on public.pets for select to anon,authenticated
 using ((status='available' and review_status='approved') or owner_id=(select auth.uid()));

-- Impede que o público favorite ou solicite adoção de anúncios ainda pendentes.
drop policy if exists fav_insert_own on public.pet_favorites;
create policy fav_insert_own on public.pet_favorites for insert to authenticated
 with check(user_id=(select auth.uid()) and exists(
   select 1 from public.pets p where p.id=pet_id and p.status='available' and p.review_status='approved'
 ));
drop policy if exists requests_adopter_create on public.adoption_requests;
create policy requests_adopter_create on public.adoption_requests for insert to authenticated
 with check(adopter_id=(select auth.uid()) and adopter_id<>owner_id and status='pending'
  and exists(select 1 from public.pets p where p.id=pet_id and
     p.owner_id=owner_id and p.status='available' and p.review_status='approved'));

create index if not exists pets_category_review_idx on public.pets(animal_category,review_status,status,created_at desc);

-- Eventos de anúncios em revisão não devem aparecer no mural público.
drop policy if exists activity_public_read on public.pet_activity;
create policy activity_public_read on public.pet_activity for select to anon,authenticated
using(exists(select 1 from public.pets p where p.id=pet_id and p.review_status='approved'));

commit;

-- Após a execução: gatos/cães seguem aprovados, outras espécies aguardam revisão.
-- A verificação documental e a moderação de espécies reguladas serão implantadas
-- em DIFF posterior. Até lá não se oferece aprovação automática nem comercialização.
