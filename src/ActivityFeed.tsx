import {useEffect,useState} from 'react'
import {PawPrint,Heart,Clock3} from 'lucide-react'
import {supabase} from './supabase'
import './activity.css'
type Activity={id:number;pet_id:string;event_type:'published'|'available'|'reserved'|'adopted';pet_name:string;district:string;city:string;created_at:string}
const metadata={
 published:{icon:'🐾',text:'chegou ao Cãonect'},
 available:{icon:'💚',text:'voltou a estar disponível'},
 reserved:{icon:'🤝',text:'está em processo de adoção'},
 adopted:{icon:'🏡',text:'encontrou um lar'}
}
export default function ActivityFeed(){
 const [items,setItems]=useState<Activity[]>([])
 const [error,setError]=useState(false)
 useEffect(()=>{
  if(!supabase)return
  let active=true
  supabase.from('pet_activity').select('id,pet_id,event_type,pet_name,district,city,created_at').order('created_at',{ascending:false}).limit(12)
   .then(({data,error})=>{if(active){setError(Boolean(error));setItems((data||[]) as Activity[])}})
  return()=>{active=false}
 },[])
 const adopted=items.filter(e=>e.event_type==='adopted').length
 return <section className="activity-section"><div className="section">
  <div className="activity-heading"><div><span className="kicker">ACONTECEU POR AQUI</span><h2><Heart size={27}/> Nossa comunidade em movimento</h2><p>Acompanhe novos resgates e mudanças de situação, registradas de verdade pelos protetores.</p></div><div className="activity-mark"><PawPrint size={22}/><strong>{items.length}</strong><span>atualizações recentes</span></div></div>
  {error?<p className="activity-note">O mural será ativado depois de executar a migração DIFF 002.2 no Supabase.</p>:items.length===0?<div className="activity-empty"><Clock3 size={24}/><p>As primeiras novidades aparecerão aqui quando os protetores cadastrarem seus pets.</p></div>:<>
  <div className="activity-grid">{items.slice(0,6).map(a=><article key={a.id} className="activity-card"><span className="activity-icon">{metadata[a.event_type]?.icon||'🐾'}</span><div><strong>{a.pet_name}</strong> {metadata[a.event_type]?.text||'teve uma atualização'}<small>{a.district}, {a.city} · {new Date(a.created_at).toLocaleDateString('pt-BR')}</small></div></article>)}</div>
  {adopted>0&&<p className="activity-foot">Cada adoção é uma nova história. 💚</p>}
  </>}
  <p className="activity-disclaimer">O mural mostra apenas informações gerais dos animais. Não divulgamos dados pessoais de adotantes ou responsáveis.</p>
 </div></section>
}
