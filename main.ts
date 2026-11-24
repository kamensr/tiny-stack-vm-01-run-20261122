// Tiny stack VM for make.fun tiny-stack-vm-01: runs each /input/<id>/program.bin
// on input.bin, writes /output/<id>/stdout.bin + exit.txt. 32-bit wrapping ints,
// 256-value stack, 64-deep calls, 256 words memory, traps 2..11, 1M step cap.
import {mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';

// Per-opcode pack, one char per byte 0x00..0x53: charCode-48 = imm*16+pops*4+pushes,
// '!' = no such opcode.
const T='0Aq46:;?!!!!!!!!999999959995999!999!!!!!!!!!!!!!PTTP0!!!!!!!!!!!58!!!!!!!!!!!!!!4414';

function run(p,g){
  const D=new Int32Array(256),C=new Int32Array(64),M=new Int32Array(256),O=new Uint8Array(65536);
  let sp=0,cp=0,pc=0,st=0,ol=0,ip=0,code=0;
  L:for(;;){
    if(st===1e6){code=10;break;}
    if(pc<0||pc>=p.length){code=9;break;}
    const op=p[pc],k=T.charCodeAt(op)-48;
    if(!(k>=0)){code=5;break;}
    const im=k>>4,po=(k>>2)&3,pu=k&3;
    if(pc+im>=p.length){code=9;break;}
    st++;
    const nx=pc+1+im;
    if(sp<po){code=2;break;}
    if(sp-po+pu>256){code=3;break;}
    pc=nx;
    if(op>15&&op<35&&op!==23&&op!==27){
      const b=D[sp-1],a=D[sp-2];
      let r;
      if(op>18&&op<23&&!b){code=4;break;}
      if(op===16)r=(a+b)|0;
      else if(op===17)r=(a-b)|0;
      else if(op===18)r=Math.imul(a,b);
      else if(op===19)r=(a/b)|0;
      else if(op===20)r=a%b|0;
      else if(op===21)r=Math.floor((a>>>0)/(b>>>0))|0;
      else if(op===22)r=(a>>>0)%(b>>>0)|0;
      else if(op===24)r=a&b;
      else if(op===25)r=a|b;
      else if(op===26)r=a^b;
      else if(op===28)r=a<<(b&31);
      else if(op===29)r=a>>(b&31);
      else if(op===30)r=(a>>>(b&31))|0;
      else if(op===32)r=a===b?1:0;
      else if(op===33)r=a<b?1:0;
      else r=(a>>>0)<(b>>>0)?1:0;
      sp-=2;D[sp++]=r;
    }else switch(op){
      case 0:break L;
      case 1:D[sp++]=(p[nx-1]<<24)>>24;break;
      case 2:D[sp++]=p[nx-4]|p[nx-3]<<8|p[nx-2]<<16|p[nx-1]<<24;break;
      case 3:sp--;break;
      case 4:D[sp]=D[sp-1];sp++;break;
      case 5:{const t=D[sp-1];D[sp-1]=D[sp-2];D[sp-2]=t;break;}
      case 6:D[sp]=D[sp-2];sp++;break;
      case 7:{const a=D[sp-3];D[sp-3]=D[sp-2];D[sp-2]=D[sp-1];D[sp-1]=a;break;}
      case 23:D[sp-1]=-D[sp-1]|0;break;
      case 27:D[sp-1]=~D[sp-1];break;
      case 48:case 49:case 50:{
        const r=((p[nx-2]|p[nx-1]<<8)<<16)>>16;
        let t=op===48;
        if(op>48){const v=D[--sp];t=op===49?v===0:v!==0;}
        if(t)pc=nx+r;break;
      }
      case 51:if(cp===64){code=7;break L;}C[cp++]=nx;pc=p[nx-2]|p[nx-1]<<8;break;
      case 52:if(cp===0){code=8;break L;}pc=C[--cp];break;
      case 64:{const a=D[sp-1];if(a<0||a>255){code=6;break L;}D[sp-1]=M[a];break;}
      case 65:{const a=D[sp-1],v=D[sp-2];if(a<0||a>255){code=6;break L;}sp-=2;M[a]=v;break;}
      case 80:{
        const s=String(D[sp-1]);
        if(ol+s.length>65536){code=11;break L;}
        sp--;for(let i=0;i<s.length;i++)O[ol++]=s.charCodeAt(i);break;
      }
      case 81:if(ol+1>65536){code=11;break L;}O[ol++]=D[--sp]&255;break;
      case 82:D[sp++]=ip<g.length?g[ip++]:-1;break;
      case 83:code=D[--sp]&255;break L;
    }
  }
  return[O.subarray(0,ol),code];
}

const I=process.env.MAKEFUN_INPUT_DIR??'/input';
const O=process.env.MAKEFUN_OUTPUT_DIR??'/output';
for(const id of readdirSync(I).sort()){
  const r=run(readFileSync(I+'/'+id+'/program.bin'),readFileSync(I+'/'+id+'/input.bin'));
  mkdirSync(O+'/'+id,{recursive:true});
  writeFileSync(O+'/'+id+'/stdout.bin',r[0]);
  writeFileSync(O+'/'+id+'/exit.txt',r[1]+'\n');
}
