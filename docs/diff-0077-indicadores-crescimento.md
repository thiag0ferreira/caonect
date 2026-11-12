# Cãonect — DIFF 007.7 | Indicadores e Crescimento

## Objetivo
Criar uma aba **Indicadores** dentro do painel administrativo para acompanhar crescimento e impacto com dados **reais**, agregados no Supabase, sem expor contatos, conversas, perfis individuais ou coordenadas.

## Entregas
- **KPIs atuais, desde o início**: usuários e papéis, pets cadastrados/disponíveis/apontados como adotados, alertas perdidos/encontrados ativos, reencontros declarados e tempo médio de reencontro.
- **Evolução por mês**: novos usuários, pets cadastrados, alertas publicados, reencontros declarados (data em que o alerta de perdido foi resolvido). Filtro de 6 ou 12 meses, com meses vazios exibidos como zero.
- **Marcadores de adoção por mês**: conta pets distintos com evento `pet_activity.event_type='adopted'` naquele mês; não representa adoções comprovadas e pode diferir do status atual.
- **Cidades**: Brasília, Fernandópolis e registros de outras cidades/sem informação (esta última categoria só aparece se houver dados), com usuários, pets, adoções marcadas, alertas de perdidos ativos e resolvidos.
- **Exportar CSV**: dados mensais agregados, sem dados pessoais.
- **Atualização manual** e tabelas acessíveis acompanhando gráficos responsivos.
- Acesso **exclusivo a administradores** reconhecidos pelo Supabase no DIFF 007.6; uma conta comum não pode executar o RPC.

## Ativação no Supabase (obrigatória antes de testar)

1. **Faça backup** do banco e confirme que o DIFF 007.6 já foi aplicado e o painel Admin está funcionando.
2. Abra o <arquivo> `supabase/diff-0077-analytics.sql` no Pull Request do DIFF 007.7.
3. Execute no **SQL Editor do mesmo projeto Supabase** do Cãonect. O script cria apenas `public.caonect_admin_analytics(integer)`, com `SECURITY DEFINER`, verificação `caonect_private.require_admin()` e concessão `EXECUTE` somente para `authenticated`.
4. Não cole `service_role` ou chaves secretas no código.
5. Abra a versão Preview da branch e acesse `/?pagina=admin` com sua conta admin. A aba Indicadores será a inicial.

**Atenção:** executar o RPC no SQL Editor como usuário `postgres` **não simula** uma sessão autenticada e pode falhar na verificação `auth.uid()`. Teste a função via aplicativo logado. Para uma conta comum, o RPC deve retornar acesso negado.

## Homologação (sem dados fictícios)
- [ ] Conta administrativa: abas, contadores, filtros 6/12 meses e atualização carregam sem erro.
- [ ] Contadores batem com listas e consultas do Supabase (total de usuários, pets e seus status, alertas).
- [ ] Brasília e Fernandópolis aparecem com os valores existentes; cidades sem dados mostram zero.
- [ ] Gráfico de últimos 6 meses traz 6 colunas; filtro 12 meses traz 12 colunas; meses sem registros permanecem zerados.
- [ ] Alternar “Novos usuários”, “Pets cadastrados”, “Novos alertas” e “Reencontros declarados” muda os dados e o gráfico.
- [ ] Download CSV abre em planilha e contém apenas números agregados.
- [ ] Conta comum e visitante não acessam a aba nem recebem dados da função `caonect_admin_analytics` (não confiar só em esconder o menu).
- [ ] Pets com status `adopted` são **apontados como adotados** e alertas `lost/resolved` são **reencontros declarados**, sem se afirmar verificação independente.
- [ ] Verificar desktop, Android/PWA, menus, denúncias, aprovação de outras espécies, auditoria, chat e cadastro normal.
- [ ] A versão oficial `www.caonect.com.br` permanece inalterada até a aprovação do PR.

## Definições dos indicadores

| Indicador | Critério |
|---|---|
| Usuários | Registros em `profiles` |
| Protetores / ONGs | `profiles.role` autodeclarado; não implica verificação de ONG |
| Pets disponíveis | `pets.status='available'` e `review_status='approved'` |
| Pets apontados como adotados | `pets.status='adopted'` |
| Reencontros declarados | Alertas com `alert_type='lost'` e `status='resolved'`; evita dupla contagem de alertas `found` |
| Tempo médio até reencontro | Dias entre `event_date` e `resolved_at`, somente para alertas `lost/resolved` com datas válidas |
| Adoções marcadas no mês | `count(distinct pet_id)` de eventos `pet_activity.event_type='adopted'` no mês |
| Novos alertas | Anúncios `lost_found_alerts` criados no mês, qualquer situação posterior |
| Município | Campo textual de cidade do cadastro, sem geolocalização individual |

**Limitações:** não há comprovação independente de adoções ou reencontros, nem medição de visitas, conversões ou instalações do PWA nesta etapa. Um pet pode ter alterações de status; o histórico de eventos e o contador do status atual podem divergir. Dados excluídos fisicamente desaparecem dos totais. Recortes mensais usam **America/Sao_Paulo** e meses de calendário.

## Segurança e custos
- Nenhuma API externa, tracker de audiência, cookie ou serviço pago foi adicionado.
- A função agrega contagens no banco e retorna apenas números; não lê nem devolve telefone, email, mensagem, CPF ou endereço.
- Sem novas tabelas; função não modifica dados.
- O acesso é verificado no banco pela mesma lista privada de admins do DIFF 007.6.

## Publicação
- Branch `feat/diff-007-7-indicadores-crescimento` → PR para `main`.
- Aplicar SQL, validar na Preview, conferir build Cloudflare Pages, então integrar `main` e testar novamente.
- O DIFF 007.4 (correspondência inteligente) permanece em PR independente e **não deve** ser incluído neste lançamento.
