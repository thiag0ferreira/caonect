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


## DIFF 002.3 — DF e galeria de cinco fotos

**Obrigatório:** execute no SQL Editor do projeto Cãonect o arquivo [supabase/diff-0023-df-galeria.sql](supabase/diff-0023-df-galeria.sql) ANTES de tentar editar/cadastrar pets na versão atualizada.

- Cidade fixa: Brasília (DF). Cadastro de usuário, edição do perfil e cadastro/edição de pets usam a lista oficial de **35 RAs** do DF, baseada no IPEDF/GDF.
- Bairro/setor é separado da Região Administrativa (campo opcional).
- Até **cinco fotos por animal**, com tamanho máximo de 5 MB por arquivo e tipos JPG, PNG ou WebP. A primeira foto é a capa do catálogo.
- Em um pet já existente, o SQL copia `image_url` para `photo_urls` se não havia galeria: preserva a foto do Amarelo.
- Edição permite acrescentar fotos e retirar referências da galeria; o arquivo físico retirado não é excluído automaticamente do Storage, para evitar perda acidental. Rotina de limpeza virá depois.
- Galeria navegável no modal do pet, com controles de anterior/próxima imagem.
- A migração **não corrige automaticamente nomes antigos** de regiões (por exemplo, "Ceilândia Sul (Ceilândia)"). Abra Editar Perfil / Editar Pet, selecione a RA oficial e preencha o bairro/setor para normalizar.
- Busca por proximidade continua opcional, independente do campo RA; protege coordenadas aproximadas quando informadas.

### Teste
1. Execute o SQL.
2. Veja a execução verde do GitHub Actions.
3. Abra Perfil → Editar perfil e confira cidade fixa e dropdown de RA.
4. Abra Amarelo → Editar pet e verifique que a foto anterior aparece; acrescente até quatro.
5. Salve e abra Amarelo na vitrine para navegar na galeria.

Fonte de referência das RAs: https://pdad.ipe.df.gov.br/


## DIFF 003.1 — Identificação privada no chat

**Passo necessário para ativar:** execute [supabase/diff-0031-participantes-chat.sql](supabase/diff-0031-participantes-chat.sql) no **SQL Editor** do projeto Cãonect.

O cabeçalho da conversa mostra, para os participantes autenticados:
- Pet: nome, raça, foto e Região Administrativa;
- Responsável: nome exibido, categoria (Protetor/ONG) e localização geral (bairro, RA, Brasília);
- Interessado: nome exibido, categoria Adotante e localização geral;
- Identificação de **Você** no cartão do participante logado.

As informações são carregadas por `caonect_conversation_people(uuid)`, função `SECURITY DEFINER` com verificação obrigatória de `auth.uid()` contra o adotante/protetor da solicitação. A função não devolve e-mail, telefone, endereço exato nem coordenadas.

**Não há compartilhamento automático de contato após aprovação**. Qualquer recurso de compartilhamento futuro deverá exigir autorização explícita da pessoa que fornece o contato.

### Teste recomendado
1. Execute a migração SQL.
2. Confira o GitHub Actions e abra o Cãonect.
3. Entre com o protetor, abra uma conversa existente e verifique os dois cartões.
4. Abra a mesma conversa com o adotante e verifique os mesmos nomes e locais.
5. Uma terceira conta não deve poder consultar os dados pela função; teste de autorização no Supabase antes do lançamento público.

Se aparecer a mensagem de que é necessário executar a migração, confirme a execução no projeto correto e recarregue o site.


## DIFF 003.2 — Questionário e adoção concluída

**Execute primeiro** [supabase/diff-0032-adocao-responsavel.sql](supabase/diff-0032-adocao-responsavel.sql) no SQL Editor do Cãonect. A migração preserva as conversas, pets e usuários existentes. O deploy frontend é automático após o push na branch `main`.

### Novo fluxo
1. Visitante clica em **Tenho interesse em adotar** no perfil de um pet e precisa estar autenticado.
2. Adotante responde ao questionário (moradia, convivência, crianças, outros animais, tempo, experiência e motivação).
3. O formulário é visível apenas ao próprio adotante e ao responsável pelo pet graças a RLS.
4. Protetor consulta as respostas na conversa e altera o andamento para **Em análise** e depois **Aprovada**, se considerar adequado. Aprovação não equivale à entrega do pet.
5. **Só depois da entrega efetiva**, o protetor clica em **Confirmar adoção concluída**. O Supabase faz uma transação que marca a solicitação como `completed`, o pet como `adopted` e encerra outras solicitações em aberto. O histórico de atividades do pet é atualizado pelo trigger já existente.
6. A conversa concluída torna-se somente leitura e o animal sai do catálogo dos disponíveis.

