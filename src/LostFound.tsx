import {useEffect,useMemo,useState,type FormEvent} from 'react'
import type {User} from '@supabase/supabase-js'
import {ArrowLeft,CalendarDays,Camera,CheckCircle2,HeartHandshake,Info,MapPin,MessageCircle,Plus,Search,Share2,ShieldCheck,Trash2} from 'lucide-react'
import {supabase,isBackendReady} from './supabase'
import {SUPPORTED_CITIES,FERNANDOPOLIS_AREAS,stateForCity} from './supportedLocations'
import {RAS} from './dfRegions'
import {ANIMAL_CATEGORIES} from './animalCategories'
import {lostFoundPhoto,lostFoundLink,statusLabel,custodyLabel,type AlertType,type LostFoundAlert,type LostFoundTip} from './lostFound'
import LostFoundEditor from './LostFoundEditor'
import './lostFound.css'

type Props={user:User|null;onLogin:()=>void}
type Filter='all'|'lost'|'found'|'resolved'|'mine'
const displayDate=(value:string)=>new Date(value.slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR')
const isGuid=(x:string|null)=>!!x&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x)
export default function LostFound({user,onLogin}:Props){
 const [alerts,setAlerts]=useState<LostFoundAlert[]>([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [refresh,setRefresh]=useState(0)
 const [editor,setEditor]=useState<{type:AlertType;editing?:LostFoundAlert}|null>(null)
 const [detail,setDetail]=useState<LostFoundAlert|null>(null)
 const [chosenId,setChosenId]=useState<string|null>(()=>{
   const id=new URLSearchParams(window.location.search).get('alert')
   return isGuid(id)?id:null
 })
 const [filter,setFilter]=useState<Filter>('all')
 const [city,setCity]=useState('Todas')
 const [district,setDistrict]=useState('')
 const [species,setSpecies]=useState('Todas')
 const [search,setSearch]=useState('')
 const [notice,setNotice]=useState('')
 const [working,setWorking]=useState(false)
 const [contact,setContact]=useState(false)
 const [tipMessage,setTipMessage]=useState('')
 const [tipArea,setTipArea]=useState('')
 const [tipDate,setTipDate]=useState('')
 const [tips,setTips]=useState<LostFoundTip[]>([])
 const [tipBusy,setTipBusy]=useState(false)
 const [tipError,setTipError]=useState('')

 useEffect(()=>{
  if(!supabase){setLoading(false);setError('Conexão com o Supabase indisponível.');return}
  const client=supabase
  let active=true
  setLoading(true)
  client.from('lost_found_alerts').select('*').order('created_at',{ascending:false}).limit(200)
  .then(({data,error})=>{
   if(!active)return
   setLoading(false)
   if(error){setError('Não foi possível carregar os alertas. Verifique a migração SQL 007.1: '+error.message);return}
   setAlerts((data||[]) as LostFoundAlert[])
   setError('')
  })
  return()=>{active=false}
 },[refresh,user?.id])

 useEffect(()=>{
  if(!chosenId||!supabase){setDetail(null);return}
  const known=alerts.find(a=>a.id===chosenId)
  if(known){setDetail(known);return}
  let active=true
  supabase.from('lost_found_alerts').select('*').eq('id',chosenId).maybeSingle().then(({data})=>{
    if(active)setDetail(data as LostFoundAlert|null)
  })
  return()=>{active=false}
 },[chosenId,alerts])

 useEffect(()=>{
  const onPop=()=>{
    const id=new URLSearchParams(window.location.search).get('alert')
    setChosenId(isGuid(id)?id:null)
    setContact(false);setEditor(null);setNotice('')
  }
  window.addEventListener('popstate',onPop)
  return()=>window.removeEventListener('popstate',onPop)
 },[])

 useEffect(()=>{
  if(!detail||!user||detail.owner_id!==user.id||!supabase){setTips([]);return}
  let active=true
  supabase.from('lost_found_tips').select('*').eq('alert_id',detail.id).order('created_at',{ascending:false})
   .then(({data})=>{if(active)setTips((data||[]) as LostFoundTip[])})
  return()=>{active=false}
 },[detail?.id,user?.id,refresh])

 const visible=useMemo(()=>alerts.filter(a=>{
  const own=!!user&&a.owner_id===user.id
  if(filter==='mine')return own
  if(a.status==='archived'||a.moderation_status!=='approved')return false
  if(filter==='lost'&&a.alert_type!=='lost')return false
  if(filter==='found'&&a.alert_type!=='found')return false
  if(filter==='resolved'&&a.status!=='resolved')return false
  if(filter!=='resolved'&&a.status==='resolved')return false
  if(city!=='Todas'&&a.city!==city)return false
  if(district&&!((a.district+' '+a.approximate_area).toLocaleLowerCase('pt-BR').includes(district.toLocaleLowerCase('pt-BR'))))return false
  if(species!=='Todas'&&a.category!==species)return false
  const text=[a.pet_name,a.species,a.color,a.breed,a.characteristics,a.city,a.district,a.description].join(' ').toLocaleLowerCase('pt-BR')
  return text.includes(search.trim().toLocaleLowerCase('pt-BR'))
 }),[alerts,filter,city,district,species,search,user?.id])

 const showDetail=(alert:LostFoundAlert)=>{
  const url=new URL(window.location.href)
  url.searchParams.set('alert',alert.id);url.searchParams.delete('pagina')
  window.history.pushState({},'',url.pathname+url.search)
  setChosenId(alert.id);setEditor(null);setContact(false);setNotice('');window.scrollTo({top:0,behavior:'smooth'})
 }
 const closeDetail=()=>{
  const url=new URL(window.location.href)
  url.searchParams.delete('alert');url.searchParams.set('pagina','perdidos-encontrados')
  window.history.pushState({},'',url.pathname+url.search)
  setChosenId(null);setDetail(null);setContact(false);setNotice('')
 }
 const create=(type:AlertType)=>{
  if(!user){onLogin();return}
  setChosenId(null);setDetail(null);setEditor({type});setNotice('')
 }
 const onSaved=()=>{
  setEditor(null);setChosenId(null);setDetail(null);setRefresh(x=>x+1)
  setFilter('mine');setNotice('Alerta salvo! Cães e gatos são publicados; outras espécies aguardam revisão.')
 }
 const updateStatus=async(status:'resolved'|'archived')=>{
  if(!supabase||!detail||!user||detail.owner_id!==user.id)return
  const message=status==='resolved'?'Confirmar que o animal reencontrou sua família?':'Arquivar este alerta?'
  if(!window.confirm(message))return
  setWorking(true);setNotice('')
  const {error}=await supabase.from('lost_found_alerts').update({status}).eq('id',detail.id).eq('owner_id',user.id)
  if(error)setNotice('Não foi possível atualizar: '+error.message)
  else{
   setDetail({...detail,status})
   setAlerts(old=>old.map(a=>a.id===detail.id?{...a,status}:a))
   setNotice(status==='resolved'?'Que alegria! O reencontro foi registrado.':'Alerta arquivado.')
   setRefresh(x=>x+1)
  }
  setWorking(false)
 }
 const share=async(alert:LostFoundAlert)=>{
  const url=lostFoundLink(alert.id)
  const text=alert.alert_type==='lost'?'Ajude a encontrar '+(alert.pet_name||'este pet'):'Você conhece a família deste animal encontrado?'
  try{
   if(navigator.share){await navigator.share({title:text,text:'Alerta Cãonect — '+alert.district+', '+alert.city,url});return}
   await navigator.clipboard.writeText(url)
   setNotice('Link copiado! Envie pelo WhatsApp ou compartilhe nas redes.')
  }catch(e){
   if((e as Error)?.name!=='AbortError'){
     try{await navigator.clipboard.writeText(url);setNotice('Link copiado!')}catch{window.prompt('Copie o link:',url)}
   }
  }
 }
 const sendTip=async(e:FormEvent)=>{
  e.preventDefault()
  if(!supabase||!detail||!user)return
  if(tipMessage.trim().length<10){setTipError('Escreva pelo menos 10 caracteres.');return}
  setTipBusy(true);setTipError('')
  const {error}=await supabase.from('lost_found_tips').insert({
    alert_id:detail.id,sender_id:user.id,message:tipMessage.trim(),
    approximate_area:tipArea.trim(),sighting_date:tipDate||null
  })
  setTipBusy(false)
  if(error){setTipError('Não foi possível enviar: '+error.message);return}
  setContact(false);setTipMessage('');setTipArea('');setTipDate('')
  setNotice('Informação enviada com segurança ao responsável pelo alerta.')
 }
 if(!isBackendReady)return <section className="section page"><h1>Pets Perdidos e Encontrados</h1><p>O serviço de dados não está configurado neste ambiente.</p></section>
 return <section className="section page lf-page">
  <div className="lf-heading">
   <span className="kicker"><Search size={16}/> CÃONECT — REENCONTROS</span>
   <h1>Pets perdidos e encontrados</h1>
   <p>Uma foto e uma informação podem ajudar uma família a se reencontrar. Começamos por Brasília/DF e Fernandópolis/SP.</p>
  </div>

  {editor?<LostFoundEditor key={editor.editing?.id||editor.type} user={user} type={editor.type} editing={editor.editing} onCancel={()=>setEditor(null)} onDone={onSaved}/>:
  chosenId?<div className="lf-detail-view">
   <button className="lf-back" onClick={closeDetail}><ArrowLeft size={17}/> Voltar à central</button>
   {!detail?<div className="lf-panel"><h2>Alerta indisponível</h2><p>O anúncio pode ter sido arquivado ou estar em revisão.</p></div>:
   <article className="lf-panel">
    <div className="lf-detail-heading">
     <div><span className={'lf-tag '+(detail.alert_type==='lost'?'lost':'found')}>{detail.alert_type==='lost'?'PET PERDIDO':'PET ENCONTRADO'}</span><h2>{detail.pet_name||'Animal encontrado'}</h2><p><MapPin size={15}/> {detail.district}, {detail.city}/{stateForCity(detail.city)}</p></div>
     <span className="lf-status">{statusLabel(detail)}</span>
    </div>
    <div className="lf-gallery">{detail.photo_paths.map((path,i)=><img key={path} src={lostFoundPhoto(path)} alt={'Foto '+(i+1)+' de '+(detail.pet_name||'animal encontrado')}/>)}</div>
    <div className="lf-detail-info">
     <div><strong>Espécie</strong><span>{detail.species}</span></div>
     <div><strong>Cor</strong><span>{detail.color}</span></div>
     <div><strong>Porte</strong><span>{detail.size}</span></div>
     <div><strong>{detail.alert_type==='lost'?'Desapareceu em':'Encontrado em'}</strong><span>{displayDate(detail.event_date)}</span></div>
    </div>
    <h3>Características</h3><p>{detail.characteristics}</p>
    {detail.behavior&&<><h3>Comportamento</h3><p>{detail.behavior}</p></>}
    {detail.approximate_area&&<><h3>Última referência aproximada</h3><p>{detail.approximate_area}</p></>}
    {detail.alert_type==='found'&&<p className="lf-note"><Info size={17}/>{custodyLabel(detail.custody_status)}</p>}
    {detail.description&&<><h3>Outros detalhes</h3><p>{detail.description}</p></>}
    <div className="lf-safety"><ShieldCheck size={18}/> Informações pessoais, telefone e endereço exato não são exibidos. Verifique o vínculo com o animal antes de qualquer entrega.</div>
    <div className="lf-actions">
     <button type="button" className="secondary" onClick={()=>share(detail)}><Share2 size={17}/> Compartilhar link</button>
     {detail.status==='active'&&detail.moderation_status==='approved'&&detail.owner_id!==user?.id&&
      <button type="button" className="primary" onClick={()=>user?(setContact(true),setTipError('')):onLogin()}><MessageCircle size={17}/>{detail.alert_type==='lost'?'Tenho informações':'Pode ser meu pet'}</button>}
     {user?.id===detail.owner_id&&<><button className="secondary" onClick={()=>{setEditor({type:detail.alert_type,editing:detail});setChosenId(null)}}>Editar anúncio</button>{detail.status==='active'&&<button disabled={working} className="primary" onClick={()=>updateStatus('resolved')}><CheckCircle2 size={17}/> Marcar reencontrado</button>}{detail.status!=='archived'&&<button disabled={working} className="secondary" onClick={()=>updateStatus('archived')}><Trash2 size={17}/> Arquivar</button>}</>}
    </div>
    {detail.moderation_status==='pending'&&user?.id===detail.owner_id&&<p className="lf-note">Este alerta está aguardando revisão e ainda não é exibido ao público.</p>}
    {user?.id===detail.owner_id&&tips.length>0&&<div className="lf-tips"><h3>Informações recebidas ({tips.length})</h3>{tips.map(t=><article key={t.id}><p>{t.message}</p><small>{t.approximate_area?('Região informada: '+t.approximate_area+' · '):''}{t.sighting_date?'Avistamento: '+displayDate(t.sighting_date)+' · ':''}Enviado em {new Date(t.created_at).toLocaleDateString('pt-BR')}</small></article>)}</div>}
    {notice&&<p role="status" className="lf-notice">{notice}</p>}
    {contact&&<div className="lf-modal-backdrop" onClick={()=>setContact(false)}><div className="lf-modal" role="dialog" aria-modal="true" aria-label="Enviar informações" onClick={e=>e.stopPropagation()}><h2>{detail.alert_type==='lost'?'Tenho informações':'Pode ser meu pet'}</h2><p>Sua mensagem ficará disponível apenas para você e o responsável pelo anúncio. Não envie documentos ou endereço residencial.</p><form onSubmit={sendTip}><label>O que você sabe? *<textarea required minLength={10} maxLength={1500} rows={5} value={tipMessage} onChange={e=>setTipMessage(e.target.value)}/></label><label>Região aproximada (opcional)<input maxLength={160} value={tipArea} onChange={e=>setTipArea(e.target.value)}/></label><label>Data do avistamento (opcional)<input type="date" max={new Date().toISOString().slice(0,10)} value={tipDate} onChange={e=>setTipDate(e.target.value)}/></label>{tipError&&<p className="lf-error" role="alert">{tipError}</p>}<div className="lf-actions"><button type="button" className="secondary" onClick={()=>setContact(false)}>Cancelar</button><button disabled={tipBusy} type="submit" className="primary">{tipBusy?'Enviando...':'Enviar informação'}</button></div></form></div></div>}
   </article>}
  </div>:
  <>
   <div className="lf-choices">
    <button className="lf-choice lost" type="button" onClick={()=>create('lost')}><Search size={27}/><strong>Perdi meu pet</strong><span>Publique fotos e peça ajuda para encontrá-lo.</span><b><Plus size={16}/> Criar alerta</b></button>
    <button className="lf-choice found" type="button" onClick={()=>create('found')}><HeartHandshake size={27}/><strong>Encontrei um pet</strong><span>Ajude o animal encontrado a voltar para sua família.</span><b><Plus size={16}/> Divulgar</b></button>
   </div>
   {notice&&<p role="status" className="lf-notice">{notice}</p>}
   <div className="lf-filter-tabs">{([['all','Todos'],['lost','Perdidos'],['found','Encontrados'],['resolved','Reencontrados'],['mine','Meus alertas']] as const).map(([key,label])=><button key={key} type="button" className={filter===key?'active':''} onClick={()=>setFilter(key)}>{label}</button>)}</div>
   {filter!=='mine'&&<div className="lf-filters">
    <label><Search size={15}/> <input aria-label="Buscar por característica" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nome, cor, característica..."/></label>
    <select aria-label="Cidade" value={city} onChange={e=>{setCity(e.target.value);setDistrict('')}}><option value="Todas">Todas as cidades</option>{SUPPORTED_CITIES.map(c=><option key={c.city} value={c.city}>{c.label}</option>)}</select>
    {city==='Brasília'?<select aria-label="Região Administrativa" value={district} onChange={e=>setDistrict(e.target.value)}><option value="">Todas as RAs</option>{RAS.map(x=><option key={x} value={x}>{x}</option>)}</select>:city==='Fernandópolis'?<><input aria-label="Bairro" list="lf-search-areas" value={district} onChange={e=>setDistrict(e.target.value)} placeholder="Todos os bairros"/><datalist id="lf-search-areas">{FERNANDOPOLIS_AREAS.map(x=><option key={x} value={x}/>)}</datalist></>:null}
    <select aria-label="Espécie" value={species} onChange={e=>setSpecies(e.target.value)}><option value="Todas">Todas as espécies</option>{ANIMAL_CATEGORIES.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select>
   </div>}
   {!user&&filter==='mine'&&<div className="lf-panel lf-empty"><p>Entre para acompanhar seus anúncios.</p><button className="primary" onClick={onLogin}>Entrar na minha conta</button></div>}
   {loading&&<div className="lf-panel lf-empty"><p>Carregando alertas...</p></div>}
   {error&&<div className="lf-panel lf-empty"><p role="alert">{error}</p><button onClick={()=>setRefresh(x=>x+1)} className="secondary">Tentar novamente</button></div>}
   {!loading&&!error&&(!((filter==='mine')&&!user))&&(
    visible.length===0?<div className="lf-panel lf-empty"><Camera size={32}/><h2>Nenhum alerta por aqui</h2><p>Os novos anúncios aparecerão nesta central. Você pode ajudar compartilhando o Cãonect.</p></div>:
    <div className="lf-grid">{visible.map(a=><article key={a.id} className="lf-card">
     <button className="lf-card-image" onClick={()=>showDetail(a)} aria-label={'Ver anúncio de '+(a.pet_name||'animal encontrado')}><img loading="lazy" src={lostFoundPhoto(a.photo_paths[0])} alt={a.pet_name||'Animal encontrado'}/><span className={'lf-tag '+(a.alert_type==='lost'?'lost':'found')}>{a.alert_type==='lost'?'PERDIDO':'ENCONTRADO'}</span></button>
     <div className="lf-card-body"><h3>{a.pet_name||'Animal encontrado'}</h3><p><MapPin size={14}/>{a.district}, {a.city}/{stateForCity(a.city)}</p><small><CalendarDays size={13}/> {displayDate(a.event_date)} · {a.species}</small>
      <p className="lf-excerpt">{a.characteristics}</p>
      {filter==='mine'&&<span className="lf-status">{statusLabel(a)}</span>}
      <div className="lf-card-actions"><button onClick={()=>showDetail(a)}>Ver detalhes</button><button aria-label="Compartilhar anúncio" onClick={()=>share(a)}><Share2 size={17}/></button></div>
     </div>
    </article>)}</div>
   )}
   <div className="lf-footer-note"><ShieldCheck size={19}/><p>Não compartilhe endereço exato, telefone ou documentos. Confirme o vínculo com o animal antes de entregá-lo. Fotos e localizações aproximadas dos alertas publicados são públicas.</p></div>
  </>}
 </section>
}
