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


## DIFF 002.1 — Catálogo real, favoritos e conversas

Atualizado: o catálogo de demonstração foi removido da Home, Explorar e Favoritos. Agora os cards são de animais cadastrados de verdade no banco, com filtros por espécie, porte, personalidade e região.

### Passo obrigatório antes de usar as novas ações

1. Entre no SQL Editor do projeto **caonect** no Supabase.
2. Abra [supabase/diff-0021-interacoes.sql](supabase/diff-0021-interacoes.sql) neste repositório.
3. Copie o script completo e execute uma única vez.
4. Confira se aparecem `pet_favorites`, `adoption_requests` e `adoption_messages` no Table Editor.
5. O GitHub Actions publica o frontend em cada push na `main`.

### Teste do fluxo

1. Entre no aplicativo com uma conta diferente da conta responsável pelo animal.
2. Abra o animal e clique em **Curtir/Favoritar**. Acesse Favoritos e confirme.
3. Clique em **Conversar** ou **Tenho interesse em adotar**: cria-se uma solicitação privada.
4. Acesse **Adoções** e envie a primeira mensagem.
5. Entre com a conta do protetor: abra **Adoções** para responder e atualizar o andamento.
6. Não compartilhe documentos, endereço completo ou contatos pessoais nos chats de teste.

### Observações

- Login obrigatório para salvar favoritos, iniciar conversas e solicitar adoção.
- A mesma pessoa não pode solicitar adoção do próprio animal.
- Uma conversa por par adotante/animal. Novo clique reabre a conversa existente.
- O protetor gerencia o status; não é uma decisão automatizada.
- Mensagens são consultadas periodicamente (a cada 7 segundos), sem serviço de realtime pago.
- O botão **Curtir** significa marcar como favorito, não corresponde a uma contagem pública de curtidas.
- A plataforma ainda precisa de moderação, denúncia, bloqueio, política de privacidade e controles de abuso para lançamento amplo.
- A migração depende da execução manual no Supabase. **O frontend sozinho não cria tabelas.**


## DIFF 002.2 — Perfil, raça, personalidade, proximidade e mural

**Antes de testar**, execute `supabase/diff-0022-perfil-proximidade-atividade.sql` no **SQL Editor** do projeto Cãonect. O arquivo adiciona colunas e tabela de eventos, sem apagar os pets ou as contas existentes. Se você ainda não executou o `diff-0021-interacoes.sql`, faça também para ativar favoritos e chat.

### O que muda
- Perfil: nome, cidade, bairro e telefone privado podem ser editados por seu dono.
- Perfil: categoria da conta é fixa (adotante/protetor/ONG) até haver verificação administrativa. E-mail e senha continuam gerenciados no Supabase Auth.
- Cadastro e edição de pets: raça, cor, características (inclusive bagunceiro, bravo, territorial, medroso, reativo) e localização aproximada opcional.
- A localização do pet é capturada **somente após clique e permissão do navegador**, arredondada a 2 casas decimais antes de salvar. Não utilize GPS no endereço de abrigos sigilosos ou lares vulneráveis: escolha uma região pública próxima, se apropriado.
- Explorar: botão **Buscar perto de mim** solicita permissão para ler a localização do visitante, somente na sessão, sem gravá-la no banco. Filtro por raio 5, 10, 25, 50, 100 ou 200 km. Pets sem coordenada aproximada ficam de fora do filtro por raio, mas aparecem na busca habitual por região.
- Página inicial: mural dos **eventos de verdade** (cadastro e mudanças de situação), sem simular números ou mostrar informações de adotantes. "Adotado" é uma declaração do protetor; não uma confirmação independente.
- **Antes de uma adoção real**: incluir moderação, denúncia e mecanismos de verificação e privacidade. Evite inserir dados pessoais nas descrições públicas.

### Teste básico

1. Execute o SQL e confirme `Success. No rows returned`.
2. Atualize o site após GitHub Actions marcar verde.
3. Perfil → Editar perfil → alterar bairro e salvar.
4. Perfil → Meus animais → Editar pet → preencher raça e características; GPS opcional. Salvar.
5. Explorar → Buscar perto de mim → permitir localização → definir raio. Se nenhum pet tiver coordenadas aproximadas, a busca por raio retornará vazia.
6. No perfil do protetor, mude o status do animal e veja o evento correspondente em **Nossa comunidade em movimento**. Alterações são públicas; use estados verdadeiros.

### Segurança

RLS protege as tabelas privadas. A tabela `pet_activity` só permite escrita via gatilho do servidor. A informação sobre região/animal e o status de adoção ficam públicos. Pessoas não devem cadastrar endereços residenciais nas descrições.
