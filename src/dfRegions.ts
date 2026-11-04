export const CITY='Brasília'
export const RAS=[
'Plano Piloto','Gama','Taguatinga','Brazlândia','Sobradinho','Planaltina','Paranoá','Núcleo Bandeirante','Ceilândia','Guará','Cruzeiro','Samambaia','Santa Maria','São Sebastião','Recanto das Emas','Lago Sul','Riacho Fundo','Lago Norte','Candangolândia','Águas Claras','Riacho Fundo II','Sudoeste/Octogonal','Varjão','Park Way','SCIA/Estrutural','Sobradinho II','Jardim Botânico','Itapoã','SIA','Vicente Pires','Fercal','Sol Nascente/Pôr do Sol','Arniqueira','Arapoanga','Água Quente'
] as const
export function normalizeRA(value:string):string{
 const v=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
 if(v.includes('ceil')||v==='p sul'||v==='p norte'||v.includes('qnm'))return 'Ceilândia'
 if(v.includes('sol nascente')||v.includes('por do sol'))return 'Sol Nascente/Pôr do Sol'
 if(v.includes('estrutural')||v.includes('scia'))return 'SCIA/Estrutural'
 if(v.includes('sudoeste')||v.includes('octogonal'))return 'Sudoeste/Octogonal'
 return RAS.find(ra=>ra.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()===v)||''
}