O backend impede a conclusão direta fora da função protegida, protege uma adoção efetivamente concluída contra reabertura pelo seletor de pets e exige o questionário para novas aprovações com `intent='adoption'`. Solicitações antigas já aprovadas continuam válidas, mesmo sem formulário.

**Atenção:** o painel de pets ainda permite marcar como **Adotado** em casos de adoção externa, sem vínculo com uma solicitação do Cãonect. Não confunda essa ação com a conclusão de um pedido dentro da plataforma.

### Teste
- Com conta de adotante, abra pet disponível e preencha o formulário.
- Com conta de protetor, abra **Adoções**, leia as respostas e selecione **Em análise** → **Aprovada**.
- **Não conclua a adoção apenas para testar com um pet real**: a conclusão encerra outros pedidos e é tratada como definitiva. Use um pet de teste identificado como fictício e depois retire-o do ambiente, ou aguarde uma adoção real.
- Depois da entrega, confirme a conclusão e confira pet `adopted`, pedido `completed` e mural atualizado.

### Limites desta versão
- Não coleta RG/CPF, renda, endereço completo, fotos pessoais nem documentos.
- O questionário orienta a avaliação humana, não aprova nem recusa automaticamente.
- Não foram implementados denúncia, auditoria de moderação, alterações do questionário nem exclusão de conta. Necessários antes de abertura pública.
- O modo de conversa sem solicitação continua disponível no botão **Conversar**.


## Revisão pós-testes — DIFF 003.2.1

O fluxo testado por dois usuários passou em cinco etapas. Foi identificado um ponto adicional de segurança: a política de inserção de mensagens ainda não bloqueava conversas com status `completed`, embora a interface já bloqueasse o envio. A migração [diff-0032-1-bloqueio-chat-concluido.sql](supabase/diff-0032-1-bloqueio-chat-concluido.sql) alinha a RLS com a interface.

**Execute essa migração no SQL Editor do Cãonect.** A operação apenas substitui a política de INSERT de mensagens, sem eliminar conversas, contas ou questionários existentes.

Validação posterior recomendada: em uma solicitação de teste efetivamente concluída, confirmar que um INSERT direto em `adoption_messages` por um dos participantes é recusado e que a leitura do histórico continua autorizada. Não conclua uma adoção real apenas para testar.


## DIFF 004 — Match Cãonect (v1, regras transparentes)

O Match está no menu e na página inicial. Apresenta **sete perguntas**: moradia, crianças, outros pets, ritmo, tempo disponível, experiência e preferência de porte.

As respostas ficam **somente no estado da página**, sem gravar perfil ou respostas no Supabase. As recomendações utilizam apenas pets reais com status `available`. A pontuação é interna para ordenação; o aplicativo não mostra porcentagens de compatibilidade, e não faz triagem automática de pessoas.

Cada resultado explica:
- características informadas que podem se alinhar à rotina;
- alertas de atenção, como alta atividade com pouco tempo disponível;
- pontos não confirmados, sobretudo convivência com crianças e outros animais.

Características como `Não gosta de crianças` recebem destaque de atenção, nunca são apresentadas como compatibilidade segura. A confirmação da adoção continua sob responsabilidade humana.

**Não há nova migração SQL no DIFF 004.** Basta o deploy automático do GitHub Actions.

### Testar
1. Abra Cãonect → Match e responda às sete perguntas.
2. Confira que aparecem apenas animais reais disponíveis.
3. Compare uma rotina tranquila e outra ativa: a ordem e os alertas podem variar conforme os dados do pet.
4. Clique em **Conhecer** um animal: a aplicação navega para Explorar com o nome filtrado.
5. Refazer questionário deve limpar as respostas.
6. No celular, confira cartões, botões e aba Match na barra inferior.

**Limitações:** não existe confirmação formal de comportamento nem verificação de segurança para crianças e outros pets. Sem informações suficientes, o resultado sinaliza incerteza. Regras serão refinadas em avaliações futuras.


