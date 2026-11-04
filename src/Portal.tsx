import { useEffect, useState, type FormEvent } from 'react'
import { supabase, isBackendReady, type PetListing } from './supabase'
import type { User } from '@supabase/supabase-js'
import { Heart, ShieldCheck, LogIn, LogOut, Plus, PawPrint, Building2, UserRound, ImagePlus, Trash2 } from 'lucide-react'
import './portal.css'

type Role='adopter'|'protector'|'ngo'
type Profile={id:string;display_name:string;role:Role;city:string;district:string;phone:string|null}
const blank={name:'',species:'Cachorro',size:'Médio',age_label:'',city:'Brasília',district:'',color:'',description:'',personality:''}
const traits=['Dócil','Tranquilo','Ativo','Afetuoso','Curioso','Explorador','Tímido','Brincalhão','Sociável','Independente']
const colors=['Preto','Cinza','Branco','Chocolate','Creme','Fulvo','Mogno','Dourado','Caramelo','Rajado']
type Props={onPublished?:()=>void}

export default function Portal({onPublished}:Props){
 const [user,setUser]=useState<User|null>(null)
 const [profile,setProfile]=useState<Profile|null>(null)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [mode,setMode]=useState<'login'|'signup'>('signup')
 const [email,setEmail]=useState('')
 const [password,setPassword]=useState('')
 const [fullName,setFullName]=useState('')
 const [role,setRole]=useState<Role>('adopter')
 const [city,setCity]=useState('Brasília')
 const [district,setDistrict]=useState('')
 const [pets,setPets]=useState<PetListing[]>([])
 const [form,setForm]=useState(blank)
 const [traitList,setTraitList]=useState<string[]>([])
 const [photo,setPhoto]=useState<File|null>(null)
 const [showForm,setShowForm]=useState(false)
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
    client.from('profiles').select('id,display_name,role,city,district,phone').eq('id',user.id).maybeSingle(),
    client.from('pets').select('*').eq('owner_id',user.id).order('created_at',{ascending:false})
  ]).then(([p,l])=>{if(active){if(p.error)setMessage('Erro ao carregar perfil: '+p.error.message);setProfile(p.data as Profile|null);setPets((l.data??[]) as PetListing[])}})
  return()=>{active=false}
 },[user])
 const auth=async(e:FormEvent)=>{
  e.preventDefault();if(!supabase)return
  setBusy(true);setMessage('')
  const client=supabase
  if(mode==='signup'){
   const {data,error}=await client.auth.signUp({email,password,options:{data:{display_name:fullName.trim(),role,city:city.trim(),district:district.trim()}}})
   if(error)setMessage(error.message)
   else if(data.session){setUser(data.user);setMessage('Conta criada! Bem-vindo(a).')}
   else setMessage('Cadastro recebido. Confira seu e-mail para confirmar a conta. Depois entre com sua senha.')
  }else{
   const {error}=await client.auth.signInWithPassword({email,password})
   if(error)setMessage('Não foi possível entrar: '+error.message)
  }
  setBusy(false)
 }
 const publish=async(e:FormEvent)=>{
  e.preventDefault()
  if(!supabase||!user||!profile||profile.role==='adopter')return
  if(!form.name.trim()||!form.description.trim()||!form.district.trim()||!form.age_label.trim()){setMessage('Preencha os campos obrigatórios.');return}
  if(photo&&(!photo.type.startsWith('image/')||photo.size>5*1024*1024)){setMessage('Use uma foto de até 5 MB.');return}
  setBusy(true);setMessage('')
  const client=supabase
  let photoPath:string|null=null
  if(photo){
   const ext=photo.name.split('.').pop()?.toLowerCase()||'jpg'
   if(!['jpg','jpeg','png','webp'].includes(ext)){setBusy(false);setMessage('Formato permitido: JPG, PNG ou WebP.');return}
   photoPath=`${user.id}/${crypto.randomUUID()}.${ext}`
   const uploaded=await client.storage.from('pet-images').upload(photoPath,photo,{upsert:false,contentType:photo.type})
   if(uploaded.error){setBusy(false);setMessage('Falha no envio da foto: '+uploaded.error.message);return}
  }
  const image_url=photoPath?client.storage.from('pet-images').getPublicUrl(photoPath).data.publicUrl:null
  const {data,error}=await client.from('pets').insert({
    owner_id:user.id,name:form.name.trim(),species:form.species,size:form.size,
    age_label:form.age_label.trim(),city:form.city.trim(),district:form.district.trim(),
    color:form.color,description:form.description.trim(),personality:traitList,image_url,status:'available'
  }).select('*').single()
  if(error){
   if(photoPath)await client.storage.from('pet-images').remove([photoPath])
   setMessage('Não foi possível cadastrar: '+error.message)
  }else{
   setPets(a=>[data as PetListing,...a]);setForm(blank);setTraitList([]);setPhoto(null)
   setShowForm(false);setMessage('Pet cadastrado e publicado com sucesso!');onPublished?.()
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
  {message&&<div role="status" className="portal-notice">{message}</div>}
  {!user&&<div className="portal-auth">
   <div className="portal-welcome"><PawPrint size={48}/><h2>Todo pet merece encontrar seu lar.</h2><p>Crie uma conta para adotar, proteger ou divulgar animais. A adoção é gratuita.</p><div className="portal-features"><span>♡ Adoção responsável</span><span>✓ Perfis de protetores e ONGs</span><span>⌂ Começando pelo Distrito Federal</span></div></div>
   <div className="portal-panel">
    <div className="portal-tabs"><button className={mode==='signup'?'selected':''} onClick={()=>setMode('signup')}>Criar conta</button><button className={mode==='login'?'selected':''} onClick={()=>setMode('login')}>Entrar</button></div>
    <form onSubmit={auth} className="portal-form">
    {mode==='signup'&&<>
     <label>Como você deseja participar?</label>
     <div className="role-grid">{([{id:'adopter',name:'Adotante',icon:<Heart/>},{id:'protector',name:'Protetor',icon:<UserRound/>},{id:'ngo',name:'ONG',icon:<Building2/>}] as const).map(r=><button type="button" key={r.id} className={role===r.id?'selected':''} onClick={()=>setRole(r.id)}>{r.icon}<span>{r.name}</span></button>)}</div>
     <label>{role==='ngo'?'Nome da ONG':'Nome completo'}<input required minLength={2} maxLength={100} value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Como podemos chamar você?"/></label>
     <div className="portal-two"><label>Cidade<input required maxLength={80} value={city} onChange={e=>setCity(e.target.value)}/></label><label>Região / bairro<input required maxLength={80} value={district} onChange={e=>setDistrict(e.target.value)} placeholder="Ex.: Ceilândia"/></label></div>
    </>}
    <label>E-mail<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@exemplo.com"/></label>
    <label>Senha<input type="password" required minLength={8} autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres"/></label>
    <button className="primary wide" disabled={!isBackendReady||busy}>{busy?'Processando...':mode==='signup'?'Criar minha conta':'Entrar na minha conta'}<LogIn size={17}/></button>
    <small>Não use dados pessoais reais enquanto o Supabase não estiver configurado. Ao disponibilizar cadastros, será necessária uma política de privacidade.</small>
    </form>
   </div>
  </div>}
  {user&&<div className="portal-dashboard">
   <div className="dashboard-head"><div className="profile-avatar"><UserRound size={27}/></div><div><h2>Olá, {profile?.display_name||user.email}!</h2><p>{profile?.role==='ngo'?'ONG':profile?.role==='protector'?'Protetor independente':'Adotante'} {profile?.district?'· '+profile.district:''}</p></div><button className="secondary" onClick={signOut}>Sair <LogOut size={16}/></button></div>
   {profile?.role==='adopter'&&<div className="portal-alert"><Heart/><div><strong>Seu perfil de adotante está pronto.</strong><p>Encontre um pet em Explorar. As solicitações reais e o acompanhamento serão conectados na próxima etapa.</p></div></div>}
   {!profile&&<div className="portal-alert">Estamos preparando seu perfil. Se acabou de confirmar o e-mail, atualize esta página.</div>}
   {profile&&profile.role!=='adopter'&&<>
    <div className="dashboard-stats"><div><strong>{pets.length}</strong><span>Pets cadastrados</span></div><div><strong>{pets.filter(p=>p.status==='available').length}</strong><span>Disponíveis</span></div><div><strong>{pets.filter(p=>p.status==='adopted').length}</strong><span>Adotados</span></div></div>
    <div className="dashboard-toolbar"><h2>Meus animais</h2><button className="primary" onClick={()=>setShowForm(v=>!v)}>{showForm?'Fechar formulário':'Cadastrar pet'} <Plus size={17}/></button></div>
    {showForm&&<form className="portal-panel portal-form pet-form" onSubmit={publish}>
     <h3>Vamos apresentar esse novo amigo?</h3>
     <div className="portal-two"><label>Nome do pet *<input required maxLength={70} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Idade aproximada *<input required maxLength={50} placeholder="Ex.: 2 anos" value={form.age_label} onChange={e=>setForm({...form,age_label:e.target.value})}/></label></div>
     <div className="portal-two"><label>Espécie<select value={form.species} onChange={e=>setForm({...form,species:e.target.value})}><option>Cachorro</option><option>Gato</option></select></label><label>Porte<select value={form.size} onChange={e=>setForm({...form,size:e.target.value})}><option>Pequeno</option><option>Médio</option><option>Grande</option></select></label></div>
     <div className="portal-two"><label>Cidade *<input required maxLength={80} value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></label><label>Região / bairro *<input required maxLength={80} value={form.district} onChange={e=>setForm({...form,district:e.target.value})}/></label></div>
     <label>Cor<select value={form.color} onChange={e=>setForm({...form,color:e.target.value})}><option value="">Selecione</option>{colors.map(c=><option key={c}>{c}</option>)}</select></label>
     <label>Personalidade (selecione várias)</label><div className="trait-grid">{traits.map(t=><button key={t} type="button" className={traitList.includes(t)?'chosen':''} onClick={()=>setTraitList(a=>a.includes(t)?a.filter(x=>x!==t):[...a,t])}>{t}</button>)}</div>
     <label>Conte a história do pet *<textarea required minLength={20} maxLength={2000} rows={4} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Saúde, sociabilidade, necessidades especiais, história e cuidados..."/></label>
     <label className="upload-label"><ImagePlus size={21}/> Foto (JPG, PNG ou WebP, até 5 MB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setPhoto(e.target.files?.[0]??null)}/></label>
     <button disabled={busy} className="primary wide">{busy?'Publicando...':'Publicar pet para adoção'} <PawPrint size={17}/></button>
    </form>}
    <div className="owned-list">{pets.map(p=><article key={p.id}><div className="owned-thumb">{p.image_url?<img src={p.image_url} alt={p.name}/>:<PawPrint/>}</div><div className="owned-info"><h3>{p.name}</h3><p>{p.species} · {p.age_label} · {p.district}</p><span>{p.status==='available'?'Disponível':p.status==='reserved'?'Em processo de adoção':'Adotado'}</span></div><select disabled={busy} aria-label={'Situação de '+p.name} value={p.status} onChange={e=>setStatus(p,e.target.value as PetListing['status'])}><option value="available">Disponível</option><option value="reserved">Reservado</option><option value="adopted">Adotado</option></select></article>)}{pets.length===0&&<div className="empty"><Trash2 size={28}/><p>Nenhum pet publicado ainda.</p></div>}</div>
   </>}
  </div>}
 </section>
}
