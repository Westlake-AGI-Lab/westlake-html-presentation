/* Local-only learning archive. Explicit whitelist serialization, no credentials. */
(() => {
  'use strict';
  const L=(zh,en)=>window.PPTI18n?.language==='en'?en:zh;
  const uid=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
  const LIMIT=100*1024*1024;
  function fingerprint(value){let hash=2166136261;for(const char of value){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16);}
  function download(bytes,name,type){const url=URL.createObjectURL(new Blob([bytes],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function unpack(bytes){
    if(bytes.length>LIMIT)throw Error('ZIP exceeds 100 MiB / 档案过大');
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
    for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(view.getUint32(i,true)===0x06054b50&&i+22+view.getUint16(i+20,true)===bytes.length){end=i;break;}}
    if(end<0||view.getUint16(end+8,true)>1000||view.getUint16(end+4,true)!==0||view.getUint32(end+16,true)+view.getUint32(end+12,true)!==end)throw Error('Invalid ZIP directory / ZIP 目录损坏');
    const files=Object.create(null);let total=0,count=0,pending=0;
    const unzip=new fflate.Unzip(file=>{
      if(++count>1000||!(/^(manifest\.json|conversations\.json|attachments\/[a-zA-Z0-9_-]+\.(png|jpg|webp))$/).test(file.name)||Object.hasOwn(files,file.name))throw Error('Invalid ZIP path / 档案路径无效');
      if(file.originalSize>LIMIT || (file.originalSize>1024*1024 && file.size && file.originalSize/file.size>200))throw Error('Suspicious compression / 异常压缩');
      files[file.name]=null;pending++;let chunks=[],size=0;
      file.ondata=(err,chunk,final)=>{
        if(err)throw err;size+=chunk.length;total+=chunk.length;
        if(total>LIMIT||size>(file.name.startsWith('attachments/')?1024*1024:20*1024*1024)){file.terminate();throw Error('Expanded archive too large / 解压文件过大');}
        chunks.push(chunk);if(final){const data=new Uint8Array(size);let offset=0;for(const part of chunks){data.set(part,offset);offset+=part.length;}files[file.name]=data;chunks=[];pending--;}
      };file.start();
    });
    unzip.register(fflate.UnzipInflate);
    for(let offset=0;offset<bytes.length;offset+=1024)unzip.push(bytes.subarray(offset,offset+1024),offset+1024>=bytes.length);
    if(pending||count!==view.getUint16(end+10,true)||!files['manifest.json']||!files['conversations.json'])throw Error('Incomplete archive / 档案不完整');
    return files;
  }
  async function imageFrom(bytes,path){
    const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
    const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
    const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
    const type=png?'image/png':jpg?'image/jpeg':webp?'image/webp':'';
    if(!type||!path.endsWith(png?'.png':jpg?'.jpg':'.webp'))throw Error('Invalid image type / 图片格式不符');
    const blob=new Blob([bytes],{type}), bitmap=await createImageBitmap(blob).catch(()=>{throw Error('Damaged image / 图片损坏');});
    const valid=bitmap.width<=2048&&bitmap.height<=2048;bitmap.close();if(!valid)throw Error('Image dimensions exceed 2048 / 图片尺寸过大');
    return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});
  }
  function cleanMessage(m){
    return {id:m.id||uid(),role:m.role,text:m.text,meta:m.meta||'',status:m.status==='streaming'?'stopped':m.status||'complete',
      time:m.time||new Date().toISOString(),page:m.page?{number:m.page.number,title:m.page.title}:null,language:m.language||'zh',
      error:m.error||'',imageCount:m.images?.length||m.imageCount||0,images:(m.images||[]).map(i=>({id:i.id||uid(),name:i.name,dataUrl:i.dataUrl}))};
  }
  window.PPTArchiveTools={unpack,fingerprint};
  window.LearningArchive=class{
    constructor(chat){this.chat=chat;this.queue=Promise.resolve();this.current=null;this.db=null;this.enabled=false;this.lastWrite=0;this.deck=chat.storageKey;this.room=new URLSearchParams(location.search).get('room')||'solo';this.key=this.deck+':'+this.room;this.mount();}
    mount(){
      const b=document.createElement('button');b.className='chat-action';b.id='archiveOpen';b.onclick=()=>this.open();document.querySelector('.chat-tools').append(b);
      this.status=document.createElement('p');this.status.className='archive-status';this.status.setAttribute('role','status');document.querySelector('.agent-composer').append(this.status);
      this.dialog=document.createElement('dialog');this.dialog.className='archive-dialog';document.body.append(this.dialog);
      this.dialog.addEventListener('keydown',e=>e.stopPropagation());
      const labels=()=>{b.textContent=L('学习档案','Learning archive');this.chat.panel.querySelector('.chat-privacy').textContent=L('图片会发送给 API 服务商；启用档案后文字和图片保存在本机浏览器。停止不保证立即停止计费。','Images are sent to the API provider. With archives enabled, text and images are saved in this browser. Stopping may not stop billing immediately.');};
      labels();window.addEventListener('ppt-language-change',labels);
    }
    async init(){
      this.chat.processing=true;this.chat.controls();
      try{
        this.enabled=localStorage.getItem('ppt-archive-consent')==='yes';
        if(!this.enabled){this.status.textContent=L('仅本次会话；打开学习档案可启用本机保存。','Session only; open Learning archive to enable local saving.');return;}
        this.db=await new Promise((resolve,reject)=>{const req=indexedDB.open('westlake-learning',1);req.onupgradeneeded=()=>req.result.createObjectStore('sessions',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('Database blocked'));});
        const all=(await this.all()).filter(x=>x.key===this.key).sort((a,b)=>b.updated.localeCompare(a.updated));
        if(all.length){this.current=all[0];this.replace(this.current.messages);}
        else{this.fresh(false);await this.save(true);}
        this.status.textContent=L('已保存到本机','Saved on this device');
      }catch(e){this.status.textContent=L('保存不可用，当前仅会话内保留：','Local storage unavailable; session only: ')+e.message;this.enabled=false;}
      finally{this.chat.processing=false;this.chat.controls();}
    }
    async tx(mode,fn){if(!this.db)throw Error('Storage unavailable');return new Promise((resolve,reject)=>{const tx=this.db.transaction('sessions',mode);const req=fn(tx.objectStore('sessions'));let value;req.onsuccess=()=>value=req.result;tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Storage aborted'));});}
    all(){return this.tx('readonly',s=>s.getAll());}
    fresh(reset=true){this.current={id:uid(),key:this.key,deck:this.deck,room:this.room,fingerprint:fingerprint(JSON.stringify(this.chat.getContext().slides)),name:L('新对话','New conversation'),created:new Date().toISOString(),updated:new Date().toISOString(),messages:[]};if(reset)this.replace([]);}
    replace(messages){this.chat.messages=messages.map(cleanMessage);this.chat.pending=[];this.chat.lastRequest=null;this.chat.log.querySelectorAll('.agent-message').forEach(n=>n.remove());this.chat.messages.forEach(m=>this.chat.addRow(m));this.chat.drawPending();this.chat.controls();}
    save(force=false){
      if(!this.enabled||!this.db)return Promise.resolve(false);
      if(!force&&Date.now()-this.lastWrite<1000)return this.queue;
      if(!this.current)this.fresh(false);this.lastWrite=Date.now();
      const value={...this.current,updated:new Date().toISOString(),messages:this.chat.messages.map(cleanMessage)};this.current=value;
      this.queue=this.queue.catch(()=>{}).then(()=>this.tx('readwrite',s=>s.put(value))).then(()=>{this.status.textContent=L('已保存到本机','Saved on this device');return true;}).catch(e=>{this.status.textContent=L('保存失败，请下载备份：','Save failed; download a backup: ')+e.message;return false;});return this.queue;
    }
    async enable(){localStorage.setItem('ppt-archive-consent','yes');await this.init();}
    async open(){
      if(this.chat.busy||this.chat.processing){this.status.textContent=L('请先停止生成或等待操作完成','Stop generation or wait for the operation to finish');return;}
      this.dialog.replaceChildren();const add=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;this.dialog.append(n);return n;};
      const action=(text,fn)=>{const b=add('button',text);b.onclick=async()=>{try{await fn();}catch(e){this.status.textContent=e.message;alert(e.message);}};return b;};
      add('h2',L('本机学习档案','Local learning archive'));
      add('p',L('文字与压缩图片保存在本机浏览器，清理浏览器可能丢失；请下载 ZIP 独立备份。共用电脑上的其他使用者可能访问这些记录。图片提问仍会发送到配置的 API 服务商，私聊不会自动分享给教师。','Text and compressed images are stored in this browser and may be lost if browser data is cleared. Download ZIP backups. Other people using this browser may access these records. Image questions still go to the configured API provider; private chats are not automatically shared with teachers.'));
      action(L('关闭','Close'),()=>this.dialog.close());
      if(!this.enabled){action(L('同意并启用本机保存','Agree and enable local saving'),async()=>{await this.enable();await this.open();});}
      else{
        action(L('新建对话（保留历史）','New conversation (keep history)'),async()=>{await this.save(true);this.fresh();await this.save(true);await this.open();});
        action(L('重命名当前对话','Rename current'),async()=>{const name=prompt(L('对话名称','Conversation title'),this.current?.name);if(name?.trim()){this.current.name=name.trim().slice(0,100);await this.save(true);await this.open();}});
        action(L('删除当前会话附件','Delete current attachments'),async()=>{if(confirm(L('永久删除本机会话中的图片？','Permanently delete images in this local conversation?'))){this.replace(this.chat.messages.map(m=>({...m,imageCount:m.images?.length||m.imageCount,images:[]})));await this.save(true);}});
        action(L('删除当前会话','Delete current conversation'),async()=>{if(confirm(L('永久删除当前本机会话？','Permanently delete this local conversation?'))){await this.queue;await this.tx('readwrite',s=>s.delete(this.current.id));this.fresh();await this.save(true);await this.open();}});
        action(L('清空全部本机档案','Delete all local archives'),async()=>{if(confirm(L('删除本浏览器所有稿件的学习档案？此操作无法撤销。','Delete learning archives for ALL decks in this browser? This cannot be undone.'))){await this.queue;await this.tx('readwrite',s=>s.clear());this.fresh();await this.save(true);await this.open();}});
      }
      action(L('下载当前完整 ZIP','Download current ZIP'),()=>this.exportZip());
      action(L('导出 Markdown','Export Markdown'),()=>this.chat.export());
      const upload=add('input','');upload.type='file';upload.accept='.zip';upload.setAttribute('aria-label','导入学习档案 / Import learning archive');upload.onchange=async()=>{try{if(upload.files[0])await this.importZip(upload.files[0]);await this.open();}catch(e){alert(e.message);}upload.value='';};
      if(this.db){
        add('h3',L('全部本机历史（稿件 / 课堂）','All local history (deck / class)'));
        for(const item of (await this.all()).sort((a,b)=>b.updated.localeCompare(a.updated))){
          action(`${item.name} · ${item.room} · ${item.deck} · ${new Date(item.updated).toLocaleString()}`,async()=>{
            const different=item.key!==this.key;
            if(different&&!confirm(L('来自其他稿件或课堂。复制为当前课堂的新会话继续？原记录保留，页码可能不匹配。','Different deck or class. Copy into a new conversation here? The original stays unchanged; slide references may not match.')))return;
            await this.save(true);
            this.current=different?{...item,id:uid(),key:this.key,deck:this.deck,room:this.room,created:new Date().toISOString()}:item;
            this.replace(item.messages);await this.save(true);this.dialog.close();
          });
        }
      }
      if(!this.dialog.open)this.dialog.showModal();
    }
    async exportZip(){
      const conversation={...(this.current||{id:uid(),deck:this.deck,room:this.room,name:'Conversation'}),messages:this.chat.messages.map(cleanMessage)};
      delete conversation.key;const files={};let total=0, imageNumber=0;
      for(const m of conversation.messages){for(const image of m.images){const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(image.dataUrl);if(!match)throw Error('Invalid image');const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));total+=bytes.length;if(total>LIMIT)throw Error('Archive exceeds 100 MiB');const path=`attachments/${++imageNumber}.${match[1]==='jpeg'?'jpg':match[1]}`;files[path]=bytes;image.path=path;delete image.dataUrl;}}
      files['manifest.json']=fflate.strToU8(JSON.stringify({format:'westlake-learning',version:1,created:new Date().toISOString(),deck:this.deck,fingerprint:conversation.fingerprint}));
      files['conversations.json']=fflate.strToU8(JSON.stringify([conversation]));
      if(Object.keys(files).length>1000||Object.values(files).reduce((n,v)=>n+v.length,0)>LIMIT)throw Error('Archive exceeds export limits');
      download(fflate.zipSync(files,{level:0}),'learning-'+new Date().toISOString().slice(0,10)+'.zip','application/zip');
    }
    async importZip(file){
      if(file.size>LIMIT)throw Error('ZIP exceeds 100 MiB');
      const files=unpack(new Uint8Array(await file.arrayBuffer()));const manifest=JSON.parse(fflate.strFromU8(files['manifest.json']));
      if(manifest.format!=='westlake-learning'||manifest.version!==1)throw Error('Unsupported archive version / 不支持的档案版本');
      const sessions=JSON.parse(fflate.strFromU8(files['conversations.json']));if(!Array.isArray(sessions)||!sessions.length||sessions.length>100)throw Error('Invalid conversations');
      const imported=[];
      for(const source of sessions){
        if(!Array.isArray(source.messages)||source.messages.length>10000)throw Error('Invalid messages');
        const messages=[];
        for(const m of source.messages){
          if(!m||!['user','assistant'].includes(m.role)||typeof m.text!=='string'||m.text.length>200000||!Array.isArray(m.images)||m.images.length>3)throw Error('Invalid message');
          const images=[];for(const i of m.images){if(!i||typeof i.path!=='string'||!i.path.startsWith('attachments/')||!files[i.path])throw Error('Missing attachment');images.push({id:uid(),name:String(i.name||'image').slice(0,200),dataUrl:await imageFrom(files[i.path],i.path)});}
          messages.push(cleanMessage({id:uid(),role:m.role,text:m.text,meta:String(m.meta||'').slice(0,1000),status:['complete','error','stopped'].includes(m.status)?m.status:'stopped',time:typeof m.time==='string'?m.time:new Date().toISOString(),language:m.language==='en'?'en':'zh',page:m.page&&Number.isInteger(m.page.number)&&m.page.number>0?{number:m.page.number,title:String(m.page.title||'').slice(0,200)}:null,images,imageCount:Math.max(images.length,Math.min(3,Number(m.imageCount)||0))}));
        }
        imported.push({id:uid(),key:this.key,deck:this.deck,room:this.room,name:String(source.name||'Imported').slice(0,100)+' (import)',fingerprint:source.fingerprint,created:new Date().toISOString(),updated:new Date().toISOString(),messages});
      }
      const mismatch=manifest.deck!==this.deck||manifest.fingerprint!==fingerprint(JSON.stringify(this.chat.getContext().slides));
      if(!confirm(`${L('导入新会话数量','New conversations to import')}: ${imported.length}\n${mismatch?L('稿件或版本不同，页码可能不匹配。','Different deck/version; slide references may not match.'):''}\n${L('文字和图片将保存在本机。确认？','Text and images will be saved locally. Confirm?')}`))return;
      if(!this.enabled)await this.enable();if(!this.db||!this.enabled)throw Error('Local saving unavailable');
      await this.save(true);for(const item of imported){item.updated=new Date().toISOString();await this.tx('readwrite',s=>s.put(item));}this.current=imported[0];this.replace(this.current.messages);await this.save(true);
    }
  };
})();
