import {useEffect,useState} from 'react'
import {MapPin, PawPrint} from 'lucide-react'
import {supabase,isBackendReady,type PetListing} from './supabase'

export default function CommunityPets({refresh=0}:{refresh?:number}){
 const [pets,setPets]=useState<PetListing[]>([])
 const [error,setError]=useState('')
 const [detail,setDetail]=useState<PetListing|null>(null)
 useEffect(()=>{
  if(!supabase)return
  let active=true
  supabase.from('pets').select('id,owner_id,name,species,size,age_label,city,district,color,description,personality,image_url,status,created_at').eq('status','available').order('created_at',{ascending:false}).limit(60)
    .then(({data,error})=>{if(!active)return;if(error)setError('Não foi possível carregar os animais cadastrados.');else{setError('');setPets((data||[]) as PetListing[])}})
  return()=>{active=false}
 },[refresh])
 if(!isBackendReady)return null
 return <div className="community-pets"><h2>Pets da comunidade</h2><p>Cadastros reais enviados por protetores e ONGs.</p>{error&&<p role="alert">{error}</p>}
  {pets.length===0&&!error&&<p>Não há animais disponíveis cadastrados no momento.</p>}
  <div className="grid">{pets.map(p=><article className="pet-card" key={p.id}>
   <button className="photo-button" onClick={()=>setDetail(p)}>{p.image_url?<img src={p.image_url} alt={p.name} loading="lazy"/>:<div className="community-placeholder"><PawPrint size={56}/></div>}<span className="available">Disponível para adoção</span></button>
   <div className="pet-content"><div className="pet-title"><h3>{p.name}</h3><span>{p.species}</span></div><p>{p.age_label} · Porte {p.size.toLowerCase()}</p><small><MapPin size={14}/>{p.district}, {p.city}</small><button className="link-button" onClick={()=>setDetail(p)}>Conhecer {p.name} →</button></div>
  </article>)}</div>
  {detail&&<div className="overlay" onClick={()=>setDetail(null)}><section className="modal community-modal" role="dialog" aria-modal="true" aria-label={'Detalhes de '+detail.name} onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setDetail(null)} aria-label="Fechar">✕</button>{detail.image_url?<img className="modal-image" src={detail.image_url} alt={detail.name}/>:<div className="community-placeholder"><PawPrint size={70}/></div>}<div className="modal-content"><h2>{detail.name}</h2><p>{detail.species} · {detail.age_label} · {detail.size}</p><p><MapPin size={15}/> {detail.district}, {detail.city}</p><h3>Conheça minha história</h3><p>{detail.description}</p><div className="tags">{detail.personality.map(t=><span key={t}>{t}</span>)}</div><p className="demo-note">O contato direto e as solicitações reais serão habilitados na próxima etapa, com proteção dos dados pessoais.</p></div></section></div>}
 </div>
}
