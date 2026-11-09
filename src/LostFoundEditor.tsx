import {useEffect,useState,type ChangeEvent,type FormEvent} from 'react'
import type {User} from '@supabase/supabase-js'
import {ArrowLeft,Camera,ImagePlus,ShieldCheck,Trash2,CheckCircle2} from 'lucide-react'
import {supabase} from './supabase'
import {SUPPORTED_CITIES,FERNANDOPOLIS_AREAS,stateForCity} from './supportedLocations'
import {RAS} from './dfRegions'
import {blankLostFound,alertForm,lostFoundPhoto,speciesForCategory,categoryOptions,uploadAlertPhotos,cleanupAlertPhotos,type LostFoundAlert,type LostFoundForm,type AlertType} from './lostFound'

type Props={user:User|null;type:AlertType;editing?:LostFoundAlert|null;onDone:()=>void;onCancel:()=>void}
export default function LostFoundEditor({user,type,editing,onDone,onCancel}:Props){
 const [form,setForm]=useState<LostFoundForm>(()=>editing?alertForm(editing):blankLostFound(type))
 const [stored,setStored]=useState<string[]>(()=>editing?.photo_paths||[])
 const [files,setFiles]=useState<File[]>([])
 const [previews,setPreviews]=useState<string[]>([])
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 useEffect(()=>{const urls=files.map(f=>URL.createObjectURL(f));setPreviews(urls);return()=>urls.forEach(URL.revokeObjectURL)},[files])
 const update=(key:keyof LostFoundForm,value:string)=>setForm(old=>({...old,[key]:value}))
 const changeFiles=(event:ChangeEvent<HTMLInputElement>)=>{
  const added=Array.from(event.target.files||[])
  event.target.value=''
  if(stored.length+files.length+added.length>3){setError('São permitidas no máximo 3 fotos por anúncio.');return}
  const invalid=added.find(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>5*1024*1024)
  if(invalid){setError('Use imagens JPG, PNG ou WebP de até 5 MB cada.');return}
  setFiles(old=>[...old,...added]);setError('')
 }
 const submit=async(e:FormEvent)=>{
  e.preventDefault()
  if(!user||!supabase)return
  if(stored.length+files.length<1){setError('Adicione pelo menos uma foto.');return}
  if(form.alert_type==='lost'&&form.pet_name.trim().length<2){setError('Informe o nome do animal.');return}
  if(form.characteristics.trim().length<8){setError('Descreva características que ajudem a identificar o animal.');return}
  if(form.district.trim().length<2){setError('Informe uma região ou bairro.');return}
  setBusy(true);setError('')
  let newPaths:string[]=[]
  try{
   newPaths=await uploadAlertPhotos(user,files)
   const payload={
    pet_name:form.pet_name.trim()||null,category:form.category,
    species:form.species,breed:form.breed.trim(),
    color:form.color.trim(),size:form.size,
    characteristics:form.characteristics.trim(),behavior:form.behavior.trim(),
    city:form.city,state:stateForCity(form.city),district:form.district.trim(),
    approximate_area:form.approximate_area.trim(),
    event_date:form.event_date,custody_status:form.alert_type==='found'?form.custody_status:null,
    description:form.description.trim(),photo_paths:[...stored,...newPaths]
   }
   const client=supabase
   const result=editing
    ?await client.from('lost_found_alerts').update(payload).eq('id',editing.id).eq('owner_id',user.id)
    :await client.from('lost_found_alerts').insert({...payload,owner_id:user.id,alert_type:form.alert_type})
   if(result.error)throw result.error
   if(editing){
    const obsolete=editing.photo_paths.filter(path=>!stored.includes(path))
    if(obsolete.length)await cleanupAlertPhotos(obsolete)
   }
   setFiles([])
   onDone()
  }catch(e){
   if(newPaths.length)await cleanupAlertPhotos(newPaths)
   setError(e instanceof Error?e.message:'Falha ao salvar o anúncio. Confira se o SQL 007.1 foi executado.')
  }finally{setBusy(false)}
 }
 if(!user)return <div className="lf-panel"><p>É necessário entrar na conta para publicar um alerta.</p><button onClick={onCancel} className="secondary">Voltar</button></div>
 return <section className="lf-editor lf-panel">
  <button className="lf-back" type="button" onClick={onCancel}><ArrowLeft size={17}/> Voltar aos anúncios</button>
  <span className="kicker">{editing?'EDITAR ALERTA':form.alert_type==='lost'?'BUSCA POR UM AMIGO':'AJUDE A ENCONTRAR UMA FAMÍLIA'}</span>
  <h2>{editing?'Atualizar anúncio':form.alert_type==='lost'?'Meu pet desapareceu':'Encontrei um animal'}</h2>
  <p>Informe apenas a região aproximada. Evite publicar endereço, telefone ou dados pessoais.</p>
  <form onSubmit={submit} className="lf-form">
   {form.alert_type==='lost'&&<label>Nome do pet *<input required maxLength={80} value={form.pet_name} onChange={e=>update('pet_name',e.target.value)} placeholder="Como ele se chama?"/></label>}
   <div className="lf-fields-two">
    <label>Categoria *<select value={form.category} onChange={e=>{const category=e.target.value;setForm(a=>({...a,category,species:speciesForCategory(category)[0]}))}}>{categoryOptions.map(c=><option value={c.id} key={c.id}>{c.emoji} {c.label}</option>)}</select></label>
    <label>Espécie *<select value={form.species} onChange={e=>update('species',e.target.value)}>{speciesForCategory(form.category).map(s=><option key={s} value={s}>{s}</option>)}</select></label>
    <label>Cor predominante *<input required maxLength={80} value={form.color} onChange={e=>update('color',e.target.value)} placeholder="Ex.: caramelo, preto e branco"/></label>
    <label>Porte *<select value={form.size} onChange={e=>update('size',e.target.value)}>{['Pequeno','Médio','Grande','Não sei'].map(o=><option key={o}>{o}</option>)}</select></label>
    <label>Raça/variedade (opcional)<input maxLength={100} value={form.breed} onChange={e=>update('breed',e.target.value)} placeholder="Se souber"/></label>
    <label>{form.alert_type==='lost'?'Data do desaparecimento *':'Data em que encontrou *'}<input required type="date" max={new Date().toISOString().slice(0,10)} value={form.event_date} onChange={e=>update('event_date',e.target.value)}/></label>
   </div>
   <label>Características marcantes *<textarea required minLength={8} maxLength={700} rows={3} value={form.characteristics} onChange={e=>update('characteristics',e.target.value)} placeholder="Ex.: mancha branca no peito, ponta da orelha caída..."/></label>
   <label>Comportamento (opcional)<textarea maxLength={400} rows={2} value={form.behavior} onChange={e=>update('behavior',e.target.value)} placeholder="Ex.: assustado, dócil, evita desconhecidos"/></label>
   <div className="lf-fields-two">
    <label>Cidade *<select value={form.city} onChange={e=>setForm(a=>({...a,city:e.target.value,district:'',approximate_area:''}))}>{SUPPORTED_CITIES.map(c=><option key={c.city} value={c.city}>{c.label}</option>)}</select></label>
    <label>{form.city==='Brasília'?'Região Administrativa *':'Bairro/região *'}{form.city==='Brasília'
      ?<select required value={form.district} onChange={e=>update('district',e.target.value)}><option value="">Selecione a RA</option>{RAS.map(ra=><option value={ra} key={ra}>{ra}</option>)}</select>
      :<><input required maxLength={80} list="lf-fern-areas" value={form.district} onChange={e=>update('district',e.target.value)} placeholder="Selecione ou digite o bairro"/><datalist id="lf-fern-areas">{FERNANDOPOLIS_AREAS.map(a=><option key={a} value={a}/>)}</datalist></>}
    </label>
   </div>
   <label>{form.alert_type==='lost'?'Referência aproximada de onde desapareceu':'Referência aproximada de onde foi encontrado'} (opcional)
    <input maxLength={160} value={form.approximate_area} onChange={e=>update('approximate_area',e.target.value)} placeholder="Ex.: próximo à praça do bairro, sem endereço de residência"/>
   </label>
   {form.alert_type==='found'&&<label>Onde está o animal agora? *<select required value={form.custody_status} onChange={e=>update('custody_status',e.target.value)}><option value="with_me">Temporariamente sob meus cuidados</option><option value="with_organization">Com ONG/protetor</option><option value="sighting_only">Apenas avistei</option><option value="with_service">Encaminhado a um serviço responsável</option></select></label>}
   <label>Informações adicionais (opcional)<textarea maxLength={1500} rows={3} value={form.description} onChange={e=>update('description',e.target.value)} placeholder="Outros detalhes úteis para o reencontro"/></label>
   <div className="lf-upload">
    <strong><ImagePlus size={18}/> Fotos do animal *</strong>
    <p>De 1 a 3 fotos JPG, PNG ou WebP (até 5 MB por foto original). A imagem é convertida para JPEG antes do envio.</p>
    <div className="lf-thumbnails">
     {stored.map((path,i)=><div className="lf-thumb" key={path}><img src={lostFoundPhoto(path)} alt={'Foto existente '+(i+1)}/><button type="button" aria-label="Remover foto" onClick={()=>setStored(a=>a.filter(x=>x!==path))}><Trash2 size={15}/></button></div>)}
     {previews.map((path,i)=><div className="lf-thumb" key={path}><img src={path} alt={'Nova foto '+(i+1)}/><button type="button" aria-label="Remover nova foto" onClick={()=>setFiles(a=>a.filter((_,j)=>j!==i))}><Trash2 size={15}/></button></div>)}
     {stored.length+files.length<3&&<label className="lf-upload-add"><Camera size={23}/><span>Adicionar foto</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={changeFiles}/></label>}
    </div>
    <small>{stored.length+files.length}/3 fotos selecionadas</small>
   </div>
   <div className="lf-privacy"><ShieldCheck size={20}/><span>Ao publicar, você autoriza a divulgação das fotos e das informações aproximadas do animal para ajudar no reencontro. Não inclua fotos de documentos, pessoas ou fachadas que identifiquem sua casa.</span></div>
   {error&&<p className="lf-error" role="alert">{error}</p>}
   <div className="lf-editor-actions"><button type="button" className="secondary" onClick={onCancel} disabled={busy}>Cancelar</button><button type="submit" disabled={busy} className="primary"><CheckCircle2 size={18}/>{busy?'Salvando...':editing?'Salvar alterações':'Publicar alerta'}</button></div>
  </form>
 </section>
}
