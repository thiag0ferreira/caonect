import {useEffect,useState} from 'react'
import {Download,Instagram,Link2,Share2,ShieldCheck,X} from 'lucide-react'
import QRCode from 'qrcode'
import {lostFoundLink,lostFoundPhoto,type LostFoundAlert} from './lostFound'
import {stateForCity} from './supportedLocations'
import './sharePoster.css'

type Format='story'|'post'
type Props={alert:LostFoundAlert;onClose:()=>void}

const palette={cream:'#F7F4EE',green:'#285B4E',dark:'#173F33',brown:'#4A2600',terracotta:'#CB8766',mint:'#DCEBE3'}

function photoElement(url:string):Promise<HTMLImageElement>{
 return new Promise((resolve,reject)=>{
  const img=new Image()
  img.crossOrigin='anonymous'
  img.onload=()=>resolve(img)
  img.onerror=()=>reject(new Error('Não foi possível carregar a foto. Verifique sua conexão e tente novamente.'))
  img.src=url
 })
}
function rounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,fill:string){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill()
}
function cover(ctx:CanvasRenderingContext2D,img:HTMLImageElement,x:number,y:number,w:number,h:number,r:number){
 const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight)
 const iw=w/scale,ih=h/scale
 ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.clip()
 ctx.drawImage(img,(img.naturalWidth-iw)/2,(img.naturalHeight-ih)/2,iw,ih,x,y,w,h)
 ctx.restore()
}
function textFit(ctx:CanvasRenderingContext2D,text:string,maxWidth:number,size:number,min:number,weight='700'){
 let px=size
 while(px>min){ctx.font=weight+' '+px+'px Arial, sans-serif';if(ctx.measureText(text).width<=maxWidth)break;px-=2}
 ctx.font=weight+' '+px+'px Arial, sans-serif'
 return px
}
function drawLines(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,width:number,step:number,maxLines:number){
 const words=text.trim().split(/\s+/)
 let line='',lines:string[]=[]
 for(const word of words){
  const check=line?line+' '+word:word
  if(ctx.measureText(check).width>width&&line){lines.push(line);line=word}else{line=check}
 }
 if(line)lines.push(line)
 if(lines.length>maxLines){lines=lines.slice(0,maxLines);let last=lines[maxLines-1];while(last.length>1&&ctx.measureText(last+'…').width>width)last=last.slice(0,-1);lines[maxLines-1]=last+'…'}
 for(const v of lines){ctx.fillText(v,x,y);y+=step}
}
async function renderPoster(alert:LostFoundAlert,format:Format):Promise<Blob>{
 if(!alert.photo_paths[0])throw Error('O anúncio precisa de uma foto.')
 const story=format==='story',W=1080,H=story?1920:1350
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Seu navegador não suporta a criação do cartaz.')
 const image=await photoElement(lostFoundPhoto(alert.photo_paths[0]))
 const link=lostFoundLink(alert.id)
 ctx.fillStyle=palette.cream;ctx.fillRect(0,0,W,H)
 ctx.fillStyle=palette.green;ctx.fillRect(0,0,W,24)
 ctx.fillStyle=palette.mint;ctx.beginPath();ctx.arc(1000,110,105,0,2*Math.PI);ctx.fill()
 ctx.textAlign='left';ctx.fillStyle=palette.green
 ctx.font='bold 49px Arial, sans-serif';ctx.fillText('Cãonect',88,story?175:124)
 ctx.fillStyle=palette.brown;ctx.font='25px Arial, sans-serif';ctx.fillText('Encontros que viram família',90,story?215:160)
 const tag=alert.alert_type==='lost'?'PROCURA-SE • PET PERDIDO':'VOCÊ CONHECE ESTE PET?'
 rounded(ctx,85,story?270:196,story?490:590,67,24,alert.alert_type==='lost'?palette.terracotta:palette.green)
 ctx.fillStyle='#fff';ctx.font='bold 27px Arial, sans-serif';ctx.fillText(tag,110,story?312:239)
 const name=alert.pet_name?.trim()||(alert.alert_type==='found'?'Animal encontrado':'Pet desaparecido')
 ctx.fillStyle=palette.dark
 textFit(ctx,name,895,82,44)
 ctx.fillText(name,86,story?408:340)
 const photoY=story?467:389,photoH=story?745:440
 cover(ctx,image,72,photoY,936,photoH,30)
 const bottom=photoY+photoH
 ctx.fillStyle=palette.green
 ctx.font='bold 39px Arial, sans-serif'
 const loc=alert.district+' • '+alert.city+'/'+stateForCity(alert.city)
 textFit(ctx,loc,918,37,25,'700')
 ctx.fillText(loc,78,bottom+(story?79:66))
 ctx.fillStyle='#65786E';ctx.font='28px Arial, sans-serif'
 ctx.fillText(alert.alert_type==='lost'?'Ajude esta família a reencontrar seu pet.':'Ajude a encontrar a família deste animal.',80,bottom+(story?130:106))
 const qr=document.createElement('canvas')
 await QRCode.toCanvas(qr,link,{width:280,margin:1,errorCorrectionLevel:'M',color:{dark:'#173F33',light:'#FFFFFF'}})
 const qrY=story?1470:980
 const qrBlock=story?340:235,qrSize=story?281:194
 rounded(ctx,73,qrY-23,qrBlock,qrBlock,26,'#FFFFFF')
 ctx.drawImage(qr,story?102:94,qrY+5,qrSize,qrSize)
 ctx.fillStyle=palette.dark;ctx.font='bold 40px Arial, sans-serif'
 drawLines(ctx,'ESCANEIE E AJUDE',story?446:348,qrY+(story?83:54),story?570:655,51,2)
 ctx.font='30px Arial, sans-serif';ctx.fillStyle=palette.brown
 drawLines(ctx,'Veja as fotos e compartilhe o anúncio.',story?446:348,qrY+(story?177:137),story?550:660,40,2)
 ctx.fillStyle=palette.green;ctx.fillRect(0,H-94,W,94)
 ctx.fillStyle='#FFFFFF';ctx.font='bold 29px Arial, sans-serif'
 ctx.textAlign='center';ctx.fillText('Cãonect • Encontros que viram família',W/2,H-38)
 return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Não foi possível salvar o cartaz.')),'image/png'))
}

