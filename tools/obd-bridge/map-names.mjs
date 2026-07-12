#!/usr/bin/env node
/** Read each module's name (22 F1 97) + part number (22 F1 87). READ-ONLY. */
import { SerialPort } from 'serialport';
const PORT = process.argv[2] || '/dev/cu.usbserial-1110';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
// req→resp from the full-car sweep (physical addresses; 700 functional dropped).
const MODULES = [
  ['70B','775'],['70C','776'],['70D','777'],['70E','778'],['710','77A'],['712','77C'],
  ['713','77D'],['714','77E'],['715','77F'],['71E','788'],['725','78F'],['729','793'],
  ['72D','797'],['746','7B0'],['752','7BC'],['753','7BD'],['754','7BE'],['755','7BF'],
  ['76F','7D9'],['773','7DD'],['7E0','7E8'],['7F1','7F9'],
];
class Elm {
  constructor(p){this.port=p;this.buf='';this.w=[];p.on('data',c=>{this.buf+=c.toString('utf8');if(this.buf.includes('>')){const o=this.buf.replace(/>/g,'').trim();this.buf='';const w=this.w.shift();if(w){clearTimeout(w.t);w.res(o);}}});}
  send(cmd,to=2500){return new Promise(res=>{const t=setTimeout(()=>{const i=this.w.findIndex(x=>x.t===t);if(i>=0)this.w.splice(i,1);res('__TIMEOUT__');},to);this.w.push({res,t});this.port.write(`${cmd}\r`);});}
}
const hx=s=>(s||'').replace(/[^0-9A-Fa-f]/g,'').toUpperCase();
function decode(resp,did){const h=hx(resp);const i=h.indexOf('62'+did);if(i<0)return '';const body=h.slice(i+6);let s='';for(let p=0;p+2<=body.length;p+=2){const n=parseInt(body.slice(p,p+2),16);if(n>=32&&n<127)s+=String.fromCharCode(n);else if(s&&n===0)break;}return s.trim();}
async function main(){
  const port=new SerialPort({path:PORT,baudRate:38400,autoOpen:false});
  await new Promise((res,rej)=>port.open(e=>e?rej(e):res()));
  const elm=new Elm(port);await delay(400);
  for(const c of ['ATZ','ATE0','ATL0','ATS0','ATSP6','ATCAF1','ATH0'])await elm.send(c,c==='ATZ'?3000:1200);
  console.log('\nreq→resp   name (22F197)            part# (22F187)\n');
  for(const [req,resp] of MODULES){
    await elm.send(`ATSH${req}`);await elm.send(`ATCRA${resp}`);
    const name=decode(await elm.send('22F197',2500),'F197')||decode(await elm.send('22F19E',2500),'F19E');
    const part=decode(await elm.send('22F187',2500),'F187');
    console.log(`  ${req}→${resp}   ${(name||'—').padEnd(24)} ${part||'—'}`);
  }
  await new Promise(res=>port.close(res));
  console.log('\nDone.');
}
main().catch(e=>{console.error('Failed:',e.message);process.exit(1);});
