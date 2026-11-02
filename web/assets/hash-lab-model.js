/* Guided algorithms use explicit unsigned 32-bit arithmetic, like the runnable C++ examples. */
(function(root){
'use strict';
const prime=429496751;
function hashRational(a,b){return ((a>>>0)+Math.imul(prime,b>>>0))>>>0;}
function normalize(a,b){if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||Math.abs(a)>1000000||Math.abs(b)>1000000||!b)throw Error('Use integer values from −1000000 to 1000000 and a nonzero denominator.');let x=Math.abs(a),y=Math.abs(b);while(y){[x,y]=[y,x%y];}const g=x||1;return [a/g*(b<0?-1:1),Math.abs(b)/g];}
function bytes(text){return [...new TextEncoder().encode(text)];}
function trace(text,sampled=false){const values=bytes(text);let h=0;return values.flatMap((v,i)=>{if(sampled&&((i+1)&i)!==0)return [];const before=h;h=(Math.imul(12347,h)+v)>>>0;return [{index:i,byte:v,before,after:h}];});}
function sum(text){return bytes(text).reduce((a,b)=>(a+b)>>>0,0);}
const api={hashRational,normalize,bytes,trace,sum};if(typeof module!=='undefined')module.exports=api;root.HashLabMath=api;
})(globalThis);