export default function SharePoster({alert,onClose}:Props){
 const [format,setFormat]=useState<Format>('story')
 const [preview,setPreview]=useState('')
 const [blob,setBlob]=useState<Blob|null>(null)
 const [error,setError]=useState('')
 const [working,setWorking]=useState(false)
 const [message,setMessage]=useState('')
 useEffect(()=>{
  let active=true,url=''
  setWorking(true);setBlob(null);setPreview('');setError('');setMessage('')
  renderPoster(alert,format).then(file=>{
   if(!active)return
   url=URL.createObjectURL(file);setPreview(url);setBlob(file)
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:'Não foi possível gerar a arte.')})
    .finally(()=>{if(active)setWorking(false)})
  return()=>{active=false;if(url)URL.revokeObjectURL(url)}
 },[alert.id,alert.photo_paths.join('|'),format])

 const filename=()=>('caonect-'+(alert.alert_type==='lost'?'perdido-':'encontrado-')+alert.id.slice(0,8)+'-'+format+'.png')
 const save=()=>{
  if(!blob||!preview)return
  const a=document.createElement('a');a.href=preview;a.download=filename();a.click()
  setMessage('Cartaz salvo. Agora você pode publicar no Instagram ou enviar pelo WhatsApp.')
 }
 const shareImage=async()=>{
  if(!blob)return
  const file=new File([blob],filename(),{type:'image/png'})
  try{
   if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
    await navigator.share({files:[file],title:alert.alert_type==='lost'?'Ajude a encontrar este pet':'Ajude a reencontrar a família',text:'Cãonect — '+lostFoundLink(alert.id)})
   }else save()
  }catch(e){
   if((e as Error)?.name!=='AbortError'){save();setMessage('Não foi possível abrir o compartilhamento de imagem. O cartaz foi baixado.')}
  }
 }
 const copyLink=async()=>{
  try{await navigator.clipboard.writeText(lostFoundLink(alert.id));setMessage('Link do alerta copiado.')}
  catch{setMessage('Não foi possível copiar automaticamente. Use o botão Compartilhar link do anúncio.')}
 }
 return <div className="lf-modal-backdrop" onClick={onClose}>
  <div className="lf-modal lf-share-modal" role="dialog" aria-modal="true" aria-label="Gerar cartaz para compartilhar" onClick={e=>e.stopPropagation()}>
   <div className="lf-share-heading"><div><h2>Ajude a divulgar este pet</h2><p>Cartaz com foto real, localização aproximada e QR Code do anúncio.</p></div><button className="lf-share-close" type="button" onClick={onClose} aria-label="Fechar"><X size={21}/></button></div>
   <div className="lf-share-types" role="group" aria-label="Formato da arte">
    <button type="button" aria-pressed={format==='story'} className={format==='story'?'active':''} onClick={()=>setFormat('story')}>Story 9:16</button>
    <button type="button" aria-pressed={format==='post'} className={format==='post'?'active':''} onClick={()=>setFormat('post')}>Feed 4:5</button>
   </div>
   <div className="lf-share-preview">{working?<p>Preparando o cartaz...</p>:preview?<img src={preview} alt={'Prévia do cartaz '+format+' de '+(alert.pet_name||'animal encontrado')}/>:<p role="alert">{error}</p>}</div>
   <div className="lf-share-actions">
    <button type="button" className="primary" disabled={!blob||working} onClick={shareImage}><Share2 size={17}/> Compartilhar imagem</button>
    <button type="button" className="secondary" disabled={!blob||working} onClick={save}><Download size={17}/> Baixar PNG</button>
    <button type="button" className="secondary" onClick={copyLink}><Link2 size={17}/> Copiar link</button>
   </div>
   {message&&<p className="lf-notice" role="status">{message}</p>}
   <p className="lf-share-footnote"><Instagram size={15}/> No Instagram, publique a imagem salva como Story ou Feed. O compartilhamento automático depende dos aplicativos disponíveis no celular.</p>
   <p className="lf-share-footnote"><ShieldCheck size={15}/> O QR Code usa o endereço deste anúncio. Enquanto o domínio oficial estiver em migração, use o cartaz de teste somente quando for necessário; o endereço pages.dev continuará válido.</p>
  </div>
 </div>
}
