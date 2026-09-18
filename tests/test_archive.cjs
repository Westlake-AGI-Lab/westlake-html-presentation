const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const vendor={module:{exports:{}},exports:{},TextDecoder,TextEncoder,Uint8Array,Uint16Array,Uint32Array,Int32Array};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../assets/vendor/fflate/fflate.js'),'utf8'),vendor);
const fflate=vendor.module.exports;
const context={window:{},fflate,Uint8Array,DataView,TextDecoder,TextEncoder};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../assets/archive.js'),'utf8'),context);
const {unpack}=context.window.PPTArchiveTools;
const valid={'manifest.json':fflate.strToU8('{"version":1}'),'conversations.json':fflate.strToU8('[]')};
assert.equal(fflate.strFromU8(unpack(fflate.zipSync(valid, {level:0}))['conversations.json']),'[]');
assert.equal(fflate.strFromU8(unpack(fflate.zipSync(valid))['conversations.json']),'[]');
assert.throws(()=>unpack(fflate.zipSync({...valid,'../secret':fflate.strToU8('x')})));
assert.throws(()=>unpack(fflate.zipSync({...valid,'attachments/a.png':new Uint8Array(1024*1024+1)},{level:0})));
assert.throws(()=>unpack(fflate.zipSync({'manifest.json':new Uint8Array(3*1024*1024)})));
assert.throws(()=>unpack(fflate.zipSync({})));
assert.throws(()=>unpack(fflate.zipSync(valid).subarray(0,20)));
console.log('Archive ZIP validation checks passed');
(async()=>{
  const archive=Object.create(context.window.LearningArchive.prototype);
  let stored;
  Object.assign(archive,{enabled:true,db:{},queue:Promise.resolve(),lastWrite:0,current:{id:'test'},status:{},
    chat:{messages:[{id:'m',role:'assistant',text:'partial',status:'streaming',time:'2026-09-17',privateCredential:'must-not-be-serialized',images:[{id:'i',name:'image',dataUrl:'data:image/png;base64,AAAA'}]}]},
    tx:async(mode,fn)=>fn({put:value=>{stored=value;return value;}})});
  assert.equal(await archive.save(true),true);
  assert.equal(stored.messages[0].status,'stopped');
  assert.equal(stored.messages[0].images.length,1);
  assert.equal(stored.messages[0].privateCredential,undefined);
  archive.tx=async()=>{throw Error('QuotaExceededError');};
  assert.equal(await archive.save(true),false);
  assert.match(archive.status.textContent,/QuotaExceededError/);
  assert.equal(archive.chat.messages[0].images.length,1);
  console.log('Local save serialization and quota-failure checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
