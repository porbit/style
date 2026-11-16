import { __unstable__loadDesignSystem } from 'tailwindcss'
import fs from 'node:fs'
const twDir='/home/user/style/node_modules/tailwindcss'
const ds=await __unstable__loadDesignSystem('@import "tailwindcss";',{base:twDir,loadStylesheet:async(id,base)=>({base,path:id,content:fs.readFileSync(twDir+'/'+(id==='tailwindcss'?'index.css':id.replace('tailwindcss/','')),'utf8')})})
const entries=[...ds.variants.entries()]
console.log(entries.length, entries.slice(0,80).map(([n,v])=>`${n}:${v.kind[0]}${v.order}`).join(' '))
console.log('compareFns', [...ds.variants.compareFns.keys()])
const test = (list) => console.log(ds.getClassOrder(list.map(v=>v+':flex')).sort((a,b)=> (a[1]<b[1]?-1:1)).map(x=>x[0].replace(':flex','')).join(' '))
test(['md','sm','lg','max-md','max-sm','min-[600px]','max-[600px]','@md','@sm','@max-md','@min-[300px]','2xl','xl'])
test(['hover','focus','group-hover','peer-hover','group-focus','data-[a=1]','data-[b=1]','data-open','aria-checked','aria-[x=1]','not-hover','has-checked','[&_p]','[@media(x)]','dark','print','rtl','*','before','first'])
test(['group-hover/item','group-hover','group-hover/a','peer-focus/x','group-data-[x]','group-[.x]'])
