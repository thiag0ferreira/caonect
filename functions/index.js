// Cãonect • DIFF 007.3: metadados Open Graph dinâmicos para links /?alert=UUID
// Cloudflare Pages Functions. Sem service_role e sem informações privadas.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const escapeAttr=value=>String(value??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;')
const clean=value=>String(value??'').replace(/[\r\n\t]+/g,' ').trim().slice(0,200)
const safeReplace=(html,regex,tag)=>html.replace(regex,tag)
const meta=(property,value)=>'<meta property="'+property+'" content="'+escapeAttr(value)+'"/>'
const twitter=(name,value)=>'<meta name="'+name+'" content="'+escapeAttr(value)+'"/>'

export async function onRequestGet(context){
 const requestUrl=new URL(context.request.url)
 const id=requestUrl.searchParams.get('alert')
 if(!uuid.test(id||''))return context.next()
 const supabaseUrl=context.env?.VITE_SUPABASE_URL
 const key=context.env?.VITE_SUPABASE_PUBLISHABLE_KEY||context.env?.VITE_SUPABASE_ANON_KEY
 if(!supabaseUrl||!key)return context.next()
 let base
 try{
  base=new URL(supabaseUrl)
  if(base.protocol!=='https:')return context.next()
 }catch{return context.next()}
 const url=new URL('/rest/v1/lost_found_alerts',base)
 url.searchParams.set('select','id,alert_type,pet_name,species,district,city,state,status,photo_paths')
 url.searchParams.set('id','eq.'+id)
 url.searchParams.set('moderation_status','eq.approved')
 url.searchParams.set('status','in.(active,resolved)')
 url.searchParams.set('limit','1')
 let rows
 try{
  const headers={apikey:key}
  if(key.startsWith('eyJ'))headers.Authorization='Bearer '+key
  const result=await fetch(url,{headers,signal:AbortSignal.timeout(3500)})
  if(!result.ok)return context.next()
  rows=await result.json()
 }catch{return context.next()}
 const item=Array.isArray(rows)?rows[0]:null
 if(!item||!Array.isArray(item.photo_paths)||!item.photo_paths[0])return context.next()
 // Os arquivos do módulo são públicos e aprovados. Não ler owner_id, tips ou dados de contato.
 const path=item.photo_paths[0]
 if(typeof path!=='string'||!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.jpg$/i.test(path))return context.next()
 const img=new URL('/storage/v1/object/public/lost-found-photos/'+path,base).toString()
 const location=[item.district,item.city,item.state].filter(Boolean).map(clean).join(', ')
 const name=clean(item.pet_name||item.species||'pet')
 const ended=item.status==='resolved'
 const label=ended?'Reencontrado':item.alert_type==='lost'?'Pet perdido':'Pet encontrado'
 const title=clean(label+' • '+name+' | Cãonect')
 const description=ended
   ?clean(name+' reencontrou sua família! Veja a história na Central de Reencontros do Cãonect.')
   :clean((item.alert_type==='lost'?'Ajude a encontrar ':'Ajude este animal encontrado: ')+name+' em '+location+'. Veja as fotos e compartilhe este alerta no Cãonect.')
 const canonical=new URL('/',requestUrl.origin)
 canonical.searchParams.set('alert',id)
 const response=await context.next()
 if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))return response
 let html=await response.text()
 html=safeReplace(html,/<meta property="og:title"[^>]*\/>/,meta('og:title',title))
 html=safeReplace(html,/<meta property="og:description"[^>]*\/>/,meta('og:description',description))
 html=safeReplace(html,/<meta property="og:url"[^>]*\/>/,meta('og:url',canonical))
 html=safeReplace(html,/<meta property="og:image"[^>]*\/>/,meta('og:image',img))
 html=safeReplace(html,/<meta property="og:image:alt"[^>]*\/>/,meta('og:image:alt','Foto de '+name+' • '+label))
 html=html.replace(/\s*<meta property="og:image:(width|height)"[^>]*\/>/g,'')
 html=safeReplace(html,/<meta name="twitter:title"[^>]*\/>/,twitter('twitter:title',title))
 html=safeReplace(html,/<meta name="twitter:description"[^>]*\/>/,twitter('twitter:description',description))
 html=safeReplace(html,/<meta name="twitter:image"[^>]*\/>/,twitter('twitter:image',img))
 html=safeReplace(html,/<meta name="description"[^>]*\/>/,twitter('description',description))
 html=safeReplace(html,/<title>[^<]*<\/title>/,'<title>'+escapeAttr(title)+'</title>')
 const headers=new Headers(response.headers)
 headers.set('content-type','text/html; charset=utf-8')
 headers.delete('content-length');headers.delete('etag')
 headers.set('cache-control','public, max-age=120')
 headers.set('x-content-type-options','nosniff')
 return new Response(html,{status:response.status,statusText:response.statusText,headers})
}
