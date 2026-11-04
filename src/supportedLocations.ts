import {RAS,normalizeRA} from './dfRegions'

export const SUPPORTED_CITIES=[
 {city:'Brasília',state:'DF',label:'Brasília — DF'},
 {city:'Fernandópolis',state:'SP',label:'Fernandópolis — SP'}
] as const
export type SupportedCity='Brasília'|'Fernandópolis'
export type SupportedState='DF'|'SP'
export const DEFAULT_CITY:SupportedCity='Brasília'
export const stateForCity=(city:string):SupportedState=>city==='Fernandópolis'?'SP':'DF'
export const isSupportedCity=(city:string):city is SupportedCity=>SUPPORTED_CITIES.some(c=>c.city===city)
export const neighborhoodLabel=(city:string)=>city==='Brasília'?'Bairro / setor (opcional)':'Bairro / setor em Fernandópolis (opcional)'
export const districtLabel=(city:string)=>city==='Brasília'?'Região Administrativa *':'Bairro / região *'
export const normalizeDistrict=(city:string,district:string)=>city==='Brasília'?(normalizeRA(district)||''):district.trim()
export const districtOptions=(city:string):readonly string[]=>city==='Brasília'?RAS:[]
export const areaDisplay=(city:string,district:string,neighborhood?:string)=>[neighborhood,district,city,stateForCity(city)].filter(Boolean).join(' · ')
export const citiesFilter=[{value:'Todas',label:'Todas as cidades'},...SUPPORTED_CITIES.map(x=>({value:x.city,label:x.label}))]
