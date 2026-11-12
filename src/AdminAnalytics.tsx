import {useEffect,useMemo,useState} from 'react'
import {BarChart3,CalendarDays,Download,HeartHandshake,Info,MapPin,PawPrint,RefreshCw,Users} from 'lucide-react'
import {supabase} from './supabase'
import './adminAnalytics.css'

type Summary={
 users_total:number;adopters:number;protectors:number;ngos:number;
 pets_total:number;pets_available:number;pets_adopted_declared:number;pets_pending:number;
 lost_active:number;found_active:number;lost_resolved_declared:number;found_resolved_declared:number;
 pending_reports:number;reunion_avg_days:number|null
}
type City={city:string;users:number;pets:number;adopted_declared:number;lost_active:number;lost_resolved_declared:number}
type Month={month:string;users:number;pets:number;alerts:number;reunions_declared:number;adoption_marks:number}
type Analytics={generated_at:string;months:number;summary:Summary;cities:City[];monthly:Month[]}
type Metric='users'|'pets'|'alerts'|'reunions_declared'
const metrics:{key:Metric;label:string}[]=[
 {key:'users',label:'Novos usuários'},
 {key:'pets',label:'Pets cadastrados'},
 {key:'alerts',label:'Novos alertas'},
 {key:'reunions_declared',label:'Reencontros declarados'}
]
const format=(value:number|null|undefined)=>typeof value==='number'&&Number.isFinite(value)?value.toLocaleString('pt-BR'):'—'
const monthLabel=(value:string)=>{
 const [year,month]=value.split('-').map(Number)
 return new Date(year,month-1,1).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}).replace('.','')
}
const asNumber=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?n:0
const asData=(v:unknown):Analytics|null=>{
 if(!v||typeof v!=='object')return null
 const a=v as Partial<Analytics>
 if(!a.summary||!Array.isArray(a.monthly)||!Array.isArray(a.cities))return null
 return a as Analytics
}

function ExportCsv({data}:{data:Analytics}){
 const save=()=>{
  const header='Mes;Novos usuarios;Pets cadastrados;Novos alertas;Reencontros declarados;Marcacoes de adocao'
  const lines=data.monthly.map(r=>[r.month,r.users,r.pets,r.alerts,r.reunions_declared,r.adoption_marks].join(';'))
  const blob=new Blob(['\uFEFF'+[header,...lines].join('\r\n')],{type:'text/csv;charset=utf-8'})
  const url=URL.createObjectURL(blob)
  const link=document.createElement('a')
  link.href=url;link.download='caonect-indicadores-'+data.months+'-meses.csv';link.click()
  window.setTimeout(()=>URL.revokeObjectURL(url),1000)
 }
 return <button type="button" className="secondary" onClick={save}><Download size={16}/> Exportar CSV</button>
}

