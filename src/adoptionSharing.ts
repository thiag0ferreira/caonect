import type {PetListing} from './supabase'
import {stateForCity} from './supportedLocations'

export const PET_LINK_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Link público permanente do anúncio, nunca da URL de prévia do Cloudflare. */
export const adoptionLink=(id:string)=>'https://www.caonect.com.br/?pet='+encodeURIComponent(id)

export const isPetShareable=(pet:PetListing)=>pet.status==='available'&&pet.review_status==='approved'&&PET_LINK_RE.test(pet.id)

export const adoptionShareText=(pet:PetListing)=>{
 const location=[pet.district,pet.city+'/'+stateForCity(pet.city)].filter(Boolean).join(', ')
 return '🐾 '+pet.name+' está disponível para adoção! 💚\n'+
        '📍 '+location+'\n'+
        'Conheça o pet e converse com o responsável pelo Cãonect:\n'+adoptionLink(pet.id)+'\n'+
        '#AdoçãoResponsável #Cãonect'
}
