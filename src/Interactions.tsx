import {useEffect,useState,type FormEvent} from 'react'
import {Heart,MessageCircle,Send,ShieldCheck,ArrowLeft,MapPin,UserRound,Users,LockKeyhole,ClipboardCheck,House,CheckCircle2} from 'lucide-react'
import {supabase,type PetListing} from './supabase'
import type {User} from '@supabase/supabase-js'
import './interactions.css'
import {questionnaireLabels,questionnaireValues} from './AdoptionForm'

export type AdoptionRequest={id:string;pet_id:string;adopter_id:string;owner_id:string;intent:'question'|'adoption';status:'pending'|'in_review'|'approved'|'rejected'|'cancelled'|'completed';created_at:string}
type Message={id:string;request_id:string;sender_id:string;body:string;created_at:string}
type Participant={user_id:string;display_name:string;role:'adopter'|'protector'|'ngo';district:string;neighborhood:string;city:string}
type Questionnaire={request_id:string;adopter_id:string;housing:string;household:string;children:string;other_pets:string;daily_time:string;experience:string;motivation:string}
export function useCurrentUser(){
 const [user,setUser]=useState<User|null>(null)
 useEffect(()=>{if(!supabase)return;const client=supabase;let live=true;client.auth.getUser().then(r=>{if(live)setUser(r.data.user)});const {data:{subscription}}=client.auth.onAuthStateChange((_e,s)=>setUser(s?.user??null));return()=>{live=false;subscription.unsubscribe()}},[])
 return user
}
export function useFavorites(user:User|null){
 const [ids,setIds]=useState<string[]>([])
 const [error,setError]=useState('')
 useEffect(()=>{if(!supabase||!user){setIds([]);return}let live=true;supabase.from('pet_favorites').select('pet_id').eq('user_id',user.id).then(({data,error})=>{if(live){if(error){setError('Ative a migração DIFF 002.1 para salvar favoritos.');setIds([])}else{setError('');setIds((data||[]).map(r=>r.pet_id))}}});return()=>{live=false}},[user])
 const toggle=async(petId:string)=>{
  if(!supabase||!user)return false
  const exists=ids.includes(petId)
  const {error:e}=exists?await supabase.from('pet_favorites').delete().eq('user_id',user.id).eq('pet_id',petId):await supabase.from('pet_favorites').insert({user_id:user.id,pet_id:petId})
  if(e){setError('Não foi possível salvar favorito: '+e.message);return false}
  setError('');setIds(a=>exists?a.filter(x=>x!==petId):[...a,petId]);return true
 }
 return {ids,error,toggle}
}
export async function startConversation(pet:PetListing,user:User,intent:'question'|'adoption'){
 if(!supabase)throw Error('Banco não configurado')
 if(pet.owner_id===user.id)throw Error('Você não pode solicitar adoção de um animal cadastrado por você.')
 const {data:existing,error:readError}=await supabase.from('adoption_requests').select('*').eq('pet_id',pet.id).eq('adopter_id',user.id).maybeSingle()
 if(readError)throw Error('Habilite a migração DIFF 002.1 no Supabase: '+readError.message)
 if(existing){
  if(existing.status==='cancelled'||existing.status==='rejected')throw Error('Esta conversa foi encerrada. Peça ao responsável para reavaliar o contato.')
  if(intent==='adoption'&&existing.intent==='question'){
   const {error:noticeError}=await supabase.from('adoption_messages').insert({request_id:existing.id,sender_id:user.id,body:'Tenho interesse em adotar este pet. Podemos conversar sobre os próximos passos?'})
   if(noticeError)throw Error('Não foi possível comunicar seu interesse: '+noticeError.message)
  }
  return existing as AdoptionRequest
 }
 const {data,error}=await supabase.from('adoption_requests').insert({pet_id:pet.id,adopter_id:user.id,owner_id:pet.owner_id,intent,status:'pending'}).select('*').single()
 if(error)throw Error('Não foi possível iniciar conversa: '+error.message)
 return data as AdoptionRequest
}

