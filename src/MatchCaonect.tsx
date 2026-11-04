import {useEffect,useMemo,useState} from 'react'
import {ArrowRight,ArrowLeft,Sparkles,MapPin,Info,ShieldCheck,RefreshCw,PawPrint} from 'lucide-react'
import {supabase,type PetListing} from './supabase'
import {emptyMatch,rankMatches,type MatchAnswers} from './matchEngine'
import './match.css'
import {SUPPORTED_CITIES} from './supportedLocations'

type Props={onExplore:(petName:string,city?:string)=>void}
const steps=[
 {key:'home',title:'Como é sua moradia?',subtitle:'Não existe um tipo de casa ideal para todos os pets.',options:[['casa','Casa'],['apartamento','Apartamento']]},
 {key:'children',title:'Há crianças na sua casa?',subtitle:'Vamos destacar cuidados a confirmar com o protetor.',options:[['sim','Sim'],['nao','Não']]},
 {key:'otherPets',title:'Você já tem outros animais?',subtitle:'A apresentação entre pets deve ser gradual e supervisionada.',options:[['sim','Sim'],['nao','Não']]},
 {key:'activity',title:'Como é o ritmo da sua rotina?',subtitle:'Pense na energia e no nível de atividade que deseja compartilhar.',options:[['tranquila','Mais tranquila'],['moderada','Equilibrada'],['ativa','Bem ativa']]},
 {key:'time',title:'Quanto tempo pode dedicar diariamente?',subtitle:'Considere atenção, brincadeiras e passeios, além de cuidados básicos.',options:[['pouco','Pouco tempo'],['medio','Algumas horas'],['muito','Bastante tempo']]},
 {key:'experience',title:'Qual é sua experiência com pets?',subtitle:'Isso ajuda a identificar características que merecem orientação.',options:[['primeiro','Será meu primeiro pet'],['experiente','Já tive ou tenho pets']]},
 {key:'size',title:'Tem preferência por porte?',subtitle:'Você pode deixar em aberto para conhecer mais animais.',options:[['Todos','Sem preferência'],['Pequeno','Pequeno'],['Médio','Médio'],['Grande','Grande']]}
] as const
export default function MatchCaonect({onExplore}:Props){
 const [answers,setAnswers]=useState<MatchAnswers>(emptyMatch)
 const [matchCity,setMatchCity]=useState('Todas')
 const [step,setStep]=useState(0)
 const [results,setResults]=useState(false)
 const [pets,setPets]=useState<PetListing[]>([])
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 useEffect(()=>{
  if(!results||!supabase)return
  const client=supabase;let mounted=true
  setLoading(true);setError('')
  ;(matchCity==='Todas'?client.from('pets').select('id,owner_id,name,species,size,age_label,city,district,neighborhood,photo_urls,color,breed,approximate_lat,approximate_lng,description,personality,image_url,status,created_at').eq('status','available').in('species',['Cachorro','Gato']):client.from('pets').select('id,owner_id,name,species,size,age_label,city,district,neighborhood,photo_urls,color,breed,approximate_lat,approximate_lng,description,personality,image_url,status,created_at').eq('status','available').in('species',['Cachorro','Gato']).eq('city',matchCity)).order('created_at',{ascending:false}).limit(100).then(({data,error})=>{
   if(!mounted)return
   setLoading(false)
   if(error)setError('Não foi possível carregar os pets agora. Tente novamente.')
   else setPets((data||[]) as PetListing[])
  })
  return()=>{mounted=false}
 },[results,matchCity])
 const ranked=useMemo(()=>rankMatches(pets,answers),[pets,answers])
 const current=steps[step]
 const answer=answers[current.key]
 const setValue=(value:string)=>setAnswers(a=>({...a,[current.key]:value}))
 const next=()=>{if(!answer)return;if(step<steps.length-1)setStep(s=>s+1);else setResults(true)}
 const restart=()=>{setAnswers(emptyMatch);setStep(0);setResults(false);setPets([]);setError('')}
 return <section className="section page match-page">
  <div className="match-intro"><span className="kicker"><Sparkles size={15}/> MATCH CÃONECT</span><h1>Encontre uma conexão que combine com sua rotina</h1><p>Nesta primeira versão, o Match avalia apenas cães e gatos. Outras espécies podem ser encontradas em Explorar e terão questionários próprios. A decisão exige conversa com o responsável.</p><label className="match-city-selector">Procurar animais em <select value={matchCity} onChange={e=>setMatchCity(e.target.value)}><option value="Todas">Todas as cidades</option>{SUPPORTED_CITIES.map(c=><option key={c.city} value={c.city}>{c.label}</option>)}</select></label></div>
  {!results?<div className="match-wizard">
   <div className="match-progress"><span>Passo {step+1} de {steps.length}</span><span>{Math.round(step/steps.length*100)}% concluído</span></div>
   <div className="match-track"><span style={{width:Math.round(step/steps.length*100)+'%'}}/></div>
   <h2>{current.title}</h2><p>{current.subtitle}</p>
   <div className="match-options">{current.options.map(([value,label])=><button type="button" className={answer===value?'match-option selected':'match-option'} key={value} onClick={()=>setValue(value)}><span>{label}</span><span className="match-option-check">{answer===value?'✓':''}</span></button>)}</div>
   <div className="match-controls"><button type="button" className="secondary" disabled={step===0} onClick={()=>setStep(x=>x-1)}><ArrowLeft size={16}/> Voltar</button><button type="button" className="primary" disabled={!answer} onClick={next}>{step===steps.length-1?'Ver sugestões':'Continuar'} <ArrowRight size={16}/></button></div>
   <p className="match-data-note"><ShieldCheck size={15}/> Suas respostas ficam apenas nesta sessão e não são gravadas no banco.</p>
  </div>:<div className="match-results">
   <div className="match-result-head"><div><span className="kicker">ENCONTROS POSSÍVEIS</span><h2>Sugestões para conhecer melhor</h2><p>Ordenadas por características informadas. Não é um diagnóstico de comportamento nem garantia de compatibilidade.</p></div><button className="secondary" onClick={restart}><RefreshCw size={16}/> Refazer questionário</button></div>
   {loading&&<div className="empty"><PawPrint size={32}/><p>Buscando pets cadastrados no DF...</p></div>}
   {error&&<div className="empty"><p role="alert">{error}</p><button className="primary" onClick={restart}>Tentar novamente</button></div>}
   {!loading&&!error&&ranked.length===0&&<div className="empty"><PawPrint size={33}/><h3>Novas histórias chegarão por aqui</h3><p>Não há pets disponíveis neste momento. Você pode explorar o catálogo novamente depois.</p><button className="primary" onClick={()=>onExplore('')}>Explorar todos os pets</button></div>}
   {!loading&&!error&&ranked.length>0&&<div className="match-list">{ranked.map(({pet,reasons,cautions,unknowns,blocked},idx)=><article className="match-pet" key={pet.id}>
    <div className="match-pet-photo">{pet.image_url?<img src={pet.image_url} alt={'Foto de '+pet.name} loading="lazy"/>:<PawPrint size={44}/>}</div>
    <div className="match-pet-info"><div className="match-pet-heading"><div><span className="match-rank">SUGESTÃO {idx+1}</span><h3>{pet.name}</h3><p>{pet.species} · {pet.breed||'SRD'} · Porte {pet.size.toLowerCase()}</p><small><MapPin size={13}/>{pet.district}, Brasília</small></div>{cautions.length===0&&!blocked?<span className="match-positive">Sem alerta identificado nos campos avaliados</span>:<span className="match-care">Necessita atenção</span>}</div>
    {reasons.length>0&&<div className="match-points"><strong>O que pode combinar:</strong>{reasons.map(r=><span key={r}>✓ {r}</span>)}</div>}
    {cautions.length>0&&<div className="match-cautions"><strong>Converse antes de decidir:</strong>{cautions.map(c=><span key={c}>! {c}</span>)}</div>}
    {unknowns.length>0&&<p className="match-unknown"><Info size={15}/>{unknowns.join(' · ')}</p>}
    <button type="button" className="primary match-open" onClick={()=>onExplore(pet.name,pet.city)}>Conhecer {pet.name} <ArrowRight size={17}/></button>
    </div>
   </article>)}</div>}
   <div className="match-footer-note"><ShieldCheck size={18}/><p>A escolha deve considerar avaliação do protetor, ambiente, segurança e necessidades individuais do animal. Informações ausentes não são tratadas como confirmação de compatibilidade.</p></div>
  </div>}
 </section>
}
