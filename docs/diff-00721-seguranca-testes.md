# Cãonect — DIFF 007.2.1: Segurança e estabilização

## Resultado do DIFF 007
Os 7 testes de cadastro, publicação, fotos, detalhes, link e Meus alertas passaram. Esta fase amplia segurança e comunicação entre contas.

## Ativação (ordem obrigatória)

1. **Antes de mesclar a branch ao main**, executar no SQL Editor do mesmo Supabase:
   [`supabase/diff-00721-hardening.sql`](../supabase/diff-00721-hardening.sql).
2. Conferir uma linha com as **6 colunas TRUE** de verificação.
3. Após SQL confirmado, mesclar o PR `feat/diff-007-2-1-estabilizacao` em `main` e verificar se o deploy na Cloudflare Pages (não no GitHub Actions) passou.
4. Abrir `https://caonect.pages.dev/?pagina=perdidos-encontrados` e executar os testes abaixo.

O SQL é aditivo e não apaga animais, anúncios, usuários, chats de adoção ou solicitações existentes.

## Melhorias

- Históricos de informações recebidas **e enviadas** aparecem na página do alerta, conforme o usuário logado.
- Um usuário pode registrar informações, no máximo, 6 vezes por hora no total e 2 vezes em 10 minutos para o mesmo alerta. Limites no banco (não apenas no navegador).
- Denúncias de anúncio (spam, fraude, abusos, privacidade, informações falsas e outros). Uma denúncia por usuário por anúncio, máximo de 10 por 24 horas. São privadas; o denunciado não visualiza quem denunciou.
- Regras de auditoria protegem a data de criação e encerramento e impedem reabrir um anúncio arquivado ou já encerrado.
- As políticas RLS existentes continuam limitando acesso/alteração a seus donos e aos participantes dos avisos.

## Teste entre três contas

1. Conta A publica um alerta de teste (com nome `TESTE`, foto autorizada, sem informações sensíveis).
2. Conta B abre e usa `Tenho informações` ou `Pode ser meu pet`. Confirme o recebimento pela conta A e o histórico enviado na conta B.
3. Conta C, que não participou, **não deve** conseguir ler os avisos de A/B.
4. Conta B envia duas informações para o mesmo alerta em menos de 10 minutos. A terceira deve ser bloqueada com mensagem clara. Não faça testes de carga excessivos.
5. Conta B registra uma denúncia do alerta de teste. Confirme que o sistema informa que o registro será revisado manualmente. Nova denúncia do mesmo usuário/alerta não deve ser permitida.
6. Conta A marca o alerta como `Reencontrado`. O anúncio deve ir à aba `Reencontrados` e deixar de aceitar novos avisos.
7. Conta A arquiva um alerta de teste; visitantes não devem conseguir visualizar o anúncio arquivado. O proprietário continua podendo vê-lo em `Meus alertas`.
8. Conta B não deve ter ações de `Editar`, `Arquivar` ou `Marcar reencontrado` para alertas da conta A.
9. Após validar, arquive os anúncios de teste.

## Administração manual de denúncias

As denúncias **não bloqueiam automaticamente** os anúncios e não existe painel administrativo nesta entrega.
O administrador autorizado precisa consultar `public.lost_found_reports` no Supabase SQL Editor:

```sql
select id, alert_id, reason, details, created_at, status
from public.lost_found_reports
where status = 'pending'
order by created_at asc
limit 100;
```

Avalie a denúncia conforme regras de moderação e legislação. Não divulgue dados de quem denunciou. O SQL Editor usa uma conexão privilegiada e não deve ser exposto aos usuários do aplicativo.

## Limitações conscientemente mantidas

- Fotos de alertas ainda são **públicas** no Storage, inclusive se o anúncio for arquivado enquanto o arquivo não for apagado; não exiba imagens sensíveis.
- As imagens são reprocessadas no navegador. Sanitização e moderação obrigatórias no servidor ainda não estão implementadas.
- Limites no banco reduzem abuso, mas não substituem CAPTCHA, reputação, verificação de perfis nem monitoramento.
- O contato é um **registro de informações privadas**, não um chat bidirecional. As mensagens que chegam ao responsável não oferecem ainda recurso de resposta nesta mesma central.
- O compartilhamento de links funciona, mas o preview do WhatsApp/Instagram mostra metadados gerais do site. Imagens específicas de cada alerta dependem de Open Graph dinâmico via Cloudflare Pages Functions/Workers; será tratado em DIFF posterior.
- Não há notificação em tempo real para denunciados ou moderadores; acompanhar denúncias manualmente.
