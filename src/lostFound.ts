import type {User} from '@supabase/supabase-js'
import {supabase} from './supabase'
import {ANIMAL_CATEGORIES,categoryForSpecies,speciesForCategory} from './animalCategories'

export type AlertType='lost'|'found'
export type AlertStatus='active'|'resolved'|'archived'
export type LostFoundAlert={
 id:string; owner_id:string; alert_type:AlertType; pet_name:string|null;
 category:string;species:string;breed:string;color:string;
 size:'Pequeno'|'Médio'|'Grande'|'Não sei';characteristics:string;behavior:string;
 city:string;state:string;district:string;approximate_area:string;
 event_date:string;custody_status:string|null;description:string;
 photo_paths:string[];status:AlertStatus;moderation_status:'approved'|'pending'|'rejected';
 created_at:string;updated_at:string;resolved_at:string|null
}
export type LostFoundTip={
 id:string;alert_id:string;sender_id:string;message:string;
 sighting_date:string|null;approximate_area:string;created_at:string
}
export type LostFoundForm={
 alert_type:AlertType;pet_name:string;category:string;species:string;breed:string;
 color:string;size:LostFoundAlert['size'];characteristics:string;behavior:string;
 city:string;district:string;approximate_area:string;event_date:string;
 custody_status:string;description:string
}
const today=()=>{
 const d=new Date()
 return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)
}
export const blankLostFound=(type:AlertType='lost'):LostFoundForm=>({
 alert_type:type,pet_name:'',category:'Cachorros',species:'Cachorro',breed:'',
 color:'',size:'Médio',characteristics:'',behavior:'',
 city:'Brasília',district:'',approximate_area:'',event_date:today(),
 custody_status:type==='found'?'sighting_only':'',description:''
})
export const lostFoundPhoto=(path:string)=>{
 if(!supabase||!path)return ''
 return supabase.storage.from('lost-found-photos').getPublicUrl(path).data.publicUrl
}
export const lostFoundLink=(id:string)=>{
 const url=new URL('/',window.location.origin)
 url.searchParams.set('alert',id)
 return url.toString()
}
export function alertForm(a:LostFoundAlert):LostFoundForm{
 return {
 alert_type:a.alert_type,pet_name:a.pet_name||'',category:a.category||categoryForSpecies(a.species),
 species:a.species,breed:a.breed,color:a.color,size:a.size,
 characteristics:a.characteristics,behavior:a.behavior,city:a.city,district:a.district,
 approximate_area:a.approximate_area,event_date:a.event_date,
 custody_status:a.custody_status||'',description:a.description
 }
}
export const custodyLabel=(status:string|null)=>({
 with_me:'Está sob meus cuidados',
 with_organization:'Está com uma ONG ou protetor',
 sighting_only:'Apenas foi avistado',
 with_service:'Encaminhado ao serviço responsável'
}[status||'']||'Não informado')
export const statusLabel=(alert:LostFoundAlert)=>alert.status==='resolved'?'Reencontrado':alert.status==='archived'?'Arquivado':alert.moderation_status==='pending'?'Em revisão':alert.moderation_status==='rejected'?'Não aprovado':alert.alert_type==='lost'?'Perdido':'Encontrado'
export const categoryOptions=ANIMAL_CATEGORIES.map(c=>({id:c.id,label:c.label,emoji:c.emoji}))
export {speciesForCategory}

export async function processAlertPhoto(file:File):Promise<Blob>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use JPG, PNG ou WebP.')
 if(file.size>5*1024*1024)throw new Error('A foto original deve ter até 5 MB.')
 const image=new Image()
 const source=URL.createObjectURL(file)
 try{
  image.src=source
  await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('Não foi possível abrir a imagem.'))})
  const maxDimension=1600
  const factor=Math.min(1,maxDimension/Math.max(image.naturalWidth,image.naturalHeight))
  const canvas=document.createElement('canvas')
  canvas.width=Math.max(1,Math.round(image.naturalWidth*factor))
  canvas.height=Math.max(1,Math.round(image.naturalHeight*factor))
  const context=canvas.getContext('2d')
  if(!context)throw new Error('Não foi possível processar a imagem.')
  context.fillStyle='#fff'
  context.fillRect(0,0,canvas.width,canvas.height)
  context.drawImage(image,0,0,canvas.width,canvas.height)
  const blob=(quality:number)=>new Promise<Blob>((resolve,reject)=>{
    canvas.toBlob(b=>b?resolve(b):reject(new Error('Falha ao preparar a foto.')),'image/jpeg',quality)
  })
  let processed=await blob(.82)
  if(processed.size>2*1024*1024)processed=await blob(.68)
  if(processed.size>2*1024*1024)throw new Error('Foto muito grande após compactação.')
  // Renderizar no canvas remove metadados EXIF no fluxo normal do navegador.
  return processed
 }finally{URL.revokeObjectURL(source)}
}
export async function uploadAlertPhotos(owner:User,files:File[]):Promise<string[]>{
 if(!supabase)throw new Error('Supabase indisponível.')
 const uploaded:string[]=[]
 try{
  for(const file of files){
   const data=await processAlertPhoto(file)
   const path=owner.id+'/'+crypto.randomUUID()+'.jpg'
   const {error}=await supabase.storage.from('lost-found-photos').upload(path,data,{
    cacheControl:'3600',upsert:false,contentType:'image/jpeg'
   })
   if(error)throw error
   uploaded.push(path)
  }
  return uploaded
 }catch(e){
  if(uploaded.length)await supabase.storage.from('lost-found-photos').remove(uploaded)
  throw e
 }
}
export async function cleanupAlertPhotos(paths:string[]){
 if(supabase&&paths.length)await supabase.storage.from('lost-found-photos').remove(paths)
}
