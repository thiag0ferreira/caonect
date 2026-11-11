# Cãonect — DIFF 007.6 | Painel Administrativo

## Entrega
Painel de gestão exclusivo, baseado em autorização no Supabase (não em componente oculto na interface).

**Incluído:** indicadores, denúncias, fila de aprovação de animais de outras espécies, moderação de alertas de perdidos/encontrados, listagem limitada de usuários, trilha de auditoria e justificativas obrigatórias.

**Não incluído:** leitura de chat privado, senhas, bloqueio/suspensão de contas, envio de notificações, exclusão física de arquivos ou dados, verificação automática da legalidade de animais.

## Etapa obrigatória: SQL do mesmo Supabase

1. Abra Supabase → SQL Editor do **projeto atual** do Cãonect.
2. Faça backup da base antes de executar migrações em produção.
3. Abra o arquivo `supabase/diff-0076-admin.sql` do PR #4.
4. Execute o script completo. Ele usa transação; **não recria** `pets`, `profiles`, `lost_found_alerts` nem apaga dados.
5. Confirme ausência de erros. Nenhuma alteração de credenciais, domínio, DNS ou PWA é necessária.
6. Supabase → Authentication → Users: localize **sua própria conta de login** no Cãonect e copie o **UID (UUID)**, conferindo que é a conta certa.
7. Execute **separadamente** no SQL Editor, substituindo o UUID abaixo (não coloque seu e-mail ou senha no código):

```sql
insert into caonect_private.admins(user_id)
values ('COLE_AQUI_O_UID_DA_SUA_CONTA'::uuid)
on conflict (user_id) do update set revoked_at=null;
```

O script **não adiciona nenhum administrador automaticamente**. Isso é intencional; nenhuma conta comum deve virar admin por erro.

Para **revogar** o acesso, somente no SQL Editor:

```sql
update caonect_private.admins
set revoked_at=now()
where user_id='UID_DA_CONTA_A_REMOVER'::uuid;
```

As tabelas `caonect_private.admins` e `caonect_private.moderation_audit` ficam em schema **privado**, não exposto ao PostgREST. Não conceda acesso a `anon`, `authenticated` ou `public` àquele schema. Nunca coloque chave service_role no navegador.

## Acessar o painel de testes

- Abra `https://feat-diff-007-6-painel-admin.caonect.pages.dev/?pagina=admin`.
- Faça login com o usuário autorizado na etapa anterior.
- O menu **Admin** aparece somente depois da conferência via RPC no Supabase.
- Caso apareça "Conta sem permissão", confira o UID cadastrado e se a migração foi aplicada **no mesmo Supabase** das variáveis VITE da Cloudflare.

## Checklist de homologação

1. **Visitante deslogado:** acesso direto a `/?pagina=admin` não mostra registros, apenas pedido de login.
2. **Conta comum:** mesmo URL não mostra dados nem permite operação; as funções RPC de listagem e moderação retornam **permission denied**.
3. **Conta admin:** menu Admin aparece, indicadores carregam, abas Denúncias / Animais / Perdidos / Usuários / Auditoria exibem dados.
4. **Contas:** verificar total e papéis (adotante/protetor/ONG); a tela não deve mostrar e-mail, telefone, endereço exato, chats ou senhas.
5. **Aprovação:** cadastrar com conta protetora um animal de **outra espécie**. Ele começa `pending`, aparece na fila, e não aparece na vitrine pública antes da aprovação.
6. **Documentação:** para espécie de análise especial, tentar aprovar sem observações de origem legal. O backend deve **impedir** a aprovação. Registre informações e comprove documentalmente a origem antes de marcar a caixa e aprovar. A aprovação manual não substitui autorizações ambientais exigidas.
7. **Aprovação com justificativa:** registrar motivo com mais de 10 caracteres e confirmar. Após reabrir, o status deve ser `approved`, o animal elegível passa a aparecer na vitrine (se disponível), e a Auditoria recebe evento.
8. **Rejeitar/ocultar:** como administrador, rejeitar um pet de teste aprovado; deve deixar a vitrine pública, permanecendo no cadastro do responsável.
9. **Denúncia:** conta B denunciar alerta da conta A. Conferir denúncia no painel e marcar analisada ou descartada, registrando o motivo. Concluir denúncia **não** remove automaticamente o alerta.
10. **Alerta:** pela aba Perdidos, rejeitar ou arquivar um alerta inadequado; verificar que sai do mural público. Arquivar é uma ação irreversível pelo anunciante.
11. **Auditoria:** cada decisão deve trazer tipo de entidade, ação, motivo e mudança de status; não deve ficar acessível a contas comuns.
12. **Regressão:** login, edição de perfil, cadastro normal de cães/gatos, adoções, chat, fotos, PWA, domínio www e links de anúncios continuam operando.
13. No fim, arquive ou rejeite os registros de teste; não use dados pessoais reais nos testes.

## Segurança e limites conhecidos

- Os endpoints expostos são quatro RPCs `caonect_admin_is_admin`, `caonect_admin_dashboard`, `caonect_admin_list` e `caonect_admin_moderate`, mais `caonect_admin_audit`.
- Cada RPC sensível verifica o UID autenticado na tabela privada. `caonect_admin_is_admin()` apenas diz se a própria conta é admin.
- Decisões passam por `SECURITY DEFINER`, com contexto local de transação; proteções originais do anunciante permanecem ativas.
- Animais de espécies sujeitas à revisão voltam para `pending` se o anunciante editar fotos, descrição, raça, nome científico ou informações de origem após aprovação. Alertas de outras espécies também voltam à análise após mudanças nas fotos ou características. Isso impede contornar a revisão com edições posteriores.
- A trilha de auditoria registra o **UUID do administrador responsável**; o painel também o exibe para rastreabilidade.
- Leitura paginada com máximo de 100 registros por consulta. Filtro "somente pendentes" na interface filtra a página carregada, não toda a base.
- O painel não edita dados pessoais, não acessa canais privados e não remove registros do banco fisicamente.
- Uma denúncia analisada não apaga conteúdo. Moderação e denúncia são operações distintas.
- Para espécies reguladas, `legal_origin_notes` é apenas informação declarada, **não prova** documental. O administrador deve confirmar a procedência real e consultar exigências legais aplicáveis.
- A migração sobrescreve duas funções de guarda mantendo as proteções existentes e acrescentando a exceção *exclusivamente* para um RPC autorizado e auditado, criado como `postgres` via SQL Editor. **Não altere manualmente o dono dessas funções.**
- Auditoria armazena motivação e estado antes/depois, mas não inclui os dados pessoais do denunciante na tela.

## Publicação

A versão de Preview só funciona plenamente **depois do SQL e do cadastro do primeiro administrador**. O código fica em branch isolada; não integrar em `main` sem testes das contas admin e comum. Não depende do DIFF 007.4 (que continua como PR separado).
