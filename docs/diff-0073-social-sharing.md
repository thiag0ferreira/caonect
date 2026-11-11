# Cãonect — DIFF 007.3: Stories, QR Code e prévia WhatsApp

## Entregas

- Botão **Criar cartaz / Story** no detalhe de alerta público ativo, perto de Compartilhar link.
- Story vertical PNG 1080×1920 e publicação Feed PNG 1080×1350; imagem do animal, identidade do Cãonect, cidade/região aproximada, QR Code real do link.
- **Compartilhar imagem** (API de compartilhamento nativa, se disponível) ou **Baixar PNG**, e copiar link; publicação em Instagram deve ser concluída manualmente pelo usuário.
- Botão **WhatsApp** que abre um envio com texto e link do anúncio.
- Metadados Open Graph e Twitter/Card no HTML devolvido pela Cloudflare Pages Function apenas quando `/?alert=UUID` resolve para alerta **approved** e **active/resolved** com foto; usa somente a chave pública e RLS do Supabase.
- Metadados genéricos atualizados para adoção e reencontros nas duas cidades.

## Dependências e implantação

1. O projeto Cloudflare Pages já precisa ter **React (Vite)**, `npm run build`, `dist`, e as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` na seção **Settings → Variables and Secrets**.
2. O código de Functions está em `functions/index.js`. As variáveis precisam estar disponíveis **também em runtime**, nos ambientes de Preview e Production. Não adicionar `service_role`.
3. A branch `feat/diff-007-3-social-sharing` produz uma prévia do Pages independente de `main`.
4. **Não** usar `www.caonect.com.br` para cartazes definitivos até confirmar DNS + HTTPS. Links de teste `pages.dev` continuam válidos, mas mostram o endereço da prévia no QR Code.
5. Depois dos testes, mesclar o PR na `main` e conferir o deploy da Cloudflare; publicação no GitHub Actions não é necessária.

## Testes manuais obrigatórios

1. Acessar a versão de preview na Cloudflare pelo navegador.
2. Abrir um anúncio público **ativo** com pelo menos uma foto; tocar em **Criar cartaz / Story**.
3. Verificar que a foto, o nome e a localização aproximada aparecem com a logo oficial e o QR Code. Não mostrar telefone, e-mail, endereço exato ou dados de quem enviou informações.
4. Salvar Story e Post. Conferir imagens PNG de **1080×1920** e **1080×1350** e legibilidade no celular.
5. Ler ambos os QR Codes com outro celular e confirmar que abrem exatamente `/?alert=UUID` do mesmo anúncio.
6. Tocar em **Compartilhar imagem**; se o Android/iOS oferecer compartilhamento de arquivos, selecionar WhatsApp ou Instagram. Se não oferecer, baixar e publicar manualmente.
7. Tocar em **WhatsApp** e confirmar nome, região e URL do animal.
8. Para um alerta público aprovado, verificar o HTML **recebido do servidor**, não apenas o HTML após o React carregar. Exemplo de teste:
   - Abra `view-source:https://<preview>.caonect.pages.dev/?alert=<uuid>` em navegador compatível.
   - Procure `og:title`, `og:description`, `og:image` e `og:url`.
   - O `og:image` deve ser a primeira foto do animal (bucket público `lost-found-photos`) e o título deve identificar o alerta.
9. Testar um alerta arquivado ou pendente; o HTML **não deve** expor sua foto/nome nos metadados dinâmicos.
10. Validar o comportamento em modo anônimo, desktop e PWA, mantendo os fluxos de adoção e chat.

**Nota de cache do WhatsApp:** caso o link já tenha sido compartilhado, o WhatsApp poderá mostrar a prévia antiga por cache; testar com um novo anúncio público ou aguardar a atualização do cache. As prévias são processadas pelo aplicativo de destino e não podem ser garantidas a 100%.

## Segurança e privacidade

- Function consulta apenas `lost_found_alerts` sob a role anônima e filtra `moderation_status=approved` e `status in (active,resolved)`. Não acessa `lost_found_tips`, `profiles`, `lost_found_reports` ou contatos.
- Imagem do OG e cartaz usa somente a primeira foto já pública do anúncio. Fotos no storage público continuam acessíveis mesmo após arquivamento, conforme limites documentados do DIFF 007.2.1.
- Metadados HTML escapam valores do usuário e identificadores são validados como UUID.
- O compartilhamento não publica Stories automaticamente nem grava no Instagram sem ação do usuário.
- Ao mudar o domínio de `pages.dev` para `www.caonect.com.br`, os **novos** cartazes e links passam a usar a origem onde o Cãonect está aberto.

## Sem SQL novo

Este DIFF não altera tabelas, RLS ou buckets do Supabase; depende de DIFF 007.1 e 007.2.1 já aplicados.
