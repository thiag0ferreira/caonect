# DIFF 007.8 — Compartilhamento de anúncios de adoção no Instagram

## Pedido das ONGs

As ONGs e protetores utilizam principalmente **Stories do Instagram** para divulgar pets. Criar um botão que gere uma arte de divulgação (1080×1920) a partir de cada animal disponível e facilite o acesso ao anúncio para quem estiver interessado em adotar.

## O que foi feito

- Botão **Divulgar no Instagram** nos cards do catálogo.
- Botão **Divulgar no Story do Instagram** dentro do modal de cada pet.
- Botão **Criar Story de adoção** em **Perfil → Meus animais** para protetores e ONGs, apenas nos anúncios disponíveis e já aprovados.
- Arte em dois formatos: **Story 9:16** e **publicação 4:5**, com foto real, nome, espécie, porte, cidade/região aproximada, marca Cãonect, selo **DISPONÍVEL PARA ADOÇÃO**, CTA **QUERO ADOTAR!** e QR Code.
- Botão de compartilhar a imagem pela folha de compartilhamento do celular, com **download PNG** alternativo; botão para **copiar o link** e utilizá-lo no adesivo Link do Story.
- Link direto e permanente: `https://www.caonect.com.br/?pet=UUID`.
- Ao abrir esse link (inclusive depois de atualizar a página), o app navega para Explorar, consulta aquele pet **pelo ID** no Supabase (mesmo se ele não estiver na página dos primeiros 100 registros) e abre a ficha com **Tenho interesse em adotar** e **Conversar**.
- Se o animal estiver adotado, reservado, rejeitado ou indisponível, a página exibe um aviso em vez de mostrar um anúncio desatualizado.
- Metadados Open Graph da Cloudflare para o link de adoção, permitindo que WhatsApp e outras plataformas exibam foto e nome do pet quando o anúncio estiver aprovado/disponível. **Não** requer novas tabelas, SQL, serviço pago ou token de Instagram.

## Limitação do Instagram

**Um site/PWA não pode instalar diretamente um adesivo Link clicável no Story.** A `Web Share API` apenas abre o menu nativo de compartilhamento; quais apps/ações recebem a imagem dependem do celular e da versão do Instagram.

Para ter um link clicável: **(1)** salve/compartilhe a imagem; **(2)** abra o Story do Instagram; **(3)** selecione **Adesivos → Link**; **(4)** cole o link pelo botão **Copiar link da adoção**.

O QR Code também aponta para o anúncio oficial, mas é mais útil quando o Story é visto em **outro aparelho** (não substitui o adesivo Link para quem vê no mesmo celular).

## Testes antes de integrar à main

1. No catálogo, abra o pet **Batata** e clique em **Divulgar no Story**. A arte deve mostrar a foto, o nome, **DISPONÍVEL PARA ADOÇÃO** e o QR Code, sem cortes.
2. Em Perfil → Meus animais (ONG), crie o Story diretamente pelo botão do pet.
3. Teste no Android/iPhone: compartilhar imagem (se suportado) ou salvar PNG; abrir Instagram e adicionar adesivo Link manualmente.
4. Toque no adesivo Link a partir de **outro navegador/sessão**: a URL deve ser `/?pet=UUID` e abrir o **pet correto**, sem exigir login apenas para ver a ficha.
5. Clique em **Tenho interesse em adotar** a partir da ficha. A pessoa precisa fazer login para prosseguir, como no fluxo de adoção já existente.
6. Compartilhe o link por WhatsApp e confirme a prévia com nome e foto do pet. Algumas plataformas mantêm cache de prévias por um tempo.
7. Troque um pet para **Reservado** ou **Adotado**: o botão de divulgação deve desaparecer; o link antigo deve informar que o anúncio não está mais disponível.
8. Confirme que anúncios **pendentes ou rejeitados** nunca aparecem no card de adoção compartilhável. Teste conta de adotante, dono do pet e visitante.
9. Teste Story e Feed em telas pequenas e grandes, nas duas cidades. Fotos devem manter corte central (crop para preencher, sem distorção).
10. Regressão: Perdidos e Encontrados, QR Code de alertas, chat, cadastro, Admin, PWA, navegação e login intactos.

## Segurança/privacidade

- A arte mostra **somente** foto pública e informação aproximada do anúncio, sem telefone, conversas, endereço residencial, coordenadas nem e-mail.
- O gerador exige `status='available'` e `review_status='approved'`; a consulta do deep link aplica os mesmos filtros no Supabase.
- A prévia Open Graph lê **somente** pets aprovados e disponíveis com a chave **publishable**, respeitando as políticas RLS.
- Se o anúncio mudar de estado, o link existente não exibe um pet como disponível.
- Fotos antigas hospedadas fora do domínio público autorizado não são incorporadas na prévia do link por segurança; o site continua acessível normalmente.

## Arquivos
- `src/ShareAdoptionPoster.tsx`: gerador Canvas e ações de compartilhamento.
- `src/adoptionSharing.ts`: link permanente, texto e validação de anúncio compartilhável.
- `src/adoptionShare.css`: estilos da integração.
- `src/CommunityPets.tsx`: card, modal e deep link do catálogo.
- `src/Portal.tsx`: atalho para a ONG.
- `src/main.tsx`: roteamento da URL `?pet=`.
- `functions/index.js`: metadados OG para links de adoção.

## Publicação

Criar PR a partir de `feat/diff-007-8-instagram-adocao`, validar o check Cloudflare Pages e os testes reais do Instagram. **Não fazer merge automático antes da homologação**. O DIFF 007.4 permanece separado.
