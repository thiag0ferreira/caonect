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