export default function AdminAnalytics({refreshSignal}:{refreshSignal:number}){
 const [months,setMonths]=useState<6|12>(6)
 const [metric,setMetric]=useState<Metric>('users')
 const [data,setData]=useState<Analytics|null>(null)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [version,setVersion]=useState(0)
 useEffect(()=>{
  if(!supabase)return
  let mounted=true
  setLoading(true);setError('')
  supabase.rpc('caonect_admin_analytics',{p_months:months})
   .then(({data:result,error:rpcError})=>{
    if(!mounted)return
    if(rpcError){setError(rpcError.message);setData(null);return}
    const parsed=asData(result)
    if(!parsed){setError('Resposta de indicadores inválida. Verifique o SQL do DIFF 007.7.');setData(null)}
    else setData(parsed)
   }).catch(e=>{if(mounted){setError(e instanceof Error?e.message:'Falha na consulta.');setData(null)}})
   .finally(()=>{if(mounted)setLoading(false)})
  return()=>{mounted=false}
 },[months,refreshSignal,version])
 const max=useMemo(()=>Math.max(1,...(data?.monthly||[]).map(x=>asNumber(x[metric]))),[data,metric])
 const lastUpdated=data?.generated_at?new Date(data.generated_at).toLocaleString('pt-BR'):''
 const s=data?.summary
 return <section className="ca-growth" aria-label="Indicadores de crescimento do Cãonect">
  <header className="ca-growth-header">
   <div><span className="kicker"><BarChart3 size={16}/> INDICADORES DE IMPACTO</span><h2>Panorama do Cãonect</h2><p>Dados agregados reais do Supabase, disponíveis somente para administradores autorizados.</p></div>
   <div className="ca-growth-controls">
    <label>Período dos gráficos
     <select value={months} onChange={e=>setMonths(Number(e.target.value) as 6|12)}><option value={6}>Últimos 6 meses</option><option value={12}>Últimos 12 meses</option></select>
    </label>
    <button type="button" className="secondary" onClick={()=>setVersion(v=>v+1)} disabled={loading}><RefreshCw size={16}/> Atualizar</button>
    {data&&<ExportCsv data={data}/>}
   </div>
  </header>
  {loading&&<div className="ca-growth-loading" role="status"><BarChart3 size={25}/> Consultando indicadores…</div>}
  {error&&!loading&&<div className="ca-growth-error" role="alert">
   <strong>Não foi possível carregar os indicadores.</strong>
   <p>{error}</p>
   <p>Se a função ainda não existe, execute <code>supabase/diff-0077-analytics.sql</code> no Supabase do Cãonect.</p>
   <button type="button" className="secondary" onClick={()=>setVersion(v=>v+1)}>Tentar novamente</button>
  </div>}
  {!loading&&data&&s&&<>
   <div className="ca-growth-updated"><CalendarDays size={14}/> Dados consultados em {lastUpdated} (horário exibido no seu dispositivo). Contadores são totais atuais, independentemente do período selecionado.</div>
   <div className="ca-growth-kpis">
    <article><Users size={21}/><span>Usuários cadastrados</span><strong>{format(s.users_total)}</strong><small>{format(s.adopters)} adotantes · {format(s.protectors)} protetores · {format(s.ngos)} ONGs</small></article>
    <article><PawPrint size={21}/><span>Pets disponíveis (aprovados)</span><strong>{format(s.pets_available)}</strong><small>{format(s.pets_total)} animais cadastrados no total</small></article>
    <article><HeartHandshake size={21}/><span>Marcados como adotados</span><strong>{format(s.pets_adopted_declared)}</strong><small>Informação declarada pelo responsável</small></article>
    <article><MapPin size={21}/><span>Perdidos ainda ativos</span><strong>{format(s.lost_active)}</strong><small>{format(s.found_active)} anúncios ativos de encontrados</small></article>
    <article><HeartHandshake size={21}/><span>Reencontros declarados</span><strong>{format(s.lost_resolved_declared)}</strong><small>Apenas alertas do tipo “Perdi meu pet”</small></article>
    <article><CalendarDays size={21}/><span>Tempo médio declarado</span><strong>{s.reunion_avg_days===null?'—':s.reunion_avg_days.toLocaleString('pt-BR',{maximumFractionDigits:1})+' dias'}</strong><small>Entre a data do desaparecimento e a marcação de reencontro</small></article>
   </div>
   <div className="ca-growth-note"><Info size={17}/><span>“Adotado” e “Reencontrado” são estados declarados pelos responsáveis; não constituem adoções ou reencontros verificados pelo Cãonect. O indicador de reencontros utiliza somente anúncios de animais perdidos marcados como resolvidos, evitando somar anúncios de encontrados como se fossem novos reencontros.</span></div>
   <div className="ca-growth-panels">
    <section className="ca-growth-panel">
     <div className="ca-growth-panel-head"><h3>Evolução mensal</h3><p>Movimentação por mês, não acumulada.</p></div>
     <div className="ca-growth-switch" role="group" aria-label="Indicador do gráfico">
      {metrics.map(m=><button type="button" key={m.key} aria-pressed={metric===m.key} className={metric===m.key?'selected':''} onClick={()=>setMetric(m.key)}>{m.label}</button>)}
     </div>
     <div className="ca-growth-bars" role="img" aria-label={metrics.find(m=>m.key===metric)?.label+': '+data.monthly.map(m=>monthLabel(m.month)+' '+format(m[metric])).join(', ')}>
      {data.monthly.map((m,i)=><div className="ca-growth-month" key={m.month}>
       <span className="ca-growth-value">{format(m[metric])}</span>
       <div className="ca-growth-track"><div className="ca-growth-bar" style={{height:(asNumber(m[metric])/max*100)+'%'}}/></div>
       <span className="ca-growth-month-label">{monthLabel(m.month)}</span>
      </div>)}
     </div>
     <div className="ca-growth-table-wrapper"><table><caption>Dados mensais detalhados</caption><thead><tr><th>Mês</th><th>Usuários</th><th>Pets</th><th>Alertas</th><th>Reencontros*</th><th>Adoções marcadas*</th></tr></thead>
      <tbody>{data.monthly.map(m=><tr key={m.month}><th scope="row">{monthLabel(m.month)}</th><td>{format(m.users)}</td><td>{format(m.pets)}</td><td>{format(m.alerts)}</td><td>{format(m.reunions_declared)}</td><td>{format(m.adoption_marks)}</td></tr>)}</tbody>
     </table></div>
     <p className="ca-growth-small">* Reencontros por data de resolução do alerta perdido. Adoções marcadas por eventos de alteração de status, sujeitos a reversões. Não representam resultados auditados.</p>
    </section>
    <section className="ca-growth-panel">
     <div className="ca-growth-panel-head"><h3>Crescimento por cidade</h3><p>Todos os registros desde o início da plataforma.</p></div>
     {data.cities.filter(c=>c.city!=='Outras / não informada'||c.users+c.pets+c.lost_active+c.lost_resolved_declared>0).map(c=><article className="ca-growth-city" key={c.city}>
       <h4>{c.city}</h4>
       <div className="ca-growth-city-line"><span>Usuários</span><strong>{format(c.users)}</strong><div className="ca-growth-progress"><i style={{width:(100*c.users/Math.max(1,...data.cities.map(x=>x.users)))+'%'}}/></div></div>
       <div className="ca-growth-city-line"><span>Pets cadastrados</span><strong>{format(c.pets)}</strong><div className="ca-growth-progress"><i style={{width:(100*c.pets/Math.max(1,...data.cities.map(x=>x.pets)))+'%'}}/></div></div>
       <div className="ca-growth-city-facts"><span>Marcados adotados: <strong>{format(c.adopted_declared)}</strong></span><span>Perdidos ativos: <strong>{format(c.lost_active)}</strong></span><span>Reencontros declarados: <strong>{format(c.lost_resolved_declared)}</strong></span></div>
      </article>)}
     <p className="ca-growth-small">Localização baseada na cidade informada no cadastro, sem coordenadas ou endereços precisos. Os totais por cidade são independentes entre usuários, animais e alertas.</p>
    </section>
   </div>
  </>}
 </section>
}
