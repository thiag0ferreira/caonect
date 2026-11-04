import {useState,type ReactNode} from 'react'
import {createRoot} from 'react-dom/client'
import {Heart,Search,House,UserRound,ClipboardList,ArrowRight,ShieldCheck,Sparkles,X,Menu,PawPrint,MessageCircle} from 'lucide-react'
import CommunityPets from './CommunityPets'
import ActivityFeed from './ActivityFeed'
import './activity.css'
import Portal from './Portal'
import {Conversations,useCurrentUser} from './Interactions'
import './style.css'
import './interactions.css'

type Page='Início'|'Explorar'|'Favoritos'|'Adoções'|'Perfil'
const nav:{name:Page;icon:ReactNode}[]=[{name:'Início',icon:<House/>},{name:'Explorar',icon:<Search/>},{name:'Favoritos',icon:<Heart/>},{name:'Adoções',icon:<ClipboardList/>},{name:'Perfil',icon:<UserRound/>}]
function App(){
 const [page,setPage]=useState<Page>('Início')
 const [query,setQuery]=useState(''),[location,setLocation]=useState(''),[species,setSpecies]=useState('Todos'),[size,setSize]=useState('Todos'),[menu,setMenu]=useState(false)
 const user=useCurrentUser()
 const go=(p:Page)=>{setPage(p);setMenu(false);window.scrollTo({top:0,behavior:'smooth'})}
 const cardProps={user,onLogin:()=>go('Perfil'),onChat:()=>go('Adoções')}
 return <div className="app">
 <header className="header"><div className="header-inner"><button className="brand" onClick={()=>go('Início')}><span className="brand-icon"><img src={import.meta.env.BASE_URL+'favicon.svg'} alt="Cãonect"/></span><span><strong>Cãonect</strong><small>Encontros que viram família</small></span></button><nav className="desktop-nav">{nav.map(n=><button key={n.name} className={page===n.name?'active':''} onClick={()=>go(n.name)}>{n.name}</button>)}</nav><button className="header-help" onClick={()=>go('Perfil')}>{user?'Minha conta':'Quero ajudar'} <Heart size={16}/></button><button className="menu-toggle" onClick={()=>setMenu(!menu)} aria-label="Abrir menu">{menu?<X/>:<Menu/>}</button></div>{menu&&<nav className="mobile-drop">{nav.map(n=><button key={n.name} onClick={()=>go(n.name)}>{n.name}</button>)}</nav>}</header>
 <main>
 {page==='Início'&&<><section className="hero"><div className="hero-inner"><div><span className="eyebrow"><Sparkles size={16}/> ADOÇÃO COM PROPÓSITO</span><h1>Um encontro pode <em>mudar duas vidas.</em></h1><p>Seu novo melhor amigo pode estar mais perto do que você imagina. Conheça animais reais esperando um lar.</p><div className="hero-actions"><button className="primary" onClick={()=>go('Explorar')}>Encontrar meu pet <ArrowRight size={18}/></button><button className="secondary" onClick={()=>go('Perfil')}>Quero divulgar um pet</button></div><div className="proof"><span><ShieldCheck size={17}/> Adoção responsável</span><span><Heart size={17}/> Conexões reais</span></div></div><div className="hero-photo"><div className="hero-illustration"><PawPrint size={115}/><span>Uma nova amizade começa aqui ♡</span></div><div className="floating">♥ Um novo amigo te espera!</div></div></div></section>
 <section className="search-wrap"><div className="search-panel"><h2>Quem você está procurando?</h2><div className="search-fields"><label>Nome ou característica<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ex.: dócil, curioso..." onKeyDown={e=>e.key==='Enter'&&go('Explorar')}/></label><label>Região<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Ex.: Ceilândia, DF" onKeyDown={e=>e.key==='Enter'&&go('Explorar')}/></label><button className="primary" onClick={()=>go('Explorar')}>Buscar pets <Search size={17}/></button></div></div></section>
 <section className="section"><div className="section-heading"><div><span className="kicker">CONHEÇA NOSSOS AMIGOS</span><h2>Esperando por você ♡</h2><p>Animais reais cadastrados por protetores e ONGs.</p></div><button className="link-button" onClick={()=>go('Explorar')}>Ver todos <ArrowRight size={18}/></button></div><CommunityPets mode="featured" limit={4} {...cardProps}/></section><ActivityFeed/>
 <section className="how"><div className="section"><span className="kicker">SIMPLES COMO UM ABRAÇO</span><h2>Como funciona a adoção?</h2><div className="steps"><article><Search size={34}/><h3>1. Encontre</h3><p>Explore animais cadastrados por protetores e ONGs.</p></article><article><MessageCircle size={34}/><h3>2. Conecte-se</h3><p>Converse com o responsável de forma privada.</p></article><article><House size={34}/><h3>3. Acolha</h3><p>Converse sobre os próximos passos da adoção responsável.</p></article></div></div></section></>}
 {page==='Explorar'&&<section className="section page"><span className="kicker">UM AMIGO PARA CADA JEITO</span><h1>Encontre seu par de patas</h1><p>Pets cadastrados de verdade, atualizados pelos responsáveis.</p><div className="filters"><input placeholder="Nome ou personalidade" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Espécie" value={species} onChange={e=>setSpecies(e.target.value)}><option>Todos</option><option>Cachorro</option><option>Gato</option></select><select aria-label="Porte" value={size} onChange={e=>setSize(e.target.value)}><option value="Todos">Todos os portes</option><option>Pequeno</option><option>Médio</option><option>Grande</option></select><input placeholder="Cidade ou região" value={location} onChange={e=>setLocation(e.target.value)}/><button className="secondary" onClick={()=>{setQuery('');setLocation('');setSpecies('Todos');setSize('Todos')}}>Limpar</button></div><CommunityPets mode="explore" query={query} location={location} species={species} size={size} {...cardProps}/></section>}
 {page==='Favoritos'&&<section className="section page"><span className="kicker">GUARDADOS NO CORAÇÃO</span><h1>Meus favoritos</h1><p>{user?'Seus pets favoritos estão salvos na sua conta.':'Entre na sua conta para salvar seus pets favoritos.'}</p>{!user&&<button className="primary" onClick={()=>go('Perfil')}>Entrar ou cadastrar</button>}<CommunityPets mode="favorites" {...cardProps}/></section>}
 {page==='Adoções'&&<Conversations user={user} onLogin={()=>go('Perfil')}/>}
 {page==='Perfil'&&<Portal/>}
 </main>
 <footer><strong>Cãonect ♡</strong><span>Encontros que viram família · Adoção responsável</span></footer>
 <nav className="bottom-nav">{nav.map(n=><button className={page===n.name?'active':''} key={n.name} onClick={()=>go(n.name)}>{n.icon}<small>{n.name}</small></button>)}</nav>
 </div>
}
createRoot(document.getElementById('root')!).render(<App/>)