export function Conversations({user,onLogin}:{user:User|null;onLogin:()=>void}){
 const [requests,setRequests]=useState<AdoptionRequest[]>([])
 const [selected,setSelected]=useState<AdoptionRequest|null>(null)
 const [messages,setMessages]=useState<Message[]>([])
 const [pets,setPets]=useState<Record<string,PetListing>>({})
 const [participants,setParticipants]=useState<Participant[]>([])
 const [questionnaire,setQuestionnaire]=useState<Questionnaire|null>(null)
 const [participantError,setParticipantError]=useState('')
 const [draft,setDraft]=useState('')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [refresh,setRefresh]=useState(0)
 useEffect(()=>{if(!supabase||!user)return;let live=true;const client=supabase
  client.from('adoption_requests').select('*').order('created_at',{ascending:false}).then(async({data,error})=>{
   if(!live)return
   if(error){setError('Para habilitar solicitações, execute a migração DIFF 002.1 no Supabase.');return}
   const rows=(data||[]) as AdoptionRequest[];setRequests(rows);setError('')
   const ids=[...new Set(rows.map(x=>x.pet_id))]
   if(ids.length){const res=await client.from('pets').select('*').in('id',ids);if(live)setPets(Object.fromEntries(((res.data||[]) as PetListing[]).map(p=>[p.id,p])))}}
  )
  return()=>{live=false}
 },[user,refresh])
 useEffect(()=>{
  if(!supabase||!selected){setParticipants([]);setParticipantError('');return}
  let active=true
  setParticipants([]);setParticipantError('')
  supabase.rpc('caonect_conversation_people',{p_request_id:selected.id}).then(({data,error})=>{
    if(!active)return
    if(error){setParticipantError('Os dados dos participantes serão liberados após executar a migração DIFF 003.1 no Supabase.');return}
    setParticipants((data||[]) as Participant[])
  })
  return()=>{active=false}
 },[selected])
 useEffect(()=>{
  if(!supabase||!selected){setQuestionnaire(null);return}
  const client=supabase;let live=true
  setQuestionnaire(null)
  client.from('adoption_questionnaires').select('*').eq('request_id',selected.id).maybeSingle()
   .then(({data,error})=>{if(live){if(error)setError('Para consultar o formulário, execute o SQL DIFF 003.2.');else setQuestionnaire(data as Questionnaire|null)}})
  return()=>{live=false}
 },[selected])
 const completeAdoption=async()=>{
  if(!supabase||!selected||!user||selected.owner_id!==user.id)return
  if(!window.confirm('O animal já foi entregue ao adotante? Esta ação concluirá a adoção e encerrará outras solicitações abertas.'))return
  setBusy(true);setError('')
  const {error}=await supabase.rpc('caonect_complete_adoption',{p_request_id:selected.id})
  if(error)setError('Não foi possível concluir: '+error.message)
  else{setSelected({...selected,status:'completed'});setRefresh(x=>x+1)}
  setBusy(false)
 }
 const roleName=(role:Participant['role'])=>role==='ngo'?'ONG':role==='protector'?'Protetor independente':'Adotante'
 const locationLabel=(p:Participant)=>[p.neighborhood,p.district,p.city||'Brasília'].filter(Boolean).join(' · ')
 useEffect(()=>{if(!supabase||!selected)return;let live=true
  const load=()=>supabase!.from('adoption_messages').select('*').eq('request_id',selected.id).order('created_at',{ascending:true}).then(({data,error})=>{if(live){if(error)setError(error.message);else setMessages((data||[]) as Message[])}})
  load();const t=setInterval(load,7000);return()=>{live=false;clearInterval(t)}
 },[selected])
 const send=async(e:FormEvent)=>{e.preventDefault();if(!supabase||!user||!selected||!draft.trim())return;setBusy(true);setError('')
  const {error}=await supabase.from('adoption_messages').insert({request_id:selected.id,sender_id:user.id,body:draft.trim()})
  if(error)setError(error.message);else{setDraft('');const {data}=await supabase.from('adoption_messages').select('*').eq('request_id',selected.id).order('created_at');setMessages((data||[]) as Message[])}
  setBusy(false)
 }
 const changeStatus=async(value:AdoptionRequest['status'])=>{if(!supabase||!selected)return;setBusy(true);const {error}=await supabase.from('adoption_requests').update({status:value}).eq('id',selected.id);if(error)setError(error.message);else{setSelected({...selected,status:value});setRefresh(x=>x+1)}setBusy(false)}
 if(!user)return <section className="section page"><h1>Minhas conversas e adoções</h1><div className="empty"><Heart size={36}/><p>Entre na sua conta para conversar com protetores e acompanhar suas solicitações.</p><button className="primary" onClick={onLogin}>Entrar ou cadastrar</button></div></section>
 return <section className="section page"><span className="kicker">UMA NOVA HISTÓRIA COMEÇA AQUI</span><h1>Conversas e adoções</h1><p>Converse com segurança pelo Cãonect. Evite compartilhar documentos, telefones e endereços antes de verificar o responsável.</p>{error&&<p className="portal-notice" role="alert">{error}</p>}
  {selected?<div className="chat-box"><div className="chat-header"><button aria-label="Voltar às conversas" onClick={()=>{setSelected(null);setMessages([])}}><ArrowLeft size={20}/></button><div><strong>{pets[selected.pet_id]?.name||'Pet'}</strong><small> {selected.status==='pending'?'Pendente':selected.status==='in_review'?'Em análise':selected.status==='approved'?'Aprovada':selected.status==='rejected'?'Recusada':selected.status==='completed'?'Adoção concluída':'Cancelada'}</small></div></div>
   <div className="chat-participants">
    <div className="chat-pet-summary"><span className="chat-pet-icon">{pets[selected.pet_id]?.image_url?<img src={pets[selected.pet_id].image_url!} alt="" />:<Users size={24}/>}</span><div><strong>Conversa sobre {pets[selected.pet_id]?.name||'o animal'}</strong><small>{pets[selected.pet_id]?.breed||'Pet'} · {pets[selected.pet_id]?.district||'Distrito Federal'}</small></div></div>
    {participantError&&<p role="status" className="portal-notice">{participantError}</p>}
    <div className="chat-people-grid">
    {(['owner','adopter'] as const).map(kind=>{
      const id=kind==='owner'?selected.owner_id:selected.adopter_id
      const p=participants.find(x=>x.user_id===id)
      return <div key={kind} className="chat-person">
       <div className="chat-person-avatar"><UserRound size={21}/></div>
       <div><span className="chat-person-role">{kind==='owner'?'RESPONSÁVEL PELO PET':'INTERESSADO NA ADOÇÃO'}</span><strong>{p?.display_name||'Dados disponíveis após atualização'}</strong><small>{p?roleName(p.role):kind==='owner'?'Protetor ou ONG':'Adotante'}</small>
       {p&&<small className="chat-person-location"><MapPin size={13}/>{locationLabel(p)||'Distrito Federal'}</small>}</div>
       {id===user.id&&<span className="chat-me">Você</span>}
      </div>
    })}
    </div><p className="chat-privacy"><LockKeyhole size={14}/> Somente participantes desta conversa podem visualizar esses dados. Telefone, e-mail e endereço não são exibidos.</p>
   </div>
   <div className="chat-messages">{messages.length===0&&<p className="chat-empty">A conversa começa aqui. Conte um pouco sobre seu interesse e tire suas dúvidas.</p>}{messages.map(m=><div key={m.id} className={'bubble '+(m.sender_id===user.id?'mine':'theirs')}><p>{m.body}</p><small>{new Date(m.created_at).toLocaleString('pt-BR')}</small></div>)}</div>
   {selected.owner_id===user.id&&<div className="chat-status"><label>Andamento da solicitação <select value={selected.status} disabled={busy} onChange={e=>changeStatus(e.target.value as AdoptionRequest['status'])}><option value="pending">Pendente</option><option value="in_review">Em análise</option><option value="approved">Aprovada</option><option value="rejected">Recusada</option><option value="cancelled">Cancelada</option></select></label></div>}
   {selected.status==='rejected'||selected.status==='cancelled'?<p className="chat-notice">Conversa encerrada.</p>:<form className="chat-compose" onSubmit={send}><input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={2000} placeholder="Escreva uma mensagem..." aria-label="Mensagem"/><button type="submit" className="primary" disabled={busy||!draft.trim()}><Send size={18}/> Enviar</button></form>}
  </div>:requests.length===0?<div className="empty"><MessageCircle size={37}/><h2>Nenhuma conversa ainda</h2><p>Encontre um pet e clique em Conversar com o protetor ou Tenho interesse em adotar.</p></div>:<div className="conversation-list">{requests.map(r=><button key={r.id} onClick={()=>setSelected(r)}><span className="conversation-thumb">{pets[r.pet_id]?.image_url?<img src={pets[r.pet_id].image_url!} alt=""/>:<Heart/>}</span><span><strong>{pets[r.pet_id]?.name||'Pet'}</strong><small>{r.owner_id===user.id?'Interessado em seu animal':'Sua solicitação'} · {r.intent==='adoption'?'Interesse em adoção':'Dúvida'} · {r.status}</small></span><MessageCircle size={20}/></button>)}</div>}
  <p className="safe-note"><ShieldCheck size={15}/> O Cãonect não cobra por adoções. Denúncias e moderação estarão disponíveis em próxima versão.</p>
 </section>
}
