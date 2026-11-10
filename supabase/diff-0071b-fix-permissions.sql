-- Cãonect • DIFF 007.1B — correção de acesso à Central de Reencontros
-- Execute UMA VEZ no SQL Editor do MESMO projeto Supabase do Cãonect.
-- Não apaga registros e não modifica os recursos de adoção.
-- Causa: políticas RLS não substituem privilégios SQL (GRANT).
BEGIN;

-- Garante acesso somente às tabelas deste módulo.
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Mural público: qualquer visitante lê apenas o que as políticas RLS permitem.
GRANT SELECT ON TABLE public.lost_found_alerts TO anon;

-- O usuário autenticado pode publicar/editar/excluir apenas seus próprios
-- alertas conforme as políticas de RLS já criadas no DIFF 007.1.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lost_found_alerts TO authenticated;

-- Avistamentos e informações: nunca disponíveis a visitantes anônimos.
REVOKE ALL PRIVILEGES ON TABLE public.lost_found_tips FROM anon;
GRANT SELECT, INSERT ON TABLE public.lost_found_tips TO authenticated;

-- Reforço: ambas as tabelas mantêm o isolamento por políticas RLS.
ALTER TABLE public.lost_found_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_found_tips ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verificação (esperado: todos os valores TRUE).
SELECT
 has_table_privilege('anon','public.lost_found_alerts','SELECT') AS publico_consulta_alertas,
 has_table_privilege('authenticated','public.lost_found_alerts','SELECT') AS logado_consulta_alertas,
 has_table_privilege('authenticated','public.lost_found_alerts','INSERT') AS logado_cria_alertas,
 has_table_privilege('authenticated','public.lost_found_alerts','UPDATE') AS logado_edita_alertas,
 has_table_privilege('authenticated','public.lost_found_tips','SELECT') AS logado_consulta_avisos,
 has_table_privilege('authenticated','public.lost_found_tips','INSERT') AS logado_envia_avisos,
 NOT has_table_privilege('anon','public.lost_found_tips','SELECT') AS avisos_protegidos_de_anonimos;
