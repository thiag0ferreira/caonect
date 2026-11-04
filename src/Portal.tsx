import { useEffect, useState, type FormEvent } from 'react'
import { supabase, isBackendReady, type PetListing } from './supabase'
import type { User } from '@supabase/supabase-js'
import { Heart, ShieldCheck, LogIn, LogOut, Plus, PawPrint, Building2, UserRound, ImagePlus, Trash2, Pencil, MapPin, Save, X, MailCheck, Mail, ArrowRight, CheckCircle2 } from 'lucide-react'
import './portal.css'
import {CITY,RAS,normalizeRA} from './dfRegions'
import {ANIMAL_CATEGORIES,categoryForSpecies,speciesForCategory,requiresReview} from './animalCategories'
import {SUPPORTED_CITIES,stateForCity,districtLabel,neighborhoodLabel,normalizeDistrict,DEFAULT_CITY} from './supportedLocations'

type Role='adopter'|'protector'|'ngo'
type Profile={id:string;display_name:string;role:Role;city:string;district:string;neighborhood?:string;phone:string|null}
const blank={name:'',animal_category:'Cachorros',species:'Cachorro',scientific_name:'',legal_origin_notes:'',size:'Médio',age_label:'',city:DEFAULT_CITY,district:'',neighborhood:'',color:'',breed:'Sem raça definida (SRD)',description:''}
const traits=['Dócil','Tranquilo','Ativo','Afetuoso','Curioso','Explorador','Tímido','Brincalhão','Sociável','Independente','Bagunceiro','Bravo','Territorial','Agitado','Medroso','Assustado','Desconfiado','Ciumento','Teimoso','Protetor','Carente','Fujão','Reativo com outros animais','Não gosta de crianças','Precisa de espaço']
const colors=['Preto','Cinza','Branco','Chocolate','Creme','Fulvo','Mogno','Dourado','Caramelo','Rajado']
type Props={onPublished?:()=>void}

