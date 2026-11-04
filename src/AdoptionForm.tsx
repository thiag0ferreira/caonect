import {useState,type FormEvent} from 'react'
import {ClipboardList,ShieldCheck,X} from 'lucide-react'
import type {User} from '@supabase/supabase-js'
import type {PetListing} from './supabase'
import {supabase} from './supabase'
import {startConversation} from './Interactions'
import './adoption.css'

const housingOptions=[['casa','Casa'],['apartamento','Apartamento'],['outro','Outro']]
const householdOptions=[['sozinho','Moro sozinho(a)'],['familia','Com a família'],['compartilhado','Moradia compartilhada'],['outro','Outro']]
const timeOptions=[['ate_2h','Até 2 horas'],['2_a_5h','De 2 a 5 horas'],['mais_5h','Mais de 5 horas'],['varia','Varia conforme o dia']]
const experienceOptions=[['primeira_vez','Primeira adoção / pet'],['ja_tive','Já tive animais'],['tenho_atualmente','Tenho animais atualmente']]
const initial={housing:'',household:'',children:'',other_pets:'',daily_time:'',experience:'',motivation:''}
export type AdoptionAnswers=typeof initial
export const questionnaireLabels:{[key:string]:string}={
 housing:'Tipo de moradia',household:'Com quem mora',children:'Há crianças na residência?',
 other_pets:'Já há outros animais?',daily_time:'Tempo disponível para cuidados',
 experience:'Experiência com animais',motivation:'Por que deseja adotar?'
}
export const questionnaireValues:{[key:string]:string}={
 casa:'Casa',apartamento:'Apartamento',outro:'Outro',sozinho:'Moro sozinho(a)',
 familia:'Com a família',compartilhado:'Moradia compartilhada',sim:'Sim',nao:'Não',
 prefiro_nao_informar:'Prefiro não informar',ate_2h:'Até 2 horas', '2_a_5h':'De 2 a 5 horas',
 mais_5h:'Mais de 5 horas',varia:'Varia conforme o dia',primeira_vez:'Primeira adoção/pet',
 ja_tive:'Já tive animais',tenho_atualmente:'Tenho animais atualmente'
}
type Props={pet:PetListing;user:User|null;onClose:()=>void;onSuccess:()=>void;onLogin?:()=>void}
export default function AdoptionForm({pet,user,onClose,onSuccess,onLogin}:Props){
 const [answers,setAnswers]=useState<AdoptionAnswers>(initial)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const set=(field:keyof AdoptionAnswers,value:string)=>setAnswers(prev=>({...prev,[field]:value}))
 async function submit(e:FormEvent){
  e.preventDefault()
  if(!supabase||!user){setError('Entre na sua conta para solicitar adoção.');return}
  if(answers.motivation.trim().length<20){setError('Conte um pouco mais sobre sua motivação (mínimo de 20 caracteres).');return}
  setBusy(true);setError('')
  try{
   const request=await startConversation(pet,user,'adoption')
   const {data:existing,error:readError}=await supabase.from('adoption_questionnaires').select('request_id').eq('request_id',request.id).maybeSingle()
   if(readError)throw Error('Execute a migração DIFF 003.2 no Supabase: '+readError.message)
   if(existing){onSuccess();return}
   const {error:insertError}=await supabase.from('adoption_questionnaires').insert({
    request_id:request.id,adopter_id:user.id,...answers,motivation:answers.motivation.trim()
   })
   if(insertError)throw Error('Não foi possível enviar o questionário: '+insertError.message)
   onSuccess()
  }catch(ex){setError(ex instanceof Error?ex.message:'Não foi possível enviar o pedido.')}
  finally{setBusy(false)}
 }
 const select=(label:string,field:keyof AdoptionAnswers,options:string[][])=>(
  <label>{label}<select required value={answers[field]} onChange={e=>set(field,e.target.value)}>
   <option value="">Selecione uma opção</option>{options.map(([v,l])=><option value={v} key={v}>{l}</option>)}
  </select></label>
 )
 return <div className="adoption-overlay" onClick={onClose}><section className="adoption-dialog" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label={'Solicitar adoção de '+pet.name}>
  <div className="adoption-top"><div><span className="kicker">ADOÇÃO RESPONSÁVEL</span><h2>Quero adotar {pet.name}</h2><p>Conte ao protetor como você pode acolher esse novo amigo.</p></div><button aria-label="Fechar" onClick={onClose}><X size={23}/></button></div>
  {!user?<div className="adoption-login"><p>Para proteger os animais e os interessados, entre na sua conta antes de enviar o formulário.</p><button className="primary" onClick={onLogin}>Entrar ou criar conta</button></div>:
  <form className="adoption-form" onSubmit={submit}>
   <div className="adoption-form-grid">
    {select('Tipo de moradia *','housing',housingOptions)}
    {select('Com quem você mora? *','household',householdOptions)}
    {select('Há crianças na residência? *','children',[['sim','Sim'],['nao','Não'],['prefiro_nao_informar','Prefiro não informar']])}
    {select('Você já tem outros pets? *','other_pets',[['sim','Sim'],['nao','Não']])}
    {select('Tempo disponível para os cuidados *','daily_time',timeOptions)}
    {select('Experiência com pets *','experience',experienceOptions)}
   </div>
   <label>Por que deseja adotar {pet.name}? *<textarea required minLength={20} maxLength={1500} rows={4} value={answers.motivation} onChange={e=>set('motivation',e.target.value)} placeholder="Conte sobre sua rotina, expectativas e o cuidado que poderá oferecer."/></label>
   <div className="adoption-privacy"><ShieldCheck size={19}/><span>Respostas visíveis apenas a você e ao responsável por este pet. Não compartilhe documentos, endereço completo ou dados sensíveis.</span></div>
   {error&&<p className="portal-notice" role="alert">{error}</p>}
   <div className="adoption-form-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button disabled={busy} className="primary" type="submit"><ClipboardList size={17}/>{busy?'Enviando...':'Enviar solicitação'}</button></div>
  </form>}
 </section></div>
}
