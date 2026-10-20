const assert=require('node:assert/strict'),{test}=require('node:test');
const M=require('../web/assets/hash-lab-model.js');
test('Equal rational values normalize to the same 32-bit hash',()=>{for(const pair of [[2,4],[-1,-2],[100,200]])assert.equal(M.hashRational(...M.normalize(...pair)),858993503);assert.deepEqual(M.normalize(0,-5),[-0,1]);assert.throws(()=>M.normalize(1,0));assert.equal(M.hashRational(99,100),2239);});
test('Byte-sum collision is order-independent, Horner uses order',()=>{assert.equal(M.sum('form'),436);assert.equal(M.sum('from'),436);assert.notEqual(M.trace('form').at(-1).after,M.trace('from').at(-1).after);assert.deepEqual(M.bytes('é'),[195,169]);});
test('Sampling visits powers-of-two positions and intentionally misses others',()=>{assert.deepEqual(M.trace('abcdefghij',true).map(s=>s.index),[0,1,3,7]);assert.equal(M.trace('abcdefghij',true).at(-1).after,M.trace('abXdefghij',true).at(-1).after);assert.deepEqual(M.trace(''),[]);});
