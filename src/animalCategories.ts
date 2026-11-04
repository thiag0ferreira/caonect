// Categorias do Cãonect — v1 no Distrito Federal.
// Categoria não é sinônimo de autorização legal para transferência.
export const ANIMAL_CATEGORIES=[
 {id:'Cachorros',label:'Cachorros',emoji:'🐶',species:['Cachorro'],review:false},
 {id:'Gatos',label:'Gatos',emoji:'🐱',species:['Gato'],review:false},
 {id:'Aves',label:'Aves',emoji:'🐦',species:['Calopsita','Canário','Periquito','Outra ave'],review:true},
 {id:'Pequenos mamíferos',label:'Pequenos mamíferos',emoji:'🐹',species:['Hamster','Coelho','Porquinho-da-índia','Chinchila','Outro pequeno mamífero'],review:true},
 {id:'Répteis',label:'Répteis',emoji:'🦎',species:['Serpente','Lagarto','Quelônio','Outro réptil'],review:true},
 {id:'Peixes e aquáticos',label:'Peixes e aquáticos',emoji:'🐠',species:['Peixe','Outro animal aquático'],review:true},
 {id:'Outros',label:'Outros',emoji:'🐾',species:['Outro animal'],review:true}
] as const
export type AnimalCategory=(typeof ANIMAL_CATEGORIES)[number]['id']
export const categoryForSpecies=(species:string)=>ANIMAL_CATEGORIES.find(c=>(c.species as readonly string[]).includes(species))?.id||'Outros'
export const categoryLabel=(species:string,cat?:string|null)=>cat||categoryForSpecies(species)
export const speciesForCategory=(cat:string)=>ANIMAL_CATEGORIES.find(c=>c.id===cat)?.species||ANIMAL_CATEGORIES[6].species
export const requiresReview=(cat:string)=>ANIMAL_CATEGORIES.find(c=>c.id===cat)?.review??true