## DIFF 005 — Branding oficial e PWA (www.caonect.com.br)

Identidade aprovada: logo de cão + gato + coração, slogan **Encontros que viram família**, verde **#285B4E**, creme **#F7F4EE**, verde suave **#DCEBE3**, marrom **#4A2600**.

### Arquivos
- `public/brand-logo.svg`: versão vetorial fiel à ilustração completa original, usada no cabeçalho e no rodapé.
- `public/app-icon.svg` e `public/favicon.svg`: ícone contrastante verde e creme.
- `scripts/generate-brand-assets.mjs`: usa Sharp para criar PNGs no diretório `public/` antes do build.
- PNGs gerados: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon-32.png`, `favicon-16.png`, `og-image.png` (1200x630).
- `public/manifest.webmanifest`: nome, cores, escopo e ícones Android/PWA.
- `index.html`: ícones, SEO, Open Graph/WhatsApp e Twitter card, URL canônica.
- `src/main.tsx`, `src/style.css`: logo visual no cabeçalho/rodapé.

### Implantação
1. O workflow já executa `npm install` seguido de `npm run build`: o hook `prebuild` gera os PNGs automaticamente via Sharp.
2. Não é necessário fazer upload manual dos PNGs: eles são produzidos em cada build e publicados no GitHub Pages.
3. Confira a execução verde em **GitHub Actions** e acesse `https://www.caonect.com.br/`.
4. Verifique `/manifest.webmanifest`, `/icon-512.png` e `/og-image.png`.
5. Para atualizar o ícone de uma instalação anterior, pode ser necessário remover e instalar o PWA novamente; celulares podem manter ícones antigos em cache.
6. O site permanece online; nenhuma mudança no Supabase ou nas tabelas é exigida.

### Observações
A instalação via PWA funciona em plataformas compatíveis. O Cãonect ainda **não oferece modo offline para mensagens, pets ou autenticação**: esses recursos exigem internet. Splash nativa de Android/iOS pode variar segundo plataforma e versão do sistema. Imagens de compartilhamento são atualizadas conforme o cache das plataformas.

Para substituir futuramente a marca vetorizada por um arquivo mestre de imagem, preserve o nome `brand-logo.svg` e as dimensões para não afetar o layout.


## DIFF 006.1 — Cãonect Multiespécies (DF)

A expansão inicial permite preparar anúncios de cães, gatos, aves, pequenos mamíferos,
répteis, peixes/aquáticos e outros. Cada categoria tem espécies pré-definidas; é
necessário implementar formulários veterinários próprios no DIFF 006.2.

**ATENÇÃO: execute primeiro o arquivo**
[`supabase/diff-0061-multiespecies.sql`](supabase/diff-0061-multiespecies.sql)
no SQL Editor do projeto `caonect`. É um script transacional que não apaga
os registros existentes.

- Cães e gatos já cadastrados continuam disponíveis e são classificados.
- Novas espécies ficam em **revisão pendente**, sem exibição pública.
- A moderação não possui painel de aprovação neste DIFF. Não altere manualmente
  o campo de revisão para aceitar animais de origem desconhecida.
- Ao escolher a categoria no cadastro, a lista de espécies muda. Para categorias
  regulamentadas, solicita informações gerais sobre origem e documentação,
  mas NÃO é permitido colocar CPF, endereço ou dados sensíveis no campo.
- A página inicial oferece navegação por categoria e Explorar filtra por categoria.
- O Match continua restrito a cães e gatos até receber critérios próprios.
- Nenhum botão de pagamento, cobrança recorrente, campanha ou doação foi ativado.

Referência: regulação e orientação do Brasília Ambiental para fauna exótica,
incluindo origem legal, transferências e restrições de detentores de TGAE.
A categoria "Outros" não concede permissão de anúncio: exige avaliação.

### Testes após SQL e GitHub Actions
1. Perfil de protetor: confirmar que Batata e Amarelo mantêm suas fotos e status.
2. Abrir novo cadastro e alternar Cachorros, Aves, Pequenos mamíferos e Répteis.
3. Cadastrar um animal **de teste, sem dados pessoais**, numa nova categoria;
   confirmar que aparece **Aguardando revisão** apenas no perfil.
