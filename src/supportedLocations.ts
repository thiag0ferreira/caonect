import {RAS,normalizeRA} from './dfRegions'

export const SUPPORTED_CITIES=[
 {city:'Brasília',state:'DF',label:'Brasília — DF'},
 {city:'Fernandópolis',state:'SP',label:'Fernandópolis — SP'}
] as const
// Sugestões iniciais fornecidas pela comunidade de Fernandópolis; lista não exaustiva.
// O usuário pode informar outro bairro, loteamento ou zona rural.
export const FERNANDOPOLIS_AREAS=[
  "Centro",
  "Bairro Coester",
  "Brasilândia",
  "Jardim Bela Vista",
  "Jardim Santa Helena",
  "Jardim Santa Rita",
  "Jardim Vista Alegre",
  "Jardim Ipanema",
  "Jardim Imperatriz",
  "Jardim Planalto",
  "Jardim Independente",
  "Vila Veneto",
  "Vila Santa Isabel",
  "Santa Luzia",
  "Terra das Paineiras",
  "Residencial Nova Canaã",
  "Benedito Guedes",
  "Boa Vista",
  "Bom Jesus",
  "Área Rural de Fernandópolis",
  "Área Rural de Brasitânia"
] as const
export const FERNANDOPOLIS_ALIASES:Record<string,string>={'Santa Izabel':'Vila Santa Isabel','Vila Santa Izabel':'Vila Santa Isabel','Coester':'Bairro Coester','Brasitânia':'Área Rural de Brasitânia'}
export type SupportedCity='Brasília'|'Fernandópolis'
export type SupportedState='DF'|'SP'
export const DEFAULT_CITY:SupportedCity='Brasília'
export const stateForCity=(city:string):SupportedState=>city==='Fernandópolis'?'SP':'DF'
export const isSupportedCity=(city:string):city is SupportedCity=>SUPPORTED_CITIES.some(c=>c.city===city)
export const neighborhoodLabel=(city:string)=>city==='Brasília'?'Bairro / setor (opcional)':'Bairro / setor em Fernandópolis (opcional)'
export const districtLabel=(city:string)=>city==='Brasília'?'Região Administrativa *':'Bairro / região *'
export const normalizeDistrict=(city:string,district:string)=>city==='Brasília'?(normalizeRA(district)||''):district.trim()
export const districtOptions=(city:string):readonly string[]=>city==='Brasília'?RAS:FERNANDOPOLIS_AREAS
export const areaDisplay=(city:string,district:string,neighborhood?:string)=>[neighborhood,district,city,stateForCity(city)].filter(Boolean).join(' · ')
export const citiesFilter=[{value:'Todas',label:'Todas as cidades'},...SUPPORTED_CITIES.map(x=>({value:x.city,label:x.label}))]
