import sharp from 'sharp'; import fs from 'node:fs';
const [,, out, ...dirs] = process.argv; const W=234, H=506;
const comps=[]; dirs.forEach((d,r)=>fs.readdirSync(d).filter(f=>f.endsWith('.jpg')).sort().forEach((f,c)=>comps.push({d:d+'/'+f,r,c})));
const cols=Math.max(...comps.map(x=>x.c))+1;
const inputs=await Promise.all(comps.map(async x=>({input:await sharp(x.d).resize(W,H).toBuffer(),left:x.c*(W+6),top:x.r*(H+6)})));
await sharp({create:{width:cols*(W+6),height:dirs.length*(H+6),channels:3,background:'#f0f'}}).composite(inputs).jpeg({quality:80}).toFile(out);
