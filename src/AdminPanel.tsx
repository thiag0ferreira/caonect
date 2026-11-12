import {useEffect,useState,type FormEvent} from 'react'
import type {User} from '@supabase/supabase-js'
import {supabase} from './supabase'
import {AlertTriangle,CheckCircle2,ClipboardCheck,Eye,Flag,LockKeyhole,PawPrint,RefreshCw,ShieldCheck,Users,X} from 'lucide-react'
import {lostFoundPhoto} from './lostFound'
import AdminAnalytics from './AdminAnalytics'
import './admin.css'

type Section='analytics'|'reports'|'pets'|'alerts'|'users'|'audit'
type Entity='report'|'pet'|'alert'
type Action='approve'|'reject'|'hide'|'archive'|'reviewed'|'dismissed'
type Counts={users:number;pets:number;pending_pets:number;pending_alerts:number;pending_reports:number;active_alerts:number}
type PetRow={
 id:string;owner_id:string;owner_name:string;name:string;species:string;animal_category:string;
 review_status:string;status:string;legal_origin_notes:string;scientific_name:string|null;
 city:string;district:string;description:string;image_url:string|null;photo_urls:string[]|null;created_at:string
}
type AlertRow={
 id:string;owner_id:string;owner_name:string;pet_name:string|null;species:string;category:string;
 alert_type:'lost'|'found';city:string;district:string;color:string;photo_paths:string[];
 status:string;moderation_status:string;characteristics:string;description:string;created_at:string
}
type ReportRow={
 id:string;alert_id:string;reason:string;details:string;status:string;created_at:string;
 alert_name:string|null;alert_type:string|null;species:string|null;city:string|null;district:string|null;alert_photo_path:string|null;
 alert_status:string|null;alert_moderation:string|null
}
type UserRow={id:string;display_name:string;role:string;city:string;district:string;created_at:string;pets_count:number;alerts_count:number}
type AuditRow={id:number;actor_id:string;entity_type:string;entity_id:string;action:string;note:string;previous_state:string|null;next_state:string|null;created_at:string}
type Pending={entity:Entity;id:string;action:Action;label:string;category?:string;origin?:string}

const date=(value:string)=>value?new Date(value).toLocaleDateString('pt-BR'):'—'
const statuses:Record<string,string>={
 pending:'Pendente',approved:'Aprovado',rejected:'Rejeitado',
 active:'Ativo',archived:'Arquivado',resolved:'Reencontrado',
 available:'Disponível',reserved:'Reservado',adopted:'Adotado',
 reviewed:'Analisada',dismissed:'Descartada'
}
const sections:{key:Section;label:string}[]=[
 {key:'analytics',label:'Indicadores'},
 {key:'reports',label:'Denúncias'},
 {key:'pets',label:'Aprovação de animais'},
 {key:'alerts',label:'Perdidos e encontrados'},
 {key:'users',label:'Usuários'},
 {key:'audit',label:'Auditoria'}
]
const validArray=(value:unknown):unknown[]=>Array.isArray(value)?value:[]
const errorText=(e:unknown)=>e instanceof Error?e.message:'Ocorreu um erro inesperado.'
const isExotic=(c:string)=>!['Cachorros','Gatos'].includes(c)

