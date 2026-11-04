import sharp from 'sharp'
import {readFile,mkdir} from 'node:fs/promises'
import {join} from 'node:path'
const dir=join(process.cwd(),'public')
await mkdir(dir,{recursive:true})
const icon=await readFile(join(dir,'app-icon.svg'))
const logo=await readFile(join(dir,'brand-logo.svg'))
const outputs=[
 ['icon-192.png',192],['icon-512.png',512],['apple-touch-icon.png',180],
 ['favicon-32.png',32],['favicon-16.png',16]
]
for(const [name,size] of outputs){
 await sharp(icon).resize(size,size).png().toFile(join(dir,name))
}
const safeIcon=await sharp(icon).resize(368,368).png().toBuffer()
await sharp({create:{width:512,height:512,channels:4,background:'#285B4E'}})
 .composite([{input:safeIcon,left:72,top:72}]).png().toFile(join(dir,'icon-maskable-512.png'))
const safeLogo=await sharp(logo).resize({width:300}).png().toBuffer()
const background=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#F7F4EE"/>
<rect width="1200" height="28" fill="#285B4E"/>
<path d="M0 540 Q250 460 590 555 T1200 520 V630 H0Z" fill="#DCEBE3"/>
<circle cx="1030" cy="95" r="100" fill="#DCEBE3" opacity=".65"/>
<text x="470" y="300" font-family="Arial,sans-serif" font-size="106" font-weight="bold" fill="#285B4E">Cãonect</text>
<text x="474" y="380" font-family="Arial,sans-serif" font-size="39" fill="#4A2600">Encontros que viram família</text>
<text x="474" y="435" font-family="Arial,sans-serif" font-size="26" fill="#285B4E">Adoção responsável no Distrito Federal</text>
</svg>`)
await sharp(background).composite([{input:safeLogo,left:95,top:177}]).png().toFile(join(dir,'og-image.png'))
console.log('Ícones PWA, Apple Touch, favicon e imagem social gerados em public/')
