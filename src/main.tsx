import {useState,type ReactNode} from 'react'
import {createRoot} from 'react-dom/client'
import {Heart,Search,House,UserRound,ClipboardList,ArrowRight,ShieldCheck,Sparkles,X,Menu,PawPrint,MessageCircle} from 'lucide-react'
import CommunityPets from './CommunityPets'
import MatchCaonect from './MatchCaonect'
import ActivityFeed from './ActivityFeed'
import './activity.css'
import './gallery.css'
import {RAS} from './dfRegions'
import {SUPPORTED_CITIES} from './supportedLocations'
import {ANIMAL_CATEGORIES} from './animalCategories'
import Portal from './Portal'
import {Conversations,useCurrentUser} from './Interactions'
import './style.css'
import './interactions.css'

type Page='Início'|'Explorar'|'Match'|'Favoritos'|'Adoções'|'Perfil'
const nav:{name:Page;icon:ReactNode}[]=[{name:'Início',icon:<House/>},{name:'Explorar',icon:<Search/>},{name:'Match',icon:<Sparkles/>},{name:'Favoritos',icon:<Heart/>},{name:'Adoções',icon:<ClipboardList/>},{name:'Perfil',icon:<UserRound/>}]
function App(){
 const [page,setPage]=useState<Page>('Início')
 const [cityFilter,setCityFilter]=useState('Todas')
 const [query,setQuery]=useState(''),[location,setLocation]=useState(''),[species,setSpecies]=useState('Todos'),[size,setSize]=useState('Todos'),[menu,setMenu]=useState(false)
 const user=useCurrentUser()
 const go=(p:Page)=>{setPage(p);setMenu(false);window.scrollTo({top:0,behavior:'smooth'})}
 const cardProps={user,onLogin:()=>go('Perfil'),onChat:()=>go('Adoções')}
 const selectCity=(value:string)=>{setCityFilter(value);setLocation('')}
 const exploreMatch=(petName:string,city?:string)=>{setQuery(petName);setCityFilter(city||'Todas');setLocation('');setSpecies('Todos');setSize('Todos');go('Explorar')}
 return <div className="app">
 <header className="header"><div className="header-inner"><button className="brand" onClick={()=>go('Início')}><span className="brand-icon"><img src={import.meta.env.BASE_URL+'brand-logo.svg'} alt="Cãonect"/></span><span><strong>Cãonect</strong><small>Encontros que viram família</small></span></button><nav className="desktop-nav">{nav.map(n=><button key={n.name} className={page===n.name?'active':''} onClick={()=>go(n.name)}>{n.name}</button>)}</nav><button className="header-help" onClick={()=>go('Perfil')}>{user?'Minha conta':'Quero ajudar'} <Heart size={16}/></button><button className="menu-toggle" onClick={()=>setMenu(!menu)} aria-label="Abrir menu">{menu?<X/>:<Menu/>}</button></div>{menu&&<nav className="mobile-drop">{nav.map(n=><button key={n.name} onClick={()=>go(n.name)}>{n.name}</button>)}</nav>}</header>
 <main>
 {page==='Início'&&<><section className="hero"><div className="hero-inner"><div><span className="eyebrow"><Sparkles size={16}/> ADOÇÃO COM PROPÓSITO</span><h1>Um encontro pode <em>mudar duas vidas.</em></h1><p>Seu novo melhor amigo pode estar mais perto do que você imagina. Conheça animais reais esperando um lar.</p><div className="hero-actions"><button className="primary" onClick={()=>go('Explorar')}>Encontrar meu pet <ArrowRight size={18}/></button><button className="secondary" onClick={()=>go('Perfil')}>Quero divulgar um pet</button></div><div className="proof"><span><ShieldCheck size={17}/> Adoção responsável</span><span><Heart size={17}/> Conexões reais</span></div></div><div className="hero-photo"><div className="hero-illustration"><PawPrint size={115}/><span>Uma nova amizade começa aqui ♡</span></div><div className="floating">♥ Um novo amigo te espera!</div></div></div></section>
 <section className="search-wrap"><div className="search-panel"><h2>Quem você está procurando?</h2><div className="search-fields"><label>Nome ou característica<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ex.: dócil, curioso..." onKeyDown={e=>e.key==='Enter'&&go('Explorar')}/></label><label>Cidade<select value={cityFilter} onChange={e=>selectCity(e.target.value)}><option value="Todas">Todas as cidades</option>{SUPPORTED_CITIES.map(c=><option value={c.city} key={c.city}>{c.label}</option>)}</select></label>{cityFilter==='Brasília'&&<label>Região Administrativa<select value={location} onChange={e=>setLocation(e.target.value)}><option value="">Todas as regiões</option>{RAS.map(ra=><option key={ra} value={ra}>{ra}</option>)}</select></label>}<button className="primary" onClick={()=>go('Explorar')}>Buscar pets <Search size={17}/></button></div></div></section>
 <section className="section animal-categories"><span className="kicker">TODAS AS FORMAS DE AMOR</span><h2>Quem espera por um lar?</h2><div className="category-buttons">{ANIMAL_CATEGORIES.map(c=><button key={c.id} type="button" onClick={()=>{setSpecies(c.id);setQuery('');go('Explorar')}}><span>{c.emoji}</span><strong>{c.label}</strong></button>)}</div><small>Espécies que exigem documentação e revisão só aparecem após aprovação do anúncio.</small></section>
 <section className="section"><div className="section-heading"><div><span className="kicker">CONHEÇA NOSSOS AMIGOS</span><h2>Esperando por você ♡</h2><p>Animais reais cadastrados por protetores e ONGs.</p></div><button className="link-button" onClick={()=>go('Explorar')}>Ver todos <ArrowRight size={18}/></button></div><CommunityPets mode="featured" limit={4} {...cardProps}/></section><ActivityFeed/>
 <section className="match-home-banner"><div className="section"><div><span className="kicker">SEU NOVO MELHOR AMIGO</span><h2>Não sabe por onde começar?</h2><p>Responda algumas perguntas sobre sua rotina e descubra animais para conhecer melhor.</p></div><button className="primary" onClick={()=>go('Match')}>Fazer meu Match <Sparkles size={17}/></button></div></section><section className="how"><div className="section"><span className="kicker">SIMPLES COMO UM ABRAÇO</span><h2>Como funciona a adoção?</h2><div className="steps"><article><Search size={34}/><h3>1. Encontre</h3><p>Explore animais cadastrados por protetores e ONGs.</p></article><article><MessageCircle size={34}/><h3>2. Conecte-se</h3><p>Converse com o responsável de forma privada.</p></article><article><House size={34}/><h3>3. Acolha</h3><p>Converse sobre os próximos passos da adoção responsável.</p></article></div></div></section></>}
 {page==='Explorar'&&<section className="section page"><span className="kicker">UM AMIGO PARA CADA JEITO</span><h1>Encontre seu par de patas</h1><p>Animais de Brasília e Fernandópolis, atualizados pelos responsáveis.</p><div className="filters"><input placeholder="Nome ou personalidade" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Categoria animal" value={species} onChange={e=>setSpecies(e.target.value)}><option value="Todos">Todas as categorias</option>{ANIMAL_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}</select><select aria-label="Porte" value={size} onChange={e=>setSize(e.target.value)}><option value="Todos">Todos os portes</option><option>Pequeno</option><option>Médio</option><option>Grande</option></select><select aria-label="Cidade" value={cityFilter} onChange={e=>selectCity(e.target.value)}><option value="Todas">Todas as cidades</option>{SUPPORTED_CITIES.map(c=><option key={c.city} value={c.city}>{c.label}</option>)}</select>{cityFilter==='Brasília'?<select aria-label="Região Administrativa" value={location} onChange={e=>setLocation(e.target.value)}><option value="">Todas as RAs do DF</option>{RAS.map(ra=><option key={ra} value={ra}>{ra}</option>)}</select>:cityFilter==='Fernandópolis'?<input aria-label="Bairro em Fernandópolis" placeholder="Bairro em Fernandópolis" value={location} onChange={e=>setLocation(e.target.value)}/>:null}<button className="secondary" onClick={()=>{setQuery('');setLocation('');setCityFilter('Todas');setSpecies('Todos');setSize('Todos')}}>Limpar</button></div><CommunityPets mode="explore" cityFilter={cityFilter} query={query} location={location} species={species} size={size} {...cardProps}/></section>}
 {page==='Match'&&<MatchCaonect onExplore={exploreMatch}/>}
 {page==='Favoritos'&&<section className="section page"><span className="kicker">GUARDADOS NO CORAÇÃO</span><h1>Meus favoritos</h1><p>{user?'Seus pets favoritos estão salvos na sua conta.':'Entre na sua conta para salvar seus pets favoritos.'}</p>{!user&&<button className="primary" onClick={()=>go('Perfil')}>Entrar ou cadastrar</button>}<CommunityPets mode="favorites" {...cardProps}/></section>}
 {page==='Adoções'&&<Conversations user={user} onLogin={()=>go('Perfil')}/>}
 {page==='Perfil'&&<Portal/>}
 </main>
 <footer><div className="footer-brand"><img src={import.meta.env.BASE_URL+'brand-logo.svg'} alt="Cão e gato do Cãonect"/><strong>Cãonect ♡</strong></div><span>Encontros que viram família · Adoção responsável</span></footer>
 <nav className="bottom-nav">{nav.map(n=><button className={page===n.name?'active':''} key={n.name} onClick={()=>go(n.name)}>{n.icon}<small>{n.name}</small></button>)}</nav>
 </div>
}
createRoot(document.getElementById('root')!).render(<App/>)