export default function AdminPanel({user,onLogin}:{user:User|null;onLogin:()=>void}){
 const [access,setAccess]=useState<'checking'|'granted'|'denied'>('checking')
 const [section,setSection]=useState<Section>('analytics')
 const [page,setPage]=useState(0)
 const [refresh,setRefresh]=useState(0)
 const [loading,setLoading]=useState(false)
 const [rows,setRows]=useState<unknown[]>([])
 const [counts,setCounts]=useState<Counts|null>(null)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [pending,setPending]=useState<Pending|null>(null)
 const [reason,setReason]=useState('')
 const [confirmedLegal,setConfirmedLegal]=useState(false)
 const [saving,setSaving]=useState(false)
 const [onlyPending,setOnlyPending]=useState(true)

 useEffect(()=>{
  if(!user||!supabase){setAccess('denied');setRows([]);setCounts(null);return}
  let active=true
  setAccess('checking')
  supabase.rpc('caonect_admin_is_admin').then(({data,error})=>{
   if(!active)return
   setAccess(!error&&data===true?'granted':'denied')
  })
  return()=>{active=false}
 },[user?.id])

 useEffect(()=>{
  if(access!=='granted'||!supabase)return
  let active=true
  setLoading(true);setError('')
  const client=supabase
  const dashboard=client.rpc('caonect_admin_dashboard')
  const list=section==='analytics'
   ?Promise.resolve({data:[],error:null})
   :section==='audit'
    ?client.rpc('caonect_admin_audit',{p_limit:60})
    :client.rpc('caonect_admin_list',{p_section:section,p_limit:30,p_offset:page*30})
  Promise.all([dashboard,list]).then(([d,l])=>{
   if(!active)return
   if(d.error||l.error){setError(d.error?.message||l.error?.message||'Falha ao consultar painel.');setRows([])}
   else{setCounts(d.data as Counts);setRows(validArray(l.data))}
  }).catch(e=>{if(active)setError(errorText(e))})
   .finally(()=>{if(active)setLoading(false)})
  return()=>{active=false}
 },[access,section,page,refresh])

 const select=(key:Section)=>{setSection(key);setPage(0);setRows([]);setOnlyPending(true);setError('');setNotice('')}
 const refreshAll=()=>setRefresh(v=>v+1)
 const start=(entity:Entity,id:string,action:Action,label:string,category?:string,origin?:string)=>{
  setPending({entity,id,action,label,category,origin});setReason('');setConfirmedLegal(false);setNotice('');setError('')
 }
 const execute=async(event:FormEvent)=>{
  event.preventDefault()
  if(!supabase||!pending||reason.trim().length<10||reason.length>1000)return
  if(pending.entity==='pet'&&pending.action==='approve'&&isExotic(pending.category||'')&&!confirmedLegal)return
  setSaving(true);setError('')
  const {error}=await supabase.rpc('caonect_admin_moderate',{
   p_entity:pending.entity,p_id:pending.id,p_action:pending.action,p_note:reason.trim()
  })
  setSaving(false)
  if(error){setError(error.message);return}
  setNotice('Decisão registrada e auditada. A lista foi atualizada.')
  setPending(null);setReason('');refreshAll()
 }
 const count=(key:keyof Counts)=>counts?.[key]??'—'
 const filtered=rows.filter(raw=>{
  if(section==='pets'&&onlyPending)return (raw as PetRow).review_status==='pending'
  if(section==='alerts'&&onlyPending)return (raw as AlertRow).moderation_status==='pending'
  if(section==='reports'&&onlyPending)return (raw as ReportRow).status==='pending'
  return true
 })
 return <section className="section page ca-admin">
  <div className="ca-admin-head"><span className="kicker"><ShieldCheck size={16}/> CÃONECT — ADMINISTRAÇÃO</span><h1>Painel administrativo</h1>
   <p>Moderação responsável, acompanhamento e registro de decisões. O acesso é conferido no Supabase.</p></div>
  {!user?<div className="ca-admin-state"><LockKeyhole size={30}/><h2>Acesso restrito</h2><p>Entre com sua conta administrativa para continuar.</p><button className="primary" onClick={onLogin}>Entrar na minha conta</button></div>:
   access==='checking'?<div className="ca-admin-state" role="status"><ShieldCheck size={30}/><p>Verificando autorização…</p></div>:
   access==='denied'?<div className="ca-admin-state" role="alert"><LockKeyhole size={30}/><h2>Conta sem permissão administrativa</h2><p>O acesso não depende do tipo de perfil. Um administrador precisa ativar seu UID no Supabase após executar o SQL do DIFF 007.6.</p></div>:
   <>
    <div className="ca-admin-stats">
     <article><Users size={20}/><strong>{count('users')}</strong><span>Usuários</span></article>
     <article><PawPrint size={20}/><strong>{count('pets')}</strong><span>Animais cadastrados</span></article>
     <article><ClipboardCheck size={20}/><strong>{count('pending_pets')}</strong><span>Animais para revisar</span></article>
     <article><Eye size={20}/><strong>{count('pending_alerts')}</strong><span>Alertas para revisar</span></article>
     <article><Flag size={20}/><strong>{count('pending_reports')}</strong><span>Denúncias pendentes</span></article>
    </div>
    <div className="ca-admin-toolbar">
     <nav aria-label="Seções administrativas">{sections.map(t=><button type="button" key={t.key} className={section===t.key?'active':''} onClick={()=>select(t.key)}>{t.label}</button>)}</nav>
     <button className="secondary" type="button" onClick={refreshAll} disabled={loading}><RefreshCw size={17}/> Atualizar</button>
    </div>
    {['pets','alerts','reports'].includes(section)&&<label className="ca-admin-filter"><input type="checkbox" checked={onlyPending} onChange={e=>setOnlyPending(e.target.checked)}/> Mostrar somente pendentes desta página</label>}
    {error&&<p className="ca-admin-error" role="alert">{error}</p>}
    {notice&&<p className="ca-admin-notice" role="status"><CheckCircle2 size={17}/>{notice}</p>}
    {section==='analytics'?<AdminAnalytics refreshSignal={refresh}/>:
    loading?<div className="ca-admin-state" role="status">Carregando registros…</div>:
     <div className="ca-admin-list">
      {filtered.length===0?<div className="ca-admin-state"><ClipboardCheck size={26}/><h3>Nenhum registro para exibir</h3><p>Altere o filtro ou consulte outra página de resultados.</p></div>:null}
      {section==='pets'&&(filtered as PetRow[]).map(p=><article className="ca-admin-item" key={p.id}>
       <div className="ca-admin-media">{(p.photo_urls?.[0]||p.image_url)?<img src={p.photo_urls?.[0]||p.image_url||''} alt={'Foto de '+p.name}/>:<PawPrint size={36}/>}</div>
       <div className="ca-admin-info">
        <div className="ca-admin-title"><strong>{p.name}</strong><span className={'ca-admin-badge '+p.review_status}>{statuses[p.review_status]||p.review_status}</span></div>
        <p>{p.species} · {p.animal_category} · {p.city}/{p.district}</p>
        <small>Responsável: {p.owner_name||'Não informado'} · Publicado em {date(p.created_at)}</small>
        {p.description&&<p>{p.description}</p>}
        {isExotic(p.animal_category)&&<div className="ca-admin-legal"><AlertTriangle size={17}/><span><strong>Origem legal informada:</strong> {p.legal_origin_notes||'Não informada. Solicite documentação antes de aprovar.'}</span></div>}
        <div className="ca-admin-actions">
         {p.review_status!=='approved'&&<button type="button" onClick={()=>start('pet',p.id,'approve',p.name,p.animal_category,p.legal_origin_notes)}>Aprovar</button>}
         {p.review_status!=='rejected'&&<button type="button" className="danger" onClick={()=>start('pet',p.id,p.review_status==='approved'?'hide':'reject',p.name,p.animal_category)}> {p.review_status==='approved'?'Ocultar anúncio':'Rejeitar'}</button>}
        </div>
       </div>
      </article>)}
      {section==='alerts'&&(filtered as AlertRow[]).map(a=><article className="ca-admin-item" key={a.id}>
       <div className="ca-admin-media">{a.photo_paths?.[0]?<img src={lostFoundPhoto(a.photo_paths[0])} alt={'Foto de '+(a.pet_name||'animal')}/>:<PawPrint size={36}/>}</div>
       <div className="ca-admin-info">
        <div className="ca-admin-title"><strong>{a.pet_name||'Animal encontrado'}</strong><span className={'ca-admin-badge '+a.moderation_status}>{statuses[a.moderation_status]||a.moderation_status}</span><span className="ca-admin-badge">{statuses[a.status]||a.status}</span></div>
        <p>{a.alert_type==='lost'?'Perdido':'Encontrado'} · {a.species} · {a.district}, {a.city}</p>
        <small>Responsável: {a.owner_name||'Não informado'} · {date(a.created_at)}</small>
        {a.characteristics&&<p>{a.characteristics}</p>}
        {a.description&&<p>{a.description}</p>}
        <div className="ca-admin-actions">
         {a.moderation_status!=='approved'&&a.status!=='archived'&&<button type="button" onClick={()=>start('alert',a.id,'approve',a.pet_name||a.species)}>Aprovar alerta</button>}
         {a.moderation_status!=='rejected'&&a.status!=='archived'&&<button type="button" className="danger" onClick={()=>start('alert',a.id,'reject',a.pet_name||a.species)}>Rejeitar</button>}
         {a.status!=='archived'&&<button type="button" className="danger" onClick={()=>start('alert',a.id,'archive',a.pet_name||a.species)}>Arquivar definitivamente</button>}
        </div>
       </div>
      </article>)}
      {section==='reports'&&(filtered as ReportRow[]).map(r=><article className="ca-admin-item ca-admin-report" key={r.id}>
       <div className="ca-admin-media">{r.alert_photo_path?<img src={lostFoundPhoto(r.alert_photo_path)} alt="Foto do alerta denunciado"/>:<Flag size={32}/>}</div>
       <div className="ca-admin-info">
        <div className="ca-admin-title"><strong>Denúncia: {r.alert_name||'Animal encontrado'}</strong><span className={'ca-admin-badge '+r.status}>{statuses[r.status]||r.status}</span></div>
        <p>Motivo: {r.reason} · {r.city||'Cidade não informada'} · {date(r.created_at)}</p>
        <p>{r.details||'O denunciante não forneceu detalhes adicionais.'}</p>
        <small>Alerta: {r.alert_id} · Status atual: {r.alert_moderation||'—'}/{r.alert_status||'—'}</small>
        <p className="ca-admin-help">Concluir uma denúncia não retira automaticamente o conteúdo. Se necessário, use a aba Perdidos e encontrados para rejeitar ou arquivar.</p>
        <div className="ca-admin-actions">
         {r.status!=='reviewed'&&<button type="button" onClick={()=>start('report',r.id,'reviewed',r.alert_name||'denúncia')}>Marcar analisada</button>}
         {r.status!=='dismissed'&&<button type="button" className="danger" onClick={()=>start('report',r.id,'dismissed',r.alert_name||'denúncia')}>Descartar denúncia</button>}
         {r.alert_id&&r.alert_status!=='archived'&&r.alert_moderation!=='rejected'&&<button type="button" className="danger" onClick={()=>start('alert',r.alert_id,'reject',r.alert_name||'alerta denunciado')}>Ocultar alerta denunciado</button>}
        </div>
       </div>
      </article>)}
      {section==='users'&&(filtered as UserRow[]).map(p=><article className="ca-admin-item ca-admin-user" key={p.id}>
       <div className="ca-admin-media"><Users size={29}/></div>
       <div className="ca-admin-info"><div className="ca-admin-title"><strong>{p.display_name||'Usuário sem nome'}</strong><span className="ca-admin-badge">{p.role==='ngo'?'ONG':p.role==='protector'?'Protetor':'Adotante'}</span></div>
        <p>{p.city||'Cidade não informada'}{p.district?', '+p.district:''} · Desde {date(p.created_at)}</p>
        <small>{p.pets_count} animais cadastrados · {p.alerts_count} alertas · ID: {p.id}</small>
       </div>
      </article>)}
      {section==='audit'&&(filtered as AuditRow[]).map(a=><article className="ca-admin-item ca-admin-audit" key={a.id}>
       <div className="ca-admin-media"><ShieldCheck size={29}/></div>
       <div className="ca-admin-info"><div className="ca-admin-title"><strong>{a.entity_type}: {a.action}</strong><span>{date(a.created_at)}</span></div>
        <p>{a.note}</p><small>Responsável: {a.actor_id} · Registro: {a.entity_id} · {a.previous_state||'—'} → {a.next_state||'—'}</small>
       </div>
      </article>)}
     </div>}
    {section!=='audit'&&section!=='analytics'&&<div className="ca-admin-pagination"><button type="button" className="secondary" disabled={page===0||loading} onClick={()=>setPage(v=>v-1)}>Anterior</button><span>Página {page+1}</span><button type="button" className="secondary" disabled={loading||rows.length<30} onClick={()=>setPage(v=>v+1)}>Próxima</button></div>}
    <div className="ca-admin-disclaimer"><LockKeyhole size={18}/><span>Somente dados necessários à moderação. O painel não fornece acesso a senhas, telefones, mensagens privadas ou coordenadas. Todas as decisões precisam de justificativa e ficam registradas no Supabase.</span></div>
   </>}
  {pending&&<div className="ca-admin-overlay" onClick={()=>!saving&&setPending(null)}><div className="ca-admin-dialog" role="dialog" aria-modal="true" aria-label="Confirmar decisão administrativa" onClick={e=>e.stopPropagation()}>
   <button type="button" className="ca-admin-close" aria-label="Fechar" disabled={saving} onClick={()=>setPending(null)}><X size={20}/></button>
   <h2>Confirmar decisão</h2>
   <p>Conteúdo: <strong>{pending.label}</strong></p>
   <p>Ação: <strong>{pending.action}</strong>. Essa alteração será registrada no histórico de moderação.</p>
   <form onSubmit={execute}>
    <label>Justificativa obrigatória (10 a 1000 caracteres)
     <textarea required minLength={10} maxLength={1000} rows={4} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Explique os critérios utilizados nesta decisão."/>
    </label>
    {pending.entity==='pet'&&pending.action==='approve'&&isExotic(pending.category||'')&&<label className="ca-admin-confirm"><input type="checkbox" checked={confirmedLegal} onChange={e=>setConfirmedLegal(e.target.checked)}/> Confirmei manualmente a procedência e os documentos exigidos para a espécie. Sei que uma declaração do anunciante, sozinha, não comprova legalidade.</label>}
    {error&&<p className="ca-admin-error" role="alert">{error}</p>}
    <div className="ca-admin-dialog-actions"><button type="button" className="secondary" disabled={saving} onClick={()=>setPending(null)}>Cancelar</button><button type="submit" className="primary" disabled={saving||reason.trim().length<10||(pending.entity==='pet'&&pending.action==='approve'&&isExotic(pending.category||'')&&!confirmedLegal)}>{saving?'Salvando…':'Confirmar decisão'}</button></div>
   </form>
  </div></div>}
 </section>
}
