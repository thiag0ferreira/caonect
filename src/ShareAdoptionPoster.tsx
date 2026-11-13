import {useEffect,useState} from 'react'
import {Download,Instagram,Link2,Share2,ShieldCheck,X} from 'lucide-react'
import QRCode from 'qrcode'
import type {PetListing} from './supabase'
import {stateForCity} from './supportedLocations'
import {adoptionLink,adoptionShareText,isPetShareable} from './adoptionSharing'
import './sharePoster.css'
import './adoptionShare.css'

type Format='story'|'post'
type Props={pet:PetListing;onClose:()=>void}
const theme={cream:'#F7F4EE',green:'#285B4E',dark:'#173F33',brown:'#4A2600',mint:'#DCEBE3',white:'#FFFFFF'}
const photos=(pet:PetListing)=>pet.photo_urls?.length?pet.photo_urls:(pet.image_url?[pet.image_url]:[])

function imageFrom(url:string):Promise<HTMLImageElement>{
 return new Promise((resolve,reject)=>{
  const img=new Image()
  img.crossOrigin='anonymous'
  img.onload=()=>resolve(img)
  img.onerror=()=>reject(new Error('A foto não pôde ser carregada. Confira se ela está pública no Cãonect e tente novamente.'))
  img.src=url
 })
}
function rect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,color:string){
 ctx.fillStyle=color
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()
}
function cover(ctx:CanvasRenderingContext2D,img:HTMLImageElement,x:number,y:number,w:number,h:number,r:number){
 const cropScale=Math.max(w/img.naturalWidth,h/img.naturalHeight)
 const sw=w/cropScale,sh=h/cropScale
 ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.clip()
 ctx.drawImage(img,(img.naturalWidth-sw)/2,(img.naturalHeight-sh)/2,sw,sh,x,y,w,h)
 ctx.restore()
}
function fit(ctx:CanvasRenderingContext2D,value:string,available:number,from:number,min:number){
 let size=from
 while(size>min){ctx.font='900 '+size+'px Arial, sans-serif';if(ctx.measureText(value).width<=available)break;size-=2}
 ctx.font='900 '+size+'px Arial, sans-serif'
 let label=value
 while(label.length>3&&ctx.measureText(label).width>available)label=label.slice(0,-2)
 return label===value?label:label.trim()+'…'
}
function locationText(pet:PetListing){
 return [pet.district,pet.city+'/'+stateForCity(pet.city)].filter(Boolean).join(' • ')
}
async function makeArtwork(pet:PetListing,format:Format):Promise<Blob>{
 if(!isPetShareable(pet))throw Error('Somente animais aprovados e disponíveis podem ser divulgados para adoção.')
 const photo=photos(pet)[0]
 if(!photo)throw Error('Adicione uma foto ao anúncio antes de criar o Story.')
 const story=format==='story',w=1080,h=story?1920:1350
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Este navegador não oferece suporte à geração de imagens.')
 const [petPhoto,logo]=await Promise.all([imageFrom(photo),imageFrom(import.meta.env.BASE_URL+'brand-logo.svg').catch(()=>null)])
 const link=adoptionLink(pet.id)
 ctx.fillStyle=theme.cream;ctx.fillRect(0,0,w,h)
 ctx.fillStyle=theme.green;ctx.fillRect(0,0,w,24)
 ctx.fillStyle=theme.mint;ctx.beginPath();ctx.arc(1000,story?350:95,125,0,Math.PI*2);ctx.fill()
 const headerY=story?260:58
 if(logo)ctx.drawImage(logo,85,headerY,108,75)
 ctx.textAlign='left';ctx.fillStyle=theme.green;ctx.font='900 52px Arial, sans-serif';ctx.fillText('Cãonect',212,headerY+46)
 ctx.fillStyle=theme.brown;ctx.font='26px Arial, sans-serif';ctx.fillText('Encontros que viram família',212,headerY+85)
 const badgeY=story?383:178
 rect(ctx,85,badgeY,560,65,25,theme.green)
 ctx.fillStyle=theme.white;ctx.font='bold 29px Arial, sans-serif';ctx.fillText('DISPONÍVEL PARA ADOÇÃO',112,badgeY+43)
 const nameY=story?526:305
 ctx.fillStyle=theme.dark
 const name=fit(ctx,pet.name,900,90,42)
 ctx.fillText(name,85,nameY)
 const imageY=story?574:350,imageH=story?665:520
 cover(ctx,petPhoto,78,imageY,924,imageH,28)
 const under=imageY+imageH
 ctx.fillStyle=theme.dark
 const place=locationText(pet)
 let locationSize=38
 while(locationSize>23){ctx.font='bold '+locationSize+'px Arial, sans-serif';if(ctx.measureText(place).width<910)break;locationSize-=2}
 ctx.fillText(place,85,under+62)
 ctx.font='27px Arial, sans-serif';ctx.fillStyle='#53685e'
 const sub=[pet.species,pet.age_label,'Porte '+pet.size.toLowerCase()].filter(Boolean).join(' · ')
 let subText=sub
 while(subText.length>4&&ctx.measureText(subText).width>905)subText=subText.slice(0,-2)
 ctx.fillText(subText===sub?subText:subText.trim()+'…',85,under+112)
 const q=document.createElement('canvas')
 await QRCode.toCanvas(q,link,{width:250,margin:2,errorCorrectionLevel:'M',color:{dark:theme.dark,light:theme.white}})
 const qrY=story?1458:1042
 rect(ctx,83,qrY,250,250,20,theme.white)
 ctx.drawImage(q,96,qrY+13,224,224)
 ctx.fillStyle=theme.green;ctx.font='bold 43px Arial, sans-serif'
 ctx.fillText('QUERO ADOTAR!',363,qrY+74)
 ctx.font='30px Arial, sans-serif';ctx.fillStyle=theme.brown
 ctx.fillText('Escaneie e conheça este pet.',363,qrY+131)
 ctx.fillStyle=theme.green;ctx.font='bold 25px Arial, sans-serif'
 ctx.fillText('www.caonect.com.br',363,qrY+186)
 const footerY=story?1772:1290
 ctx.fillStyle=theme.green;ctx.fillRect(0,footerY,w,story?72:60)
 ctx.textAlign='center';ctx.fillStyle=theme.white;ctx.font='bold 29px Arial, sans-serif'
 ctx.fillText('Cãonect • Encontros que viram família',w/2,footerY+43)
 return new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Não foi possível criar a imagem.')),'image/png'))
}
export default function ShareAdoptionPoster({pet,onClose}:Props){
 const [format,setFormat]=useState<Format>('story')
 const [blob,setBlob]=useState<Blob|null>(null)
 const [preview,setPreview]=useState('')
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const link=adoptionLink(pet.id)
 useEffect(()=>{
  let current=true,url=''
  setLoading(true);setError('');setBlob(null);setPreview('');setMessage('')
  makeArtwork(pet,format).then(b=>{
   if(!current)return
   url=URL.createObjectURL(b);setBlob(b);setPreview(url)
  }).catch(e=>{if(current)setError(e instanceof Error?e.message:'Erro ao gerar arte.')})
   .finally(()=>{if(current)setLoading(false)})
  return()=>{current=false;if(url)URL.revokeObjectURL(url)}
 },[pet.id,pet.status,pet.review_status,pet.image_url,pet.photo_urls?.join('|'),format])
 useEffect(()=>{
  const onEsc=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()}
  window.addEventListener('keydown',onEsc)
  return()=>window.removeEventListener('keydown',onEsc)
 },[onClose])
 const filename=()=>('caonect-adote-'+pet.id.slice(0,8)+'-'+format+'.png')
 const download=()=>{
  if(!blob||!preview)return
  const anchor=document.createElement('a');anchor.href=preview;anchor.download=filename();anchor.click()
  setMessage('Arte salva! Abra o Instagram, adicione ao Story e use o adesivo de Link para direcionar ao anúncio.')
 }
 const share=async()=>{
  if(!blob)return
  const file=new File([blob],filename(),{type:'image/png'})
  if(navigator.share&&navigator.canShare?.({files:[file]})){
   try{
    await navigator.share({files:[file],title:'Adote '+pet.name+' no Cãonect',text:adoptionShareText(pet)})
    setMessage('Imagem enviada ao compartilhamento. No Story, inclua o adesivo de Link usando o botão Copiar link.')
    return
   }catch(e){if((e as Error)?.name==='AbortError')return}
  }
  download()
 }
 const copy=async()=>{
  try{await navigator.clipboard.writeText(link);setMessage('Link copiado! No Instagram: adesivos → Link → colar.')}
  catch{window.prompt('Copie o link para colocar no adesivo Link do Instagram:',link)}
 }
 return <div className="adopt-share-backdrop" onClick={onClose}>
  <div className="adopt-share-dialog lf-share-modal" role="dialog" aria-modal="true" aria-label={'Divulgar '+pet.name+' para adoção'} onClick={e=>e.stopPropagation()}>
   <div className="lf-share-heading"><div><span className="kicker">DIVULGAÇÃO PARA ADOÇÃO</span><h2>Divulgue {pet.name} no Instagram 💚</h2><p>Arte pronta com foto, localização aproximada e QR Code que abre o anúncio do Cãonect.</p></div>
    <button type="button" className="lf-share-close" aria-label="Fechar" onClick={onClose}><X size={21}/></button></div>
   <div className="lf-share-types" role="group" aria-label="Formato da publicação">
    <button type="button" className={format==='story'?'active':''} aria-pressed={format==='story'} onClick={()=>setFormat('story')}>Story 9:16</button>
    <button type="button" className={format==='post'?'active':''} aria-pressed={format==='post'} onClick={()=>setFormat('post')}>Publicação 4:5</button>
   </div>
   <div className="lf-share-preview">{loading?<p role="status">Preparando arte para o Instagram...</p>:preview?<img src={preview} alt={'Prévia da arte para '+pet.name}/>:<p role="alert">{error}</p>}</div>
   <div className="lf-share-actions">
    <button type="button" className="primary" disabled={!blob||loading} onClick={share}><Share2 size={17}/> Compartilhar imagem</button>
    <button type="button" className="secondary" disabled={!blob||loading} onClick={download}><Download size={17}/> Baixar {format==='story'?'Story':'imagem'}</button>
    <button type="button" className="secondary" onClick={copy}><Link2 size={17}/> Copiar link da adoção</button>
   </div>
   {message&&<p className="adopt-share-message" role="status">{message}</p>}
   <p className="lf-share-footnote"><Instagram size={16}/> <span><strong>Para ter um atalho clicável no Story:</strong> publique a imagem no Instagram, abra <strong>Adesivos → Link</strong> e cole o link do anúncio. Sites não conseguem inserir o adesivo automaticamente.</span></p>
   <p className="lf-share-footnote"><ShieldCheck size={16}/> Compartilhe apenas pets disponíveis e aprovados. Se a adoção for concluída, atualize o status no Cãonect.</p>
  </div>
 </div>
}
