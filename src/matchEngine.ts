import type {PetListing} from './supabase'

export type MatchAnswers={
  home:'casa'|'apartamento'|''
  children:'sim'|'nao'|''
  otherPets:'sim'|'nao'|''
  activity:'tranquila'|'moderada'|'ativa'|''
  experience:'primeiro'|'experiente'|''
  time:'pouco'|'medio'|'muito'|''
  size:'Todos'|'Pequeno'|'Médio'|'Grande'
}
export const emptyMatch:MatchAnswers={home:'',children:'',otherPets:'',activity:'',experience:'',time:'',size:'Todos'}
export type MatchResult={pet:PetListing;score:number;reasons:string[];cautions:string[];unknowns:string[];blocked:boolean}
const includes=(traits:string[],...terms:string[])=>traits.some(t=>terms.some(term=>t.toLocaleLowerCase('pt-BR').includes(term)))
export function rankPet(pet:PetListing,answers:MatchAnswers):MatchResult{
  let score=0
  const reasons:string[]=[],cautions:string[]=[],unknowns:string[]=[]
  const traits=pet.personality||[]
  if(answers.size!=='Todos'){
    if(pet.size===answers.size){score+=3;reasons.push('Porte de sua preferência')}
    else cautions.push('Porte diferente do escolhido')
  }
  if(answers.home==='apartamento'&&pet.size==='Grande'){
    cautions.push('Porte grande: avalie o espaço e os passeios necessários')
  }
  if(answers.activity==='tranquila'){
    if(includes(traits,'tranquil','calmo','preguiços')){score+=3;reasons.push('Perfil descrito como tranquilo')}
    if(includes(traits,'ativo','agitado','precisa de espaço'))cautions.push('Pode precisar de mais atividades do que sua rotina permite')
  }
  if(answers.activity==='ativa'){
    if(includes(traits,'ativo','brincalh','explorador')){score+=3;reasons.push('Gosta de atividades e brincadeiras')}
  }
  if(answers.activity==='moderada'&&includes(traits,'dócil','sociável','afetuoso','brincalh')){score+=2;reasons.push('Características sociais informadas')}
  if(answers.time==='pouco'&&includes(traits,'ativo','agitado','carente','precisa de espaço'))cautions.push('Pode demandar mais atenção e tempo')
  if(answers.time==='muito'&&includes(traits,'carente','afetuoso','brincalh')){score+=2;reasons.push('Pode apreciar maior convivência')}
  if(answers.children==='sim'){
    if(includes(traits,'não gosta de crianças'))cautions.push('O cadastro informa que não gosta de crianças: exige avaliação especializada')
    else unknowns.push('Convivência com crianças não foi confirmada')
  }
  if(answers.otherPets==='sim'){
    if(includes(traits,'reativo com outros animais','territorial'))cautions.push('Convivência com outros pets exige avaliação cuidadosa')
    else unknowns.push('Convivência com outros animais não foi confirmada')
  }
  if(answers.experience==='primeiro'){
    if(includes(traits,'dócil','tranquil','calmo')){score+=2;reasons.push('Possui traços descritos como dóceis ou tranquilos')}
    if(includes(traits,'bravo','reativo','agressivo','fujão','territorial'))cautions.push('Pode exigir experiência e orientação profissional')
  }
  if(traits.length===0)unknowns.push('O protetor ainda não informou características comportamentais')
  if(reasons.length===0)unknowns.push('Ainda há poucos dados para sugerir afinidade')
  return {pet,score,reasons,cautions,unknowns,blocked:cautions.some(x=>x.includes('não gosta de crianças')||x.includes('exige avaliação especializada'))}
}
export function rankMatches(pets:PetListing[],answers:MatchAnswers){
 return pets.filter(p=>p.status==='available').map(p=>rankPet(p,answers))
 .sort((a,b)=>Number(a.blocked)-Number(b.blocked)||a.cautions.length-b.cautions.length||b.score-a.score||a.pet.name.localeCompare(b.pet.name,'pt-BR'))
}
