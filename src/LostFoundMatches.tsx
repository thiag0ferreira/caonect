import {ArrowRight,CalendarDays,MapPin,ShieldCheck,Sparkles} from 'lucide-react'
import type {LostFoundAlert} from './lostFound'
import {lostFoundPhoto} from './lostFound'
import {stateForCity} from './supportedLocations'
import type {MatchSuggestion} from './lostFoundMatching'
import './lostFoundMatches.css'

type Props={
 suggestions:MatchSuggestion[]
 onOpen:(alert:LostFoundAlert)=>void
 context:'detail'|'central'
}

function Candidate({alert,onOpen}: {alert:LostFoundAlert;onOpen:(alert:LostFoundAlert)=>void}){
 const lost=alert.alert_type==='lost'
 const date=new Date(alert.event_date.slice(0,10)+'T12:00:00')
 return <article className="lf-match-candidate">
  <img loading="lazy" src={lostFoundPhoto(alert.photo_paths[0])} alt={'Foto do anúncio '+(alert.pet_name||'animal encontrado')}/>
  <div className="lf-match-candidate-body">
   <span className={'lf-tag '+(lost?'lost':'found')}>{lost?'PERDIDO':'ENCONTRADO'}</span>
   <strong>{alert.pet_name||'Animal encontrado'}</strong>
   <small><MapPin size={13}/>{alert.district}, {alert.city}/{stateForCity(alert.city)}</small>
   <small><CalendarDays size={13}/>{date.toLocaleDateString('pt-BR')}</small>
   <button type="button" onClick={()=>onOpen(alert)}>Ver anúncio <ArrowRight size={15}/></button>
  </div>
 </article>
}

export default function LostFoundMatches({suggestions,onOpen,context}:Props){
 if(context==='detail'&&suggestions.length===0)return null
 return <section className="lf-match-section" aria-label="Possíveis correspondências entre pets">
  <header className="lf-match-heading">
   <span className="kicker"><Sparkles size={16}/> CÃONECT — POSSÍVEIS REENCONTROS</span>
   <h2>{context==='detail'?'Outros anúncios que podem ter relação':'Sugestões de reencontro'}</h2>
   <p>Comparamos características declaradas, cidade, região e datas. São <strong>pistas para investigar</strong>, nunca confirmação de que é o mesmo animal. As fotos não são comparadas automaticamente.</p>
  </header>
  {!suggestions.length?
   <div className="lf-match-empty"><Sparkles size={28}/><h3>Nenhuma correspondência sugerida por enquanto</h3><p>Isso não significa que seu animal não tenha sido encontrado. Continue acompanhando a central e compartilhando seu anúncio.</p></div>
   :<div className="lf-match-list">{suggestions.map(match=><article key={match.lost.id+'-'+match.found.id} className="lf-match-pair">
     <div className="lf-match-pair-top"><Sparkles size={17}/><strong>{match.level==='more'?'Vários sinais em comum':'Possível correspondência'}</strong><span>Verifique com o responsável</span></div>
     <div className="lf-match-pair-animals">
      <Candidate alert={match.lost} onOpen={onOpen}/>
      <Candidate alert={match.found} onOpen={onOpen}/>
     </div>
     <div className="lf-match-reasons">
      <strong>Por que apareceu esta sugestão?</strong>
      <ul>{match.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>
      {match.cautions.length>0&&<div className="lf-match-cautions"><strong>Informações que precisam ser conferidas:</strong><ul>{match.cautions.map(reason=><li key={reason}>{reason}</li>)}</ul></div>}
     </div>
    </article>)}</div>}
  <p className="lf-match-disclaimer"><ShieldCheck size={17}/> Compare fotos, marcas particulares e histórico diretamente com o responsável. Não entregue um animal sem verificar o vínculo; não divulgue endereço exato, telefone ou documentos.</p>
  <p className="lf-match-scope">Sugestões calculadas localmente com os alertas públicos recentes carregados nesta página (até 200). Não há reconhecimento facial, cobrança nem notificações automáticas nesta etapa.</p>
 </section>
}