export default function Portal({onPublished}:Props){
 const [user,setUser]=useState<User|null>(null)
 const [profile,setProfile]=useState<Profile|null>(null)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [mode,setMode]=useState<'login'|'signup'>('signup')
 const [pendingEmail,setPendingEmail]=useState<string|null>(null)
 const [resendBusy,setResendBusy]=useState(false)
 const [resendFeedback,setResendFeedback]=useState('')
 const [authNotice,setAuthNotice]=useState('')
 const [email,setEmail]=useState('')
 const [password,setPassword]=useState('')
 const [fullName,setFullName]=useState('')
 const [role,setRole]=useState<Role>('adopter')
 const [city,setCity]=useState<string>(DEFAULT_CITY)
 const [district,setDistrict]=useState('')
 const [signupNeighborhood,setSignupNeighborhood]=useState('')
 const [pets,setPets]=useState<PetListing[]>([])
 const [form,setForm]=useState(blank)
 const [traitList,setTraitList]=useState<string[]>([])
 const [photos,setPhotos]=useState<File[]>([])
 const [photoPreviews,setPhotoPreviews]=useState<string[]>([])
 const [existingPhotos,setExistingPhotos]=useState<string[]>([])
 useEffect(()=>{const urls=photos.map(file=>URL.createObjectURL(file));setPhotoPreviews(urls);return()=>urls.forEach(url=>URL.revokeObjectURL(url))},[photos])
 const [showForm,setShowForm]=useState(false)
 const [editingPet,setEditingPet]=useState<string|null>(null)
 const [petCoords,setPetCoords]=useState<{lat:number;lng:number}|null>(null)
 const [editingProfile,setEditingProfile]=useState(false)
 const [profileFields,setProfileFields]=useState({display_name:'',city:CITY,district:'',neighborhood:'',phone:''})
 useEffect(()=>{
  const fragment=new URLSearchParams(window.location.hash.slice(1))
  const query=new URLSearchParams(window.location.search)
  const err=fragment.get('error_description')||query.get('error_description')
  if(err){
   setAuthNotice('Não foi possível concluir a confirmação: '+err.replace(/\+/g,' '))
  }else if(fragment.has('access_token')||query.has('code')){
   setAuthNotice('Confirmação recebida. Você pode acessar sua conta normalmente.')
  }
 },[])
 useEffect(()=>{
  if(!supabase)return
  const client=supabase
  let active=true
  client.auth.getUser().then(({data})=>{if(active)setUser(data.user)})
  const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>setUser(session?.user??null))
  return()=>{active=false;subscription.unsubscribe()}
 },[])
 useEffect(()=>{
  if(!supabase||!user){setProfile(null);setPets([]);return}
  const client=supabase;let active=true
  Promise.all([
    client.from('profiles').select('id,display_name,role,city,district,neighborhood,phone').eq('id',user.id).maybeSingle(),
    client.from('pets').select('*').eq('owner_id',user.id).order('created_at',{ascending:false})
  ]).then(([p,l])=>{if(active){if(p.error)setMessage('Erro ao carregar perfil: '+p.error.message);setProfile(p.data as Profile|null);if(p.data)setProfileFields({display_name:p.data.display_name||'',city:p.data.city||'',district:normalizeDistrict(p.data.city||DEFAULT_CITY,p.data.district||''),neighborhood:p.data.neighborhood||(!normalizeDistrict(p.data.city||DEFAULT_CITY,p.data.district||'')?p.data.district||'':''),phone:p.data.phone||''});setPets((l.data??[]) as PetListing[])}})
  return()=>{active=false}
 },[user])
 const clearSignup=()=>{
  setEmail('');setPassword('');setFullName('');setRole('adopter');setCity(DEFAULT_CITY);setDistrict('');setSignupNeighborhood('')
 }
 const goToLogin=()=>{setPendingEmail(null);setResendFeedback('');setMessage('');setMode('login');setPassword('')}
 const auth=async(e:FormEvent)=>{
  e.preventDefault();if(!supabase)return
  setBusy(true);setMessage('')
  try{
   const client=supabase
   if(mode==='signup'){
    const registeredEmail=email.trim().toLowerCase()
    const {data,error}=await client.auth.signUp({email:registeredEmail,password,options:{emailRedirectTo:new URL(import.meta.env.BASE_URL,window.location.origin).toString(),data:{display_name:fullName.trim(),role,city,state:stateForCity(city),district:district.trim(),neighborhood:signupNeighborhood.trim()}}})
    if(error)setMessage('Não foi possível concluir o cadastro: '+error.message)
    else if(data.session){clearSignup();setPendingEmail(null);setUser(data.user);setMessage('Conta criada! Bem-vindo(a) ao Cãonect.')}
    else{
     clearSignup()
     setPendingEmail(registeredEmail)
     setResendFeedback('')
    }
   }else{
    const {error}=await client.auth.signInWithPassword({email:email.trim(),password})
    if(error)setMessage('Não foi possível entrar: '+error.message)
    else setPassword('')
   }
  }catch{setMessage('Ocorreu um problema de conexão. Tente novamente.')}
  finally{setBusy(false)}
 }
 const resendConfirmation=async()=>{
  if(!supabase||!pendingEmail)return
  setResendBusy(true);setResendFeedback('')
  const {error}=await supabase.auth.resend({type:'signup',email:pendingEmail,options:{emailRedirectTo:new URL(import.meta.env.BASE_URL,window.location.origin).toString()}})
  setResendFeedback(error?'Não foi possível reenviar agora. Aguarde e tente novamente.':'Se o endereço estiver apto a receber confirmação, um novo e-mail será enviado. Verifique a caixa de entrada e o spam.')
  setResendBusy(false)
 }
 const saveProfile=async(e:FormEvent)=>{
  e.preventDefault();if(!supabase||!user||!profile)return
  if(!profileFields.display_name.trim()||!profileFields.district.trim()){setMessage('Preencha nome, cidade e região.');return}
  setBusy(true);setMessage('')
  const data={display_name:profileFields.display_name.trim(),city:profileFields.city,state:stateForCity(profileFields.city),district:profileFields.district,neighborhood:profileFields.neighborhood.trim(),phone:profileFields.phone.trim()||null}
  const {error}=await supabase.from('profiles').update(data).eq('id',user.id)
  if(error)setMessage('Não foi possível salvar o perfil: '+error.message)
  else{setProfile({...profile,...data});setEditingProfile(false);setMessage('Informações pessoais atualizadas.')}
  setBusy(false)
 }
 const startNewPet=()=>{setEditingPet(null);setForm({...blank,city:profile?.city||DEFAULT_CITY,district:profile?.district||'',neighborhood:profile?.neighborhood||''});setTraitList([]);setPhotos([]);setExistingPhotos([]);setPetCoords(null);setShowForm(true);setMessage('')}
 const editPet=(p:PetListing)=>{setEditingPet(p.id);setForm({name:p.name,animal_category:p.animal_category||categoryForSpecies(p.species),species:p.species,scientific_name:p.scientific_name||'',legal_origin_notes:p.legal_origin_notes||'',size:p.size,age_label:p.age_label,city:p.city||DEFAULT_CITY,district:normalizeDistrict(p.city||DEFAULT_CITY,p.district)||'',neighborhood:p.neighborhood||(!normalizeDistrict(p.city||DEFAULT_CITY,p.district)?p.district:''),color:p.color,breed:p.breed||'Sem raça definida (SRD)',description:p.description});setExistingPhotos(p.photo_urls?.length?p.photo_urls:(p.image_url?[p.image_url]:[]));setTraitList(p.personality||[]);setPetCoords(p.approximate_lat!=null&&p.approximate_lng!=null?{lat:p.approximate_lat,lng:p.approximate_lng}:null);setPhotos([]);setShowForm(true);setMessage('');setTimeout(()=>document.getElementById('pet-form')?.scrollIntoView({behavior:'smooth',block:'start'}),50)}
 const getPetApproxLocation=()=>{
  if(!navigator.geolocation){setMessage('Seu navegador não oferece geolocalização.');return}
  setBusy(true);setMessage('')
  navigator.geolocation.getCurrentPosition(
   pos=>{setPetCoords({lat:Number(pos.coords.latitude.toFixed(2)),lng:Number(pos.coords.longitude.toFixed(2))});setBusy(false);setMessage('Localização aproximada definida. Confira se corresponde à região do pet.')},
   ()=>{setBusy(false);setMessage('Não foi possível obter a localização. Você pode continuar sem usar GPS.')},
   {enableHighAccuracy:false,timeout:10000,maximumAge:60000})
 }
 const publish=async(e:FormEvent)=>{
  e.preventDefault()
  if(!supabase||!user||!profile||profile.role==='adopter')return
  if(!form.name.trim()||!form.description.trim()||!form.district.trim()||!form.age_label.trim()){setMessage('Preencha os campos obrigatórios.');return}
  if(existingPhotos.length+photos.length>5){setMessage('O limite é de cinco fotos por pet.');return}
  if(photos.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)){setMessage('Cada foto deve ser JPG, PNG ou WebP, até 5 MB.');return}
  setBusy(true);setMessage('')
  const client=supabase
  const uploadedPaths:string[]=[]
  const newUrls:string[]=[]
  for(const file of photos){
    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'
    const path=`${user.id}/${crypto.randomUUID()}.${ext}`
    const result=await client.storage.from('pet-images').upload(path,file,{upsert:false,contentType:file.type})
    if(result.error){
      if(uploadedPaths.length)await client.storage.from('pet-images').remove(uploadedPaths)
      setMessage('Falha ao enviar imagens: '+result.error.message);setBusy(false);return
    }
    uploadedPaths.push(path)
    newUrls.push(client.storage.from('pet-images').getPublicUrl(path).data.publicUrl)
  }
  const photo_urls=[...existingPhotos,...newUrls].slice(0,5)
  const image_url=photo_urls[0]||null
  const payload={name:form.name.trim(),species:form.species,animal_category:form.animal_category,scientific_name:form.scientific_name.trim()||null,legal_origin_notes:form.legal_origin_notes.trim(),size:form.size,
    age_label:form.age_label.trim(),city:form.city,state:stateForCity(form.city),district:form.district,neighborhood:form.neighborhood.trim(),
    color:form.color,breed:form.breed.trim()||(form.animal_category==='Cachorros'||form.animal_category==='Gatos'?'Sem raça definida (SRD)':''),
    approximate_lat:petCoords?.lat??null,approximate_lng:petCoords?.lng??null,
    description:form.description.trim(),personality:traitList,photo_urls,image_url}
  const {data,error}=editingPet
    ?await client.from('pets').update(payload).eq('id',editingPet).eq('owner_id',user.id).select('*').single()
    :await client.from('pets').insert({...payload,owner_id:user.id,status:'available'}).select('*').single()
  if(error){
   if(uploadedPaths.length)await client.storage.from('pet-images').remove(uploadedPaths)
   setMessage('Não foi possível cadastrar: '+error.message)
  }else{
   setPets(a=>editingPet?a.map(p=>p.id===editingPet?data as PetListing:p):[data as PetListing,...a]);setForm(blank);setTraitList([]);setPhotos([]);setExistingPhotos([]);setPetCoords(null);setEditingPet(null)
   setShowForm(false);setMessage(editingPet?'Dados do animal atualizados.':requiresReview(form.animal_category)?'Cadastro recebido! Este anúncio precisa de avaliação antes de aparecer publicamente.':'Animal cadastrado e publicado com sucesso!');onPublished?.()
  }
  setBusy(false)
 }
 const setStatus=async(pet:PetListing,status:PetListing['status'])=>{
  if(!supabase)return
  setBusy(true);setMessage('')
  const {error}=await supabase.from('pets').update({status}).eq('id',pet.id).eq('owner_id',pet.owner_id)
  if(error)setMessage(error.message)
  else {setPets(a=>a.map(p=>p.id===pet.id?{...p,status}:p));onPublished?.()}
  setBusy(false)
 }
 const signOut=async()=>{if(!supabase)return;await supabase.auth.signOut();setUser(null);setProfile(null);setMessage('Sessão encerrada.')}
 return <section className="section page portal">
  <span className="kicker">MINHA ÁREA</span>
  <h1>Meu espaço no Cãonect</h1>
  <p>Seja a conexão que transforma uma vida.</p>
  {!isBackendReady&&<div className="portal-alert"><ShieldCheck size={21}/><div><strong>Modo de demonstração — Supabase ainda não conectado.</strong><p>O projeto foi publicado sem chaves ou banco. Cadastros reais ficam desativados até configurarmos as variáveis do Supabase no GitHub.</p></div></div>}
  {authNotice&&<div role="status" className="portal-notice">{authNotice}</div>}
  {message&&<div role="status" className="portal-notice">{message}</div>}
  {!user&&pendingEmail&&<div className="signup-success" role="status">
    <div className="signup-success-icon"><MailCheck size={36}/></div>
    <span className="kicker">SÓ FALTA UM PASSO</span>
    <h2>Confira seu e-mail! 💚</h2>
    <p>Recebemos sua solicitação de cadastro no Cãonect. Se o endereço estiver elegível, você receberá um link para confirmar sua conta.</p>
    <div className="signup-email"><Mail size={18}/><strong>{pendingEmail.replace(/^(.{2}).*(@.*)$/, '$1••••$2')}</strong></div>
    <div className="signup-success-steps"><div><CheckCircle2 size={20}/><span>Verifique sua caixa de entrada e a pasta de spam.</span></div><div><CheckCircle2 size={20}/><span>Clique no link de confirmação enviado pelo Cãonect.</span></div><div><CheckCircle2 size={20}/><span>Volte aqui para entrar e conhecer os animais.</span></div></div>
    <button type="button" className="primary" onClick={goToLogin}>Já confirmei. Quero entrar <ArrowRight size={18}/></button>
    <button type="button" className="signup-resend" disabled={resendBusy} onClick={resendConfirmation}>{resendBusy?'Solicitando novo e-mail...':'Não recebi o e-mail. Reenviar confirmação'}</button>
    {resendFeedback&&<p role="status" className="portal-notice">{resendFeedback}</p>}
    <p className="signup-success-help">Usou um e-mail diferente? <button type="button" onClick={()=>{setPendingEmail(null);setResendFeedback('');setMode('signup')}}>Refazer cadastro</button></p>
   </div>}
  {!user&&!pendingEmail&&<div className="portal-auth">
   <div className="portal-welcome"><PawPrint size={48}/><h2>Todo pet merece encontrar seu lar.</h2><p>Crie uma conta para adotar, proteger ou divulgar animais. A adoção é gratuita.</p><div className="portal-features"><span>♡ Adoção responsável</span><span>✓ Perfis de protetores e ONGs</span><span>⌂ Começando pelo DF e Fernandópolis (SP)</span></div></div>
   <div className="portal-panel">
    <div className="portal-tabs"><button type="button" className={mode==='signup'?'selected':''} onClick={()=>{setMode('signup');setMessage('')}}>Criar conta</button><button type="button" className={mode==='login'?'selected':''} onClick={()=>{setMode('login');setMessage('')}}>Entrar</button></div>
    <form onSubmit={auth} className="portal-form">
    {mode==='signup'&&<>
     <label>Como você deseja participar?</label>
     <div className="role-grid">{([{id:'adopter',name:'Adotante',icon:<Heart/>},{id:'protector',name:'Protetor',icon:<UserRound/>},{id:'ngo',name:'ONG',icon:<Building2/>}] as const).map(r=><button type="button" key={r.id} className={role===r.id?'selected':''} onClick={()=>setRole(r.id)}>{r.icon}<span>{r.name}</span></button>)}</div>
     <label>{role==='ngo'?'Nome da ONG':'Nome completo'}<input required minLength={2} maxLength={100} value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Como podemos chamar você?"/></label>
     <div className="portal-two"><label>Cidade *<select required value={city} onChange={e=>{setCity(e.target.value);setDistrict('');setSignupNeighborhood('')}}>{SUPPORTED_CITIES.map(c=><option key={c.city} value={c.city}>{c.label}</option>)}</select></label><label>{districtLabel(city)}{city==='Brasília'?<select required value={district} onChange={e=>setDistrict(e.target.value)}><option value="">Selecione sua RA</option>{RAS.map(ra=><option key={ra} value={ra}>{ra}</option>)}</select>:<input required maxLength={80} value={district} onChange={e=>setDistrict(e.target.value)} placeholder="Ex.: Centro ou Jardim Santa Rita"/>}</label></div><label>{neighborhoodLabel(city)}<input maxLength={80} value={signupNeighborhood} onChange={e=>setSignupNeighborhood(e.target.value)} placeholder="Ex.: Ceilândia Sul, P Sul"/></label>
    </>}
    <label>E-mail<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@exemplo.com"/></label>
    <label>Senha<input type="password" required minLength={8} autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres"/></label>
    <button className="primary wide" disabled={!isBackendReady||busy}>{busy?'Processando...':mode==='signup'?'Criar minha conta':'Entrar na minha conta'}<LogIn size={17}/></button>
    <small>Seus dados serão utilizados para a sua conta e interações de adoção. A política de privacidade será disponibilizada antes do lançamento público.</small>
    </form>
   </div>
  </div>}
  {user&&<div className="portal-dashboard">
   <div className="dashboard-head"><div className="profile-avatar"><UserRound size={27}/></div><div><h2>Olá, {profile?.display_name||user.email}!</h2><p>{profile?.role==='ngo'?'ONG':profile?.role==='protector'?'Protetor independente':'Adotante'} {profile?.district?'· '+profile.district:''}</p></div><div className="profile-actions"><button className="secondary" onClick={()=>setEditingProfile(v=>!v)}><Pencil size={16}/> {editingProfile?'Fechar edição':'Editar perfil'}</button><button className="secondary" onClick={signOut}>Sair <LogOut size={16}/></button></div></div>
   {editingProfile&&profile&&<form className="portal-panel portal-form profile-edit" onSubmit={saveProfile}><h3>Editar minhas informações</h3><label>Nome ou nome da ONG<input required maxLength={100} value={profileFields.display_name} onChange={e=>setProfileFields({...profileFields,display_name:e.target.value})}/></label><div className="portal-two"><label>Cidade *<select required value={profileFields.city} onChange={e=>setProfileFields({...profileFields,city:e.target.value,district:'',neighborhood:''})}>{SUPPORTED_CITIES.map(c=><option key={c.city} value={c.city}>{c.label}</option>)}</select></label><label>{districtLabel(profileFields.city)}{profileFields.city==='Brasília'?<select required value={profileFields.district} onChange={e=>setProfileFields({...profileFields,district:e.target.value})}><option value="">Selecione sua RA</option>{RAS.map(ra=><option key={ra} value={ra}>{ra}</option>)}</select>:<input required maxLength={80} value={profileFields.district} onChange={e=>setProfileFields({...profileFields,district:e.target.value})} placeholder="Bairro ou região em Fernandópolis"/>}</label></div><label>{neighborhoodLabel(profileFields.city)}<input maxLength={80} placeholder="Ex.: Ceilândia Sul" value={profileFields.neighborhood} onChange={e=>setProfileFields({...profileFields,neighborhood:e.target.value})}/></label><label>Telefone (opcional, privado)<input type="tel" maxLength={25} value={profileFields.phone} onChange={e=>setProfileFields({...profileFields,phone:e.target.value})} placeholder="(61) 99999-9999"/></label><small>Seu telefone não é exibido publicamente. Alterações de e-mail e senha são gerenciadas pela autenticação.</small><button disabled={busy} className="primary"><Save size={17}/> Salvar alterações</button></form>}
   {profile?.role==='adopter'&&<div className="portal-alert"><Heart/><div><strong>Seu perfil de adotante está pronto.</strong><p>Encontre um pet em Explorar. As solicitações reais e o acompanhamento serão conectados na próxima etapa.</p></div></div>}
   {!profile&&<div className="portal-alert">Estamos preparando seu perfil. Se acabou de confirmar o e-mail, atualize esta página.</div>}
   {profile&&profile.role!=='adopter'&&<>
    <div className="dashboard-stats"><div><strong>{pets.length}</strong><span>Pets cadastrados</span></div><div><strong>{pets.filter(p=>p.status==='available').length}</strong><span>Disponíveis</span></div><div><strong>{pets.filter(p=>p.status==='adopted').length}</strong><span>Adotados</span></div></div>
    <div className="dashboard-toolbar"><h2>Meus animais</h2><button className="primary" onClick={()=>showForm?setShowForm(false):startNewPet()}>{showForm?'Fechar formulário':'Cadastrar pet'} <Plus size={17}/></button></div>
    {showForm&&<form id="pet-form" className="portal-panel portal-form pet-form" onSubmit={publish}>
     <h3>{editingPet?'Editar informações do pet':'Vamos apresentar esse novo amigo?'}</h3>
     <div className="portal-two"><label>Nome do pet *<input required maxLength={70} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Idade aproximada *<input required maxLength={50} placeholder="Ex.: 2 anos" value={form.age_label} onChange={e=>setForm({...form,age_label:e.target.value})}/></label></div>
     <div className="portal-two"><label>Categoria *<select value={form.animal_category} onChange={e=>{const c=e.target.value;setForm({...form,animal_category:c,species:speciesForCategory(c)[0],breed:c==='Cachorros'||c==='Gatos'?'Sem raça definida (SRD)':'',scientific_name:'',legal_origin_notes:''});setTraitList([])}}>{ANIMAL_CATEGORIES.map(c=><option value={c.id} key={c.id}>{c.emoji} {c.label}</option>)}</select></label><label>Espécie *<select value={form.species} onChange={e=>setForm({...form,species:e.target.value})}>{speciesForCategory(form.animal_category).map(sp=><option key={sp} value={sp}>{sp}</option>)}</select></label></div>
     <div className="portal-two"><label>{form.animal_category==='Cachorros'||form.animal_category==='Gatos'?'Porte':'Tamanho aproximado'}<select value={form.size} onChange={e=>setForm({...form,size:e.target.value})}><option>Pequeno</option><option>Médio</option><option>Grande</option></select></label><label>{form.animal_category==='Cachorros'||form.animal_category==='Gatos'?'Raça / variedade':'Variedade (opcional)'}<input maxLength={80} value={form.breed} onChange={e=>setForm({...form,breed:e.target.value})} placeholder={form.animal_category==='Cachorros'||form.animal_category==='Gatos'?'Ex.: SRD, Siamês':'Ex.: variedade ou linhagem'}/></label></div>
     {requiresReview(form.animal_category)&&<div className="portal-notice" role="note"><strong>Espécie sujeita à revisão:</strong> este cadastro ficará pendente e não será publicado até avaliação da origem e das condições de transferência. Não permitimos comercialização ou transferências irregulares.</div>}
     {requiresReview(form.animal_category)&&<><label>Nome científico (se souber)<input maxLength={120} value={form.scientific_name} onChange={e=>setForm({...form,scientific_name:e.target.value})} placeholder="Opcional"/></label><label>Origem e documentação (não inclua CPF, endereço ou número de documento)<textarea rows={3} maxLength={1500} value={form.legal_origin_notes} onChange={e=>setForm({...form,legal_origin_notes:e.target.value})} placeholder="Descreva a origem e a documentação que poderá ser verificada em canal seguro."/></label></>}
     <div className="portal-two"><label>Cidade do animal *<select required value={form.city} onChange={e=>setForm({...form,city:e.target.value,district:'',neighborhood:''})}>{SUPPORTED_CITIES.map(c=><option key={c.city} value={c.city}>{c.label}</option>)}</select></label><label>{districtLabel(form.city)}{form.city==='Brasília'?<select required value={form.district} onChange={e=>setForm({...form,district:e.target.value})}><option value="">Selecione a RA do pet</option>{RAS.map(ra=><option key={ra} value={ra}>{ra}</option>)}</select>:<input required maxLength={80} value={form.district} onChange={e=>setForm({...form,district:e.target.value})} placeholder="Ex.: Centro ou Jardim Santa Rita"/>}</label></div><label>{neighborhoodLabel(form.city)}<input maxLength={80} value={form.neighborhood} onChange={e=>setForm({...form,neighborhood:e.target.value})} placeholder="Ex.: P Sul, QNM, Ceilândia Sul"/></label>
     
     <label>Cor<select value={form.color} onChange={e=>setForm({...form,color:e.target.value})}><option value="">Selecione</option>{colors.map(c=><option key={c}>{c}</option>)}</select></label>
     <label>Características e comportamento (marque apenas as aplicáveis)</label><div className="trait-grid">{traits.map(t=><button key={t} type="button" className={traitList.includes(t)?'chosen':''} onClick={()=>setTraitList(a=>a.includes(t)?a.filter(x=>x!==t):[...a,t])}>{t}</button>)}</div>
     <div className="geo-pet"><button type="button" disabled={busy} className="secondary geo-button" onClick={getPetApproxLocation}><MapPin size={16}/> Usar localização aproximada do pet</button>{petCoords&&<><span className="geo-display">Coordenadas aproximadas: {petCoords.lat.toFixed(2)}, {petCoords.lng.toFixed(2)}</span><button type="button" className="pet-mini-action" onClick={()=>setPetCoords(null)}><X size={15}/> Remover localização</button></>}<small>Opcional. Compartilhe somente uma localização próxima da região do animal, nunca o endereço de uma casa ou abrigo sensível. Precisão reduzida para cerca de 1 km.</small></div>
     <label>Conte a história do pet *<textarea required minLength={20} maxLength={2000} rows={4} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Saúde, sociabilidade, necessidades especiais, história e cuidados..."/></label>
     <div className="photos-editor"><label className="upload-label"><ImagePlus size={21}/> Fotos do pet (até 5 imagens, 5 MB cada)<input type="file" multiple accept="image/png,image/jpeg,image/webp" disabled={existingPhotos.length+photos.length>=5} onChange={e=>{const incoming=Array.from(e.target.files||[]);if(incoming.some(file=>!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)){setMessage('Aceitamos JPG, PNG ou WebP com até 5 MB por foto.');e.target.value='';return}if(existingPhotos.length+photos.length+incoming.length>5){setMessage('Máximo de 5 fotos ao todo.');e.target.value='';return}setPhotos(a=>[...a,...incoming]);setMessage('');e.target.value=''}}/></label><small>{existingPhotos.length+photos.length}/5 fotos selecionadas. A primeira será a capa. Você pode remover fotos antes de salvar.</small><div className="photo-preview">{existingPhotos.map((url,i)=><div className="photo-tile" key={url}><img src={url} alt={'Foto atual '+(i+1)}/><button type="button" aria-label="Remover foto" onClick={()=>setExistingPhotos(a=>a.filter(x=>x!==url))}><X size={15}/></button>{i===0&&<span>Capa</span>}</div>)}{photos.map((file,i)=><div className="photo-tile" key={file.name+'-'+i}><span className="new-photo">{photoPreviews[i]?<img src={photoPreviews[i]} alt={file.name}/>:<ImagePlus size={20}/>}<small>{file.name}</small></span><button type="button" aria-label="Remover foto nova" onClick={()=>setPhotos(a=>a.filter((_,idx)=>idx!==i))}><X size={15}/></button></div>)}</div></div>
     <button disabled={busy} className="primary wide">{busy?'Salvando...':editingPet?'Salvar alterações do pet':'Publicar pet para adoção'} <PawPrint size={17}/></button>
    </form>}
    <div className="owned-list">{pets.map(p=><article key={p.id}><div className="owned-thumb">{p.image_url?<img src={p.image_url} alt={p.name}/>:<PawPrint/>}</div><div className="owned-info"><h3>{p.name}</h3><p>{p.species} · {p.breed||'SRD'} · {p.age_label} · {p.district}, {p.city}/{stateForCity(p.city)}</p><span>{p.review_status==='pending'?'Aguardando revisão':p.review_status==='rejected'?'Não aprovado':p.status==='available'?'Disponível':p.status==='reserved'?'Em processo de adoção':'Adotado'}</span><div><button className="pet-mini-action" onClick={()=>editPet(p)}><Pencil size={14}/> Editar pet</button></div></div><select disabled={busy||p.review_status==='pending'||p.review_status==='rejected'} aria-label={'Situação de '+p.name} value={p.status} onChange={e=>setStatus(p,e.target.value as PetListing['status'])}><option value="available">Disponível</option><option value="reserved">Reservado</option><option value="adopted">Adotado fora do Cãonect</option></select></article>)}{pets.length===0&&<div className="empty"><Trash2 size={28}/><p>Nenhum pet publicado ainda.</p></div>}</div>
   </>}
  </div>}
 </section>
}
