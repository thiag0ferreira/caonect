# Cãonect 🐾 — DIFF 002

Plataforma responsiva de adoção de pets com React, Vite, TypeScript e GitHub Pages.

## Funcionalidades

- Catálogo demonstrativo e catálogo público real (quando conectado ao Supabase)
- Perfil de adotante, protetor independente ou ONG
- Cadastro e login via Supabase Auth, com confirmação de e-mail
- Painel de protetor: cadastrar pets, subir foto, editar status da adoção
- Filtros, favoritos e experiência responsiva
- Permissões por dono com Row Level Security (RLS)

**Importante:** sem Supabase conectado, o portal exibe somente uma demonstração e desativa cadastros. Favoritos e solicitações do catálogo de exemplo são locais/temporários e não representam pedidos reais.

## 1. Criar Supabase

1. Acesse https://supabase.com/dashboard e crie um projeto exclusivo para Cãonect.
2. Em **SQL Editor**, execute o arquivo [supabase/schema.sql](supabase/schema.sql) na íntegra (apenas neste novo projeto).
3. Em **Authentication > URL Configuration**, configure:
   - Site URL: `https://thiag0ferreira.github.io/caonect/`
   - Redirect URLs: `https://thiag0ferreira.github.io/caonect/**`
4. Ative **Confirm email** em Authentication. Use um serviço SMTP apropriado antes de abrir inscrições ao público.
5. Em **Project Settings / Connect**, copie a **Project URL** e a **Publishable key**.

## 2. Variáveis no GitHub

Em https://github.com/thiag0ferreira/caonect/settings/variables/actions crie **Repository variables**:

- `VITE_SUPABASE_URL` = URL pública do projeto
- `VITE_SUPABASE_PUBLISHABLE_KEY` = chave pública `sb_publishable_...` (ou equivalente)

A seguir vá para **Actions > Publicar Caonect no GitHub Pages > Run workflow**. O workflow lê automaticamente essas variáveis no build.

**NUNCA** publique `service_role`, `sb_secret_...`, senha de banco, tokens ou segredos em variáveis `VITE_*`, repositório público, mensagens ou frontend. A publishable key é pública por design, e a segurança depende da RLS.

## 3. Rodar local

Node.js 22+:

```bash
npm install
npm run dev
```

Para conectar localmente, crie um arquivo não versionado `.env.local`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_EXEMPLO
```

```bash
npm run build
```

## 4. Limitações e segurança antes de abrir ao público

- O status de ONG/protetor ainda é **autodeclarado** e não constitui verificação; precisa de moderação e validação de organizações.
- Solicitações reais e o acompanhamento de adoções não foram implementados; haverá uma etapa própria para consentimento e controle de acesso.
- Não coletamos documentos ou dados sensíveis neste protótipo.
- Fotos de animais são públicas; não envie imagens contendo documentos, endereço ou pessoas sem autorização.
- Falta uma política de privacidade e um fluxo de denúncia, exclusão de conta e moderação para produção.
- PWA inicial instalado pelo navegador. Empacotamento Capacitor para as lojas será uma etapa futura.
- Logo: o arquivo `public/favicon.svg` é temporário. A logo original PNG precisa ser publicada como `public/logo.png` e referenciada no cabeçalho.

## Deploy

A branch `main` publica automaticamente via GitHub Actions em:

https://thiag0ferreira.github.io/caonect/
