-- Cãonect — DIFF 003.2.1: proteção do chat após conclusão.
-- Executar apenas no projeto Cãonect, após DIFF 003.2.
-- Preserva mensagens, questionários e solicitações existentes.
-- A tela já fecha o campo de resposta; agora o banco aplica a mesma regra.
drop policy if exists messages_participants_write on public.adoption_messages;
create policy messages_participants_write
on public.adoption_messages
for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.adoption_requests r
    where r.id = request_id
      and (
        r.adopter_id = (select auth.uid())
        or r.owner_id = (select auth.uid())
      )
      and r.status not in ('rejected', 'cancelled', 'completed')
  )
);
-- Somente participantes continuam podendo LER o histórico;
-- nenhum deles pode escrever após rejeição, cancelamento ou conclusão.
