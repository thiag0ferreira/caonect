# Cãonect — DIFF 007.6.1: Cloudflare Pages como única pipeline de produção

## Objetivo

Remover a pipeline **legada** `.github/workflows/deploy.yml` que tentava publicar no GitHub Pages a cada push em `main`, causando checks vermelhos mesmo quando a Cloudflare concluía o deploy normalmente. Não alterar app, SQL, domínio, autenticação, PWA ou chaves.

## Escopo efetivo

- Excluir o workflow `Publicar Caonect no GitHub Pages` do repositório.
- Atualizar o início do `README.md` com a arquitetura vigente e procedimento de publicação.
- Não modificar `functions/index.js`, `vite.config.ts`, `package.json`, `src/`, `public/` ou Supabase.
- Manter o projeto **Cloudflare Pages** associado ao GitHub, com `main` como branch de produção.
- Não mexer em `caonect.com.br`, `www.caonect.com.br`, certificados SSL, Redirect Rules ou DNS.

## Como homologar

1. Abrir o PR e conferir que só existem: remoção de `.github/workflows/deploy.yml`, atualização de `README.md` e este documento.
2. Conferir na branch o check **Cloudflare Pages → Deploy successful**.
3. Mesclar o PR na `main` (squash ou merge) e conferir o novo check **Cloudflare Pages → Deploy successful**.
4. Verificar em **Cloudflare → Workers & Pages → caonect → Deployments** a publicação do commit em `main`.
5. Conferir site oficial em `https://www.caonect.com.br/`, autenticação Supabase, painel Admin, busca, alertas, cartazes QR/WhatsApp e PWA.
6. Confirmar que futuras atualizações em `main` **não iniciam** novos workflows `Publicar Caonect no GitHub Pages`. O histórico de erros antigos continuará visível, sem afetar a operação.

## Limitações e riscos residuais

- **Remover o YAML não despublica o site antigo** já gerado em `thiag0ferreira.github.io/caonect/`. Isso deve ser analisado separadamente em **GitHub → Settings → Pages**, depois de confirmar dependências/links antigos.
- O status `success` do build prova que os arquivos foram publicados, mas **não substitui** os testes manuais de login/PWA/rotas.
- O trabalho de pareamento (DIFF 007.4, PR #3) permanece **não integrado** e não está incluído nesta mudança.
- Não há migração SQL e não é necessário atualizar o endereço do Supabase.
- Para evitar retorno acidental à hospedagem antiga, novas pipelines devem direcionar para a Cloudflare, não GitHub Pages.

## Rollback

Se a Cloudflare parar de publicar após o merge, a remoção do workflow antigo **não é, por si, causa provável**, pois o deploy Cloudflare acontece de forma externa ao GitHub Actions.
Verifique primeiro **Cloudflare → Deployments** e a conexão GitHub com `main`. A reversão do PR repõe o workflow antigo apenas se isso for explicitamente necessário; não use rollback automático que migre o domínio para a hospedagem legada.
