-- DIFF 003.1 — Identificação dos participantes no chat, com acesso restrito.
-- Executar no SQL Editor do Supabase do projeto Cãonect.
-- Não altera mensagens ou dados existentes.
-- Um participante pode visualizar somente nome, categoria e região geral
-- dos dois integrantes de UMA conversa em que ele próprio participa.
create or replace function public.caonect_conversation_people(p_request_id uuid)
returns table (
 user_id uuid,
 display_name text,
 role text,
 district text,
 neighborhood text,
 city text
)
language sql
stable
security definer
set search_path = ''
as $$
 select p.id, p.display_name, p.role, p.district, p.neighborhood, p.city
 from public.adoption_requests r
 join public.profiles p on (p.id = r.adopter_id or p.id = r.owner_id)
 where r.id = p_request_id
   and (r.adopter_id = (select auth.uid()) or r.owner_id = (select auth.uid()))
   and (select auth.uid()) is not null
$$;
revoke all on function public.caonect_conversation_people(uuid) from public, anon;
grant execute on function public.caonect_conversation_people(uuid) to authenticated;
-- Esta função não expõe email, telefone, endereço ou coordenadas.
-- O status aprovado não concede acesso automático a contatos privados.
