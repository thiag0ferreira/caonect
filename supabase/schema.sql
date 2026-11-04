-- Cãonect DIFF 002 — executar no SQL Editor do projeto Supabase.
-- IMPORTANTE: não executar no banco de outra aplicação.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '',
 role text not null default 'adopter' check (role in ('adopter','protector','ngo')),
 city text not null default '',
 district text not null default '',
 phone text,
 created_at timestamptz not null default now()
);

create table if not exists public.pets (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 70),
 species text not null check (species in ('Cachorro','Gato')),
 size text not null check (size in ('Pequeno','Médio','Grande')),
 age_label text not null,
 city text not null,
 district text not null,
 color text not null default '',
 personality text[] not null default '{}',
 description text not null check (length(trim(description)) between 20 and 2000),
 image_url text,
 status text not null default 'available' check (status in ('available','reserved','adopted')),
 created_at timestamptz not null default now()
);
create index if not exists pets_status_created_idx on public.pets(status, created_at desc);
create index if not exists pets_owner_id_idx on public.pets(owner_id);
create index if not exists pets_location_idx on public.pets(city,district);

alter table public.profiles enable row level security;
alter table public.pets enable row level security;

-- Cada conta pode visualizar/editar apenas seus próprios dados pessoais.
drop policy if exists "profile_select_own" on public.profiles;
create policy "profile_select_own" on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists "profile_update_own" on public.profiles;
create policy "profile_update_own" on public.profiles for update to authenticated
 using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Profile INSERT só pelo gatilho SECURITY DEFINER, sem política de inserção do cliente.

-- Animais disponíveis têm leitura pública. O dono lê seus próprios animais em todos os status.
drop policy if exists "pets_select_public_or_owner" on public.pets;
create policy "pets_select_public_or_owner" on public.pets for select to anon,authenticated
 using (status = 'available' or owner_id = (select auth.uid()));

drop policy if exists "pets_insert_own_protectors" on public.pets;
create policy "pets_insert_own_protectors" on public.pets for insert to authenticated
 with check (
   owner_id = (select auth.uid())
   and exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('protector','ngo'))
 );

drop policy if exists "pets_update_own_protectors" on public.pets;
create policy "pets_update_own_protectors" on public.pets for update to authenticated
 using (owner_id = (select auth.uid()))
 with check (
   owner_id = (select auth.uid())
   and exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('protector','ngo'))
 );

drop policy if exists "pets_delete_own_protectors" on public.pets;
create policy "pets_delete_own_protectors" on public.pets for delete to authenticated
 using (owner_id = (select auth.uid()));

-- Gatilho: cria perfil ao registrar na Auth; dados de role serão futuramente verificados.
create or replace function public.handle_new_caonect_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
 insert into public.profiles(id, display_name,role,city,district)
 values(
  new.id,
  left(coalesce(new.raw_user_meta_data ->> 'display_name',''),100),
  case when new.raw_user_meta_data ->> 'role' in ('adopter','protector','ngo')
    then new.raw_user_meta_data ->> 'role' else 'adopter' end,
  left(coalesce(new.raw_user_meta_data ->> 'city',''),80),
  left(coalesce(new.raw_user_meta_data ->> 'district',''),80)
 )
 on conflict (id) do nothing;
 return new;
end
$$;
drop trigger if exists caonect_auth_user_created on auth.users;
create trigger caonect_auth_user_created after insert on auth.users
for each row execute function public.handle_new_caonect_user();

-- Fotos públicas somente no bucket pet-images; gravação na pasta do próprio usuário.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('pet-images','pet-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "pet_images_public_read" on storage.objects;
create policy "pet_images_public_read" on storage.objects for select to anon,authenticated
 using(bucket_id='pet-images');
drop policy if exists "pet_images_owner_insert" on storage.objects;
create policy "pet_images_owner_insert" on storage.objects for insert to authenticated
 with check(bucket_id='pet-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "pet_images_owner_delete" on storage.objects;
create policy "pet_images_owner_delete" on storage.objects for delete to authenticated
 using(bucket_id='pet-images' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Próxima fase: aprovação/verificação de ONGs, moderação e fluxo de adoção.
