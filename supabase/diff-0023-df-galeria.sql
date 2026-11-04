-- DIFF 002.3 — Brasília / 35 RAs / até 5 fotos
-- Execute no SQL Editor do projeto Cãonect após os DIFFs anteriores.
-- Não exclui fotografias ou animais existentes.
alter table public.profiles add column if not exists neighborhood text not null default '';
alter table public.pets add column if not exists neighborhood text not null default '';
alter table public.pets add column if not exists photo_urls text[] not null default '{}';
update public.pets
set photo_urls=array[image_url]
where coalesce(array_length(photo_urls,1),0)=0
and image_url is not null and length(trim(image_url))>0;

-- Não aceitar mais que cinco referências por pet, incluindo a foto principal.
alter table public.pets drop constraint if exists pets_max_five_photos;
alter table public.pets add constraint pets_max_five_photos
check(coalesce(array_length(photo_urls,1),0)<=5);

-- Novos registros recebem sempre a cidade Brasília;
-- cadastros antigos são preservados para revisão pelo protetor.
alter table public.profiles alter column city set default 'Brasília';
alter table public.pets alter column city set default 'Brasília';

-- NOTA: a edição da lista de fotos não remove arquivos do Storage:
-- isso evita exclusão acidental de conteúdo ainda referenciado.
-- Para produção: implementar limpeza de arquivos órfãos e validação
-- de propriedade das URLs no servidor. A RLS existente permanece ativa.

-- Os novos cadastros também armazenam o bairro/setor opcional.
create or replace function public.handle_new_caonect_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 insert into public.profiles(id,display_name,role,city,district,neighborhood)
 values (
  new.id,
  left(coalesce(new.raw_user_meta_data->>'display_name',''),100),
  case when new.raw_user_meta_data->>'role' in ('adopter','protector','ngo')
    then new.raw_user_meta_data->>'role' else 'adopter' end,
  'Brasília',
  left(coalesce(new.raw_user_meta_data->>'district',''),80),
  left(coalesce(new.raw_user_meta_data->>'neighborhood',''),80)
 )
 on conflict(id) do nothing;
 return new;
end $$;
