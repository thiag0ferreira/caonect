import {useEffect,useState} from 'react'
import {Heart,MessageCircle,MapPin,PawPrint,ShieldCheck,X,Navigation,ChevronLeft,ChevronRight} from 'lucide-react'
import {supabase,isBackendReady,type PetListing} from './supabase'
import {useCurrentUser,useFavorites,startConversation} from './Interactions'
import type {User} from '@supabase/supabase-js'
import './interactions.css'

type Props={mode?:'featured'|'explore'|'favorites';query?:string;location?:string;species?:string;size?:string;limit?:number;onLogin?:()=>void;onChat?:()=>void;user?:User|null}
export default function CommunityPets({mode='explore',query='',location='',species='Todos',size='Todos',limit,onLogin,onChat,user:passedUser}:Props){
 const ownUser=useCurrentUser()
 const user=passedUser===undefined?ownUser:passedUser
 const {ids,error:favError,toggle}=useFavorites(user)
 const [pets,setPets]=useState<PetListing[]>([])
 const [detail,setDetail]=useState<PetListing|null>(null)
 const [photoIndex,setPhotoIndex]=useState(0)
 const [error,setError]=useState('')
 const [working,setWorking]=useState(false)
 const [notice,setNotice]=useState('')
 const [refresh,setRefresh]=useState(0)
 const [position,setPosition]=useState<{lat:number;lng:number}|null>(null)
 const [radius,setRadius]=useState(25)
 const [geoError,setGeoError]=useState('')
 useEffect(()=>{if(!supabase)return;let live=true
 const client=supabase
 client.from('pets').select('id,owner_id,name,species,size,age_label,city,district,neighborhood,photo_urls,color,breed,approximate_lat,approximate_lng,description,personality,image_url,status,created_at').eq('status','available').order('created_at',{ascending:false}).limit(100)
  .then(({data,error})=>{if(live){if(error)setError('Falha ao carregar pets. '+error.message);else{setPets((data||[]) as PetListing[]);setError('')}}})
 return()=>{live=false}
 },[refresh])
 const distance=(p:PetListing)=>{
  if(!position||p.approximate_lat==null||p.approximate_lng==null)return null
  const radians=(x:number)=>x*Math.PI/180
  const dLat=radians(p.approximate_lat-position.lat),dLon=radians(p.approximate_lng-position.lng)
  const a=Math.sin(dLat/2)**2+Math.cos(radians(position.lat))*Math.cos(radians(p.approximate_lat))*Math.sin(dLon/2)**2
  return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
 }
 const askNearby=()=>{
  if(!navigator.geolocation){setGeoError('Geolocalização não disponível neste navegador.');return}
  setGeoError('');navigator.geolocation.getCurrentPosition(
   p=>setPosition({lat:p.coords.latitude,lng:p.coords.longitude}),
   ()=>setGeoError('Localização não autorizada ou indisponível. Você pode continuar buscando por região.'),
   {enableHighAccuracy:false,timeout:12000,maximumAge:60000})
 }
 const filtered=pets.filter(p=>(!position||(distance(p)!==null&&distance(p)!<=radius))&&(mode!=='favorites'||ids.includes(p.id))&&(species==='Todos'||species===p.species)&&(size==='Todos'||size===p.size)&&(`${p.name} ${p.species} ${p.personality.join(' ')} ${p.description}`.toLowerCase().includes(query.toLowerCase()))&&(`${p.city} ${p.district} ${p.neighborhood||''}`.toLowerCase().includes(location.toLowerCase())))
 const sorted=position?[...filtered].sort((a,b)=>(distance(a)??Infinity)-(distance(b)??Infinity)):filtered
 const shown=limit?sorted.slice(0,limit):sorted
 const openPet=(p:PetListing)=>{setPhotoIndex(0);setDetail(p);setNotice('')}
 const images=(p:PetListing)=>p.photo_urls?.length?p.photo_urls:(p.image_url?[p.image_url]:[])
 async function favorite(p:PetListing){
  setNotice('')
  if(!user){setNotice('Entre na sua conta para salvar favoritos.');return}
  const result=await toggle(p.id)
  if(!result)setNotice('Não foi possível salvar o favorito.')
 }
 async function contact(intent:'question'|'adoption'){
  if(!detail)return
  if(!user){setNotice('Entre na sua conta para conversar ou solicitar adoção.');return}
  setWorking(true);setNotice('')
  try{await startConversation(detail,user,intent);setDetail(null);onChat?.()}
  catch(e){setNotice(e instanceof Error?e.message:'Não foi possível iniciar conversa.')}
  finally{setWorking(false)}
 }
 if(!isBackendReady)return <div className="empty"><p>O catálogo está indisponível. Verifique a configuração do Supabase.</p></div>
 return <div className="community-pets">{mode==='explore'&&<div className="nearby-panel"><button className="secondary" onClick={position?()=>setPosition(null):askNearby}><Navigation size={17}/>{position?'Desativar proximidade':'Buscar perto de mim'}</button>{position&&<><label>Distância <select value={radius} onChange={e=>setRadius(Number(e.target.value))}>{[5,10,25,50,100,200].map(k=><option key={k} value={k}>Até {k} km</option>)}</select></label><small>Mostrando apenas pets com localização aproximada cadastrada.</small></>}{geoError&&<small role="alert">{geoError}</small>}</div>}{error&&<p role="alert" className="portal-notice">{error}</p>}{favError&&<p role="alert" className="portal-notice">{favError}</p>}
  {mode==='explore'&&<p className="results">{filtered.length} animais disponíveis encontrados</p>}
  {shown.length===0&&!error&&<div className="empty"><PawPrint size={36}/><h2>{mode==='favorites'?'Seu coração ainda tem espaço':'Nenhum pet encontrado'}</h2><p>{mode==='favorites'?'Favorite um animal para encontrá-lo aqui depois.':'Tente outros filtros ou volte para ver novas adoções.'}</p></div>}
  <div className="grid">{shown.map(p=><article className="pet-card" key={p.id}>
   <button className="photo-button" onClick={()=>openPet(p)} aria-label={'Conhecer '+p.name}>{images(p).length?<img src={images(p)[0]} alt={'Foto de '+p.name} loading="lazy"/>:<div className="community-placeholder"><PawPrint size={48}/></div>}<span className="available">Disponível para adoção</span></button>
   <button className={'favorite '+(ids.includes(p.id)?'on':'')} aria-label={ids.includes(p.id)?'Retirar dos favoritos':'Favoritar'} onClick={()=>favorite(p)}><Heart fill={ids.includes(p.id)?'currentColor':'none'}/></button>
   <div className="pet-content"><div className="pet-title"><h3>{p.name}</h3><span>{p.species}</span></div><p>{p.age_label} · {p.breed||'SRD'} · Porte {p.size.toLowerCase()}</p>{position&&distance(p)!=null&&<p className="pet-distance">Aproximadamente {Math.round(distance(p)!)} km de você</p>}<small><MapPin size={14}/>{p.neighborhood? p.neighborhood+' · ':''}{p.district}, {p.city}</small><button className="link-button" onClick={()=>{setDetail(p);setNotice('')}}>Conhecer {p.name} →</button></div>
  </article>)}</div>
  {notice&&!detail&&<p role="status" className="portal-notice">{notice} {!user&&<button onClick={onLogin} className="link-button">Entrar</button>}</p>}
  {detail&&<div className="overlay" onClick={()=>setDetail(null)}><section className="modal community-modal" role="dialog" aria-modal="true" aria-label={'Detalhes de '+detail.name} onClick={e=>e.stopPropagation()}>
   <button className="close" aria-label="Fechar" onClick={()=>setDetail(null)}><X size={20}/></button>
   <div className="pet-gallery">{images(detail).length?<><img className="modal-image" src={images(detail)[photoIndex]||images(detail)[0]} alt={'Foto '+(photoIndex+1)+' de '+detail.name}/>{images(detail).length>1&&<><button type="button" className="gallery-arrow gallery-prev" onClick={()=>setPhotoIndex(i=>(i-1+images(detail).length)%images(detail).length)} aria-label="Foto anterior"><ChevronLeft/></button><button type="button" className="gallery-arrow gallery-next" onClick={()=>setPhotoIndex(i=>(i+1)%images(detail).length)} aria-label="Próxima foto"><ChevronRight/></button><span className="gallery-count">{photoIndex+1} / {images(detail).length}</span></>}</>:<div className="community-placeholder"><PawPrint size={70}/></div>}</div>
   <div className="modal-content"><span className="kicker">UM NOVO AMIGO</span><h2>{detail.name}</h2><p>{detail.species} · {detail.age_label} · Porte {detail.size.toLowerCase()}</p><p>Raça: {detail.breed||'Sem raça definida (SRD)'}</p>{position&&distance(detail)!=null&&<p className="pet-distance">Aproximadamente {Math.round(distance(detail)!)} km de você</p>}<small><MapPin size={15}/>{detail.neighborhood?detail.neighborhood+' · ':''}{detail.district}, {detail.city}</small><div className="tags">{detail.color&&<span>{detail.color}</span>}{detail.personality.map(t=><span key={t}>♡ {t}</span>)}</div><h3>Conheça minha história</h3><p>{detail.description}</p>
    <div className="pet-actions"><button disabled={working} className={'secondary '+(ids.includes(detail.id)?'liked':'')} onClick={()=>favorite(detail)}><Heart size={17} fill={ids.includes(detail.id)?'currentColor':'none'}/>{ids.includes(detail.id)?'Salvo nos favoritos':'Curtir / Favoritar'}</button>
    <button disabled={working||detail.owner_id===user?.id} className="secondary" onClick={()=>contact('question')}><MessageCircle size={17}/> Conversar</button>
    <button disabled={working||detail.owner_id===user?.id} className="primary" onClick={()=>contact('adoption')}>Tenho interesse em adotar</button></div>
    {detail.owner_id===user?.id&&<p className="demo-note">Você é responsável por este pet. Gerencie-o em Perfil.</p>}
    {notice&&<p className="portal-notice" role="status">{notice} {!user&&<button className="link-button" onClick={onLogin}>Entrar / Criar conta</button>}</p>}
    <p className="safe-note"><ShieldCheck size={15}/> Conversas privadas dentro do Cãonect. Não compartilhe informações sensíveis.</p>
   </div>
  </section></div>}
 </div>
}