4. Na navegação anônima, confirmar que o anúncio pendente não aparece.
5. Confirmar que o filtro de Cachorros continua exibindo os pets existentes.
6. O chat e adoções anteriores não devem ser alterados.

### Monetização futura
Consulte [`docs/monetizacao.md`](docs/monetizacao.md).
O projeto segue gratuito neste DIFF.


## DIFF 006.4 — Expansão-piloto: Brasília/DF + Fernandópolis/SP

O Cãonect passa a aceitar perfis de adotantes, protetores e ONGs de **Brasília (DF)**
e **Fernandópolis (SP)**, em um só domínio e no mesmo Supabase.

**Obrigatório:** execute [`supabase/diff-0064-brasilia-fernandopolis.sql`](supabase/diff-0064-brasilia-fernandopolis.sql)
no SQL Editor antes de testar novos cadastros e edições de localização. É uma migração
transacional, preservando os pets, fotos, conversas e perfis existentes.

- Brasília continua com as 35 RAs e campo de bairro/setor opcional.
- Fernandópolis usa campo **bairro/região** preenchido manualmente. Não foi
  inventada uma lista oficial de bairros: o município possui consulta oficial
  de CEP por logradouro; confirmação de bairro pode ser feita por esse serviço.
- O cadastro do pet permite selecionar uma das duas cidades, independentemente
  da cidade do protetor. Não publica localização exata.
- A home e o catálogo permitem filtrar os animais por cidade.
- O campo `state` grava `DF` ou `SP` e registros antigos são preenchidos
  com `DF`. Mudanças de cidade/UF passam por validação no banco.
- Anúncios de espécies regulamentadas continuam pendentes de moderação,
  conforme DIFF 006.1.
- Para levar a ONG Pelos e Patas de Fernandópolis à plataforma, o representante
  deve criar uma conta no papel ONG e informar **Fernandópolis — SP**.
  Isso **não verifica formalmente** a associação nem dá selo de autenticidade:
  a verificação institucional e perfis de equipe serão desenvolvidos depois.

### Verificação
1. Após SQL e GitHub Actions verde, faça login no Cãonect.
2. Perfil → Editar perfil: alterne as cidades e confira RA (DF) ou bairro (SP).
3. Perfil → Cadastrar pet: selecione Fernandópolis e confirme campo de bairro.
4. Explore: selecione Fernandópolis; não deve mostrar pets apenas do DF.
5. Explore: selecione Brasília; Batata e Amarelo devem continuar disponíveis.
6. No segundo navegador, teste cadastro ONG em Fernandópolis e login confirmado.
7. Não cadastre ONG como verificada nem publique em nome dela sem autorização.

Fontes para validar ONG: notícias da Prefeitura de Fernandópolis sobre parceria
com a Associação Pelos e Patas (2024 e 2026).


### DIFF 006.4.1 — Bairros e áreas rurais de Fernandópolis

Foram adicionadas **21 sugestões** fornecidas pela comunidade local, incluindo
Centro, Bairro Coester, Brasilândia, diversos jardins e vilas, além de Área Rural
de Fernandópolis e Área Rural de Brasitânia. Também consta a variante
`Vila Santa Isabel` (por vezes grafada `Vila Santa Izabel`).

As sugestões estão em `src/supportedLocations.ts`, no vetor
`FERNANDOPOLIS_AREAS`. Não representam uma lista municipal oficial ou exaustiva.
Para adicionar bairros futuramente, atualize esse vetor.

O cadastro de conta, a edição do perfil e o cadastro do pet utilizam
um campo com sugestões (datalist HTML), mas aceitam **outro bairro digitado
livremente**. Isso evita bloquear novas áreas ou grafias locais.

Na página inicial e em Explorar, ao selecionar Fernandópolis, o usuário
pode escolher uma sugestão ou digitar um bairro para filtrar os anúncios.
Brasília continua com suas RAs cadastradas.

Sem alteração no SQL: a coluna `district` já aceita texto. A migração
`diff-0064-brasilia-fernandopolis.sql` deve estar aplicada antes de
cadastrar novas contas ou animais em Fernandópolis.

**Teste rápido após deploy:** selecionar Fernandópolis, digitar Jardim Santa Rita
no cadastro, voltar ao catálogo e filtrar por esse bairro. Confirmar que
Brasília/DF e as RAs continuam normais.
