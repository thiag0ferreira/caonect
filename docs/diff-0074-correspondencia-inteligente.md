# DIFF 007.4 — Correspondência inteligente de Perdidos e Encontrados

## Objetivo
Oferecer **possíveis correspondências** entre anúncios públicos e ativos de pets perdidos e encontrados, sem alegar que são o mesmo animal.

## Escopo entregue
- Aba **Possíveis reencontros** na Central de Perdidos e Encontrados.
- Convite na Central para descobrir sugestões.
- Lista de candidatos no detalhe de qualquer alerta ativo público, quando houver sinais suficientes.
- Comparação de duas fotos de anúncios, localização aproximada, data e razões do vínculo sugerido.
- Ações **Ver anúncio** dos dois lados. O contato continua protegido pelo recurso existente **Tenho informações / Pode ser meu pet**.
- Algoritmo determinístico no navegador, **sem API paga**, baseado em campos públicos já acessíveis por RLS.
- Separação por cidade e espécie, datas plausíveis, sem misturar alertas encerrados, pendentes ou do mesmo proprietário.

## Como as regras funcionam
1. Entram somente anúncios `status=active`, `moderation_status=approved` e pares **perdido ↔ encontrado** de proprietários diferentes.
2. Cidade e espécie precisam coincidir. Anúncios de Brasília e Fernandópolis nunca são cruzados.
3. Um anúncio de **encontrado** muito antes da data de desaparecimento (mais de 7 dias) ou mais de 120 dias depois é descartado.
4. Região igual, cores reconhecidas, porte igual, datas próximas e raça específica igual contribuem com pesos distintos. Cores e portes diferentes reduzem a prioridade e são mostrados como divergência.
5. Pelo menos **dois sinais positivos adicionais** e pontuação mínima interna são necessários. Nenhuma porcentagem de compatibilidade é exibida: pontos são apenas um critério de ordenação, **não uma probabilidade**.
6. A correspondência **não compara fotos por IA**, não confirma identidade e não move status de alertas. Não envia notificações; isso fica para o DIFF 007.5.

## Como homologar com duas contas
1. Use a versão de prévia da branch, com Supabase atual, sem alterar SQL.
2. Conta A publica **cachorro perdido**, branco, pequeno, Ceilândia, com data recente, usando foto de teste sem dados pessoais.
3. Conta B publica **cachorro encontrado**, branco, pequeno, Ceilândia, com data próxima e foto de teste.
4. Abra **Perdidos → Possíveis reencontros**: deve mostrar os dois anúncios, razões (cidade/espécie, região, cor, porte, data) e botões Ver anúncio.
5. Abra o detalhe do anúncio da conta A: deverá aparecer uma sugestão referente ao anúncio da conta B. Abra o segundo e confira os dados.
6. Conta B cria um anúncio de **gato**, mesmo bairro e data: não deve entrar no par de cães.
7. Conta B cria um anúncio de cachorro em **Fernandópolis**: não deve se misturar com os de Brasília.
8. Conta B cria um animal encontrado com data muito anterior ao desaparecimento (>7 dias): não deve ser sugerido.
9. Alterar cor/porte para valores diferentes deve gerar divergência ou fazer a sugestão desaparecer, conforme sinais restantes.
10. Conta B marca o animal como reencontrado ou arquiva o anúncio de teste: o par deve desaparecer da aba e do detalhe após atualizar.
11. Visitante deslogado vê apenas anúncios públicos aprovados; um anúncio `pending` nunca deve ser candidato.
12. Confirmar o layout mobile, abertura dos dois anúncios e o funcionamento das ações privadas existentes.
13. Arquive os anúncios de teste no final.

## Limitações e segurança
- O algoritmo atua sobre **até 200 alertas recentes retornados na página**. Se um anúncio não estiver no lote carregado, pode não participar. Isso não significa que não existam correspondências.
- Nenhuma informação privada, endereço exato, mensagem entre usuários, contato ou coordenada GPS participa do cálculo.
- Região igual pode corresponder a uma área extensa; coincidências são apenas pistas.
- O mecanismo não faz reconhecimento visual, detecção de duplicatas por imagem ou verificação da titularidade do pet.
- Novas sugestões aparecem ao consultar/atualizar a Central. **Ainda não existe push, e-mail ou notificação automática.**
- Ao contatar a outra parte, os usuários devem confirmar fotos, marcas únicas e vínculo antes de qualquer entrega.

## Publicação
Não é necessária migração SQL. Este PR deve permanecer separado de `main` até a homologação pelo usuário no endereço de Preview da Cloudflare. O build pode ser conferido nos checks do GitHub.
