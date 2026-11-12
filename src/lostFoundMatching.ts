import type {LostFoundAlert} from './lostFound'

/**
 * DIFF 007.4: sugestões determinísticas e explicáveis, sem IA paga.
 * A pontuação é só para ordenação. NUNCA é probabilidade nem prova de identidade.
 * Usa exclusivamente alertas já disponíveis ao público sob RLS.
 */
export type MatchSuggestion={
 lost:LostFoundAlert
 found:LostFoundAlert
 score:number
 level:'more'|'possible'
 reasons:string[]
 cautions:string[]
}

const normalize=(value:string|null|undefined)=>String(value||'')
 .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,' ').trim()

const colorWords:Record<string,string>={
 branco:'branco',branca:'branco',preto:'preto',preta:'preto',
 cinza:'cinza',cinzento:'cinza',cinzenta:'cinza',
 marrom:'marrom',castanho:'marrom',castanha:'marrom',
 caramelo:'caramelo',amarelo:'amarelo',amarela:'amarelo',
 dourado:'dourado',dourada:'dourado',bege:'bege',
 laranja:'laranja',ruivo:'laranja',ruiva:'laranja',
 tricolor:'tricolor'
}
const colors=(value:string)=>new Set(normalize(value).split(' ').map(w=>colorWords[w]).filter((w):w is string=>!!w))
const unknownBreed=(s:string)=>!s||s==='srd'||s.includes('sem raca')||s.includes('nao sei')||s.includes('indefinid')

const validPublic=(a:LostFoundAlert)=>a.status==='active'&&a.moderation_status==='approved'
const dateNumber=(s:string)=>Date.parse(s.slice(0,10)+'T12:00:00Z')
const day=86_400_000

export function evaluateMatch(a:LostFoundAlert,b:LostFoundAlert):MatchSuggestion|null{
 if(a.id===b.id||a.owner_id===b.owner_id||a.alert_type===b.alert_type)return null
 if(!validPublic(a)||!validPublic(b))return null
 const lost=a.alert_type==='lost'?a:b
 const found=a.alert_type==='found'?a:b
 if(normalize(lost.city)!==normalize(found.city))return null
 if(normalize(lost.species)!==normalize(found.species))return null
 const lostDate=dateNumber(lost.event_date)
 const foundDate=dateNumber(found.event_date)
 if(!Number.isFinite(lostDate)||!Number.isFinite(foundDate))return null
 const days=Math.round((foundDate-lostDate)/day)
 // Um animal encontrado muito antes de sumir ou 4 meses depois exige pesquisa manual.
 if(days< -7||days>120)return null

 let score=28
 let signals=0
 const reasons:string[]=['Mesma espécie e cidade']
 const cautions:string[]=[]

 const districtA=normalize(lost.district),districtB=normalize(found.district)
 if(districtA&&districtB&&districtA===districtB){
  score+=24;signals++;reasons.push('Mesma região informada')
 }else if(districtA&&districtB&&(districtA.includes(districtB)||districtB.includes(districtA))){
  score+=12;signals++;reasons.push('Regiões com nomes semelhantes')
 }else if(districtA&&districtB){
  cautions.push('Regiões diferentes: confirme se houve deslocamento')
 }
 const ca=colors(lost.color),cb=colors(found.color)
 const common=[...ca].filter(c=>cb.has(c))
 if(common.length){
  score+=16;signals++;reasons.push('Cores em comum: '+common.join(', '))
 }else if(ca.size&&cb.size){
  score-=12;cautions.push('Cores registradas diferentes')
 }
 const sizeA=normalize(lost.size),sizeB=normalize(found.size)
 if(sizeA&&sizeB&&sizeA!=='nao sei'&&sizeB!=='nao sei'){
  if(sizeA===sizeB){score+=12;signals++;reasons.push('Mesmo porte informado')}
  else{score-=8;cautions.push('Portes informados diferentes')}
 }
 if(days>= -2&&days<=7){score+=14;signals++;reasons.push('Datas próximas')}
 else if(days>= -7&&days<=30){score+=10;signals++;reasons.push('Datas compatíveis')}
 else if(days<=60){score+=4;cautions.push('Ocorrências com mais de 30 dias de diferença')}
 else cautions.push('Ocorrências com grande intervalo de datas')

 const breedA=normalize(lost.breed),breedB=normalize(found.breed)
 if(!unknownBreed(breedA)&&!unknownBreed(breedB)&&breedA===breedB){
  score+=7;signals++;reasons.push('Raça ou variedade informada igual')
 }
 if(signals<2||score<55)return null
 return {lost,found,score,level:score>=72?'more':'possible',reasons,cautions}
}

export function findMatches(alerts:LostFoundAlert[],forAlertId?:string,limit=12):MatchSuggestion[]{
 const lost=alerts.filter(a=>a.alert_type==='lost'&&validPublic(a))
 const found=alerts.filter(a=>a.alert_type==='found'&&validPublic(a))
 const pairs:MatchSuggestion[]=[]
 for(const a of lost)for(const b of found){
  if(forAlertId&&a.id!==forAlertId&&b.id!==forAlertId)continue
  const foundMatch=evaluateMatch(a,b)
  if(foundMatch)pairs.push(foundMatch)
 }
 pairs.sort((a,b)=>b.score-a.score||
  Math.max(dateNumber(b.lost.event_date),dateNumber(b.found.event_date))-
  Math.max(dateNumber(a.lost.event_date),dateNumber(a.found.event_date))||
  a.lost.id.localeCompare(b.lost.id)||
  a.found.id.localeCompare(b.found.id))
 return pairs.slice(0,limit)
}
