/* Isolated, non-interactive slide previews; never included in chat context. */
(() => {
  'use strict';
  window.WestlakeThumbnails = class {
    constructor({slides, navigate, current}) {
      this.slides = slides; this.navigate = navigate; this.current = current;
      const make = (tag, cls, text) => { const el=document.createElement(tag); el.className=cls; if(text)el.textContent=text; return el; };
      this.launcher=make('button','thumb-launcher'); this.launcher.type='button';
      this.launcher.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9 3v18M3 9h6M3 15h6" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';
      this.launcher.setAttribute('aria-controls','thumbnailPanel');
      this.panel=make('aside','thumb-panel'); this.panel.id='thumbnailPanel'; this.panel.hidden=true;
      const header=make('div','thumb-header'); this.heading=make('h2',''); this.heading.id='thumbnailHeading';
      this.panel.setAttribute('aria-labelledby',this.heading.id);
      this.closeButton=make('button','thumb-close','×'); this.closeButton.type='button';
      header.append(this.heading,this.closeButton); this.list=make('div','thumb-list');
      this.panel.append(header,this.list); document.body.append(this.launcher,this.panel);
      this.buttons=slides.map((slide,index)=>{
        const button=make('button','thumb-item'); button.type='button';
        const preview=make('div','thumb-preview'); preview.setAttribute('aria-hidden','true');
        const caption=make('div','thumb-caption',`${index+1} · ${slide.dataset.title||''}`);
        button.append(preview,caption); this.list.append(button);
        button.onclick=()=>{navigate(index); if(matchMedia('(max-width: 600px)').matches)this.close();};
        return button;
      });
      this.launcher.onclick=()=>this.panel.hidden?this.open():this.close();
      this.closeButton.onclick=()=>this.close();
      this.panel.addEventListener('keydown',event=>{
        if(event.key==='Escape'){event.preventDefault();this.close();}
        const index=this.buttons.indexOf(event.target);
        const offset={ArrowDown:1,ArrowRight:1,ArrowUp:-1,ArrowLeft:-1}[event.key];
        if(index>=0 && (offset || event.key==='Home' || event.key==='End')){
          event.preventDefault();
          this.buttons[event.key==='Home'?0:event.key==='End'?slides.length-1:Math.max(0,Math.min(slides.length-1,index+offset))].focus();
        }
        event.stopPropagation();
      });
      document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!this.panel.hidden)this.close();});
      window.addEventListener('ppt-language-change',()=>this.localize());
      let timer; window.addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!this.panel.hidden)this.render();},160);});
      this.localize(); this.update(current());
    }
    localize(){
      const en=window.PPTI18n.language==='en';
      this.heading.textContent=en?'Slides':'幻灯片缩略图';
      this.launcher.title=en?'Slide thumbnails':'幻灯片缩略图';
      this.launcher.setAttribute('aria-label',this.launcher.title);
      this.launcher.setAttribute('aria-expanded',String(!this.panel.hidden));
      this.closeButton.setAttribute('aria-label',en?'Close thumbnails':'关闭缩略图');
      this.buttons.forEach((button,i)=>button.setAttribute('aria-label',`${en?'Slide':'第'} ${i+1}${en?'':' 页'} · ${this.slides[i].dataset.title||''}`));
    }
    render(){
      const width=this.slides[0].clientWidth, height=this.slides[0].clientHeight;
      if(!width||!height)return;
      const styles=Array.from(document.querySelectorAll('head style'),el=>el.textContent).join('\n');
      this.buttons.forEach((button,i)=>{
        const preview=button.firstElementChild;
        preview.style.height=`${preview.clientWidth*height/width}px`;
        const shadow=preview.shadowRoot||preview.attachShadow({mode:'open'});
        const css=document.createElement('style');
        css.textContent=styles+'\n.deck{position:relative!important;width:'+width+'px!important;height:'+height+'px!important;transform:scale('+preview.clientWidth/width+');transform-origin:top left}.slide{opacity:1!important;transform:none!important;transition:none!important;pointer-events:none!important}.presenter-notes{display:none!important}[data-editable]{outline:none!important}';
        const deck=document.createElement('div');deck.className='deck';deck.inert=true;
        const clone=this.slides[i].cloneNode(true);clone.classList.add('active');clone.classList.remove('before');clone.removeAttribute('aria-hidden');
        clone.querySelectorAll('script,iframe,object,embed,.presenter-notes').forEach(el=>el.remove());
        [clone,...clone.querySelectorAll('*')].forEach(el=>{el.removeAttribute('contenteditable');for(const attr of [...el.attributes])if(attr.name.startsWith('on'))el.removeAttribute(attr.name);});
        deck.append(clone); shadow.replaceChildren(css,deck);
      });
    }
    open(){this.panel.hidden=false;this.localize();this.render();this.update(this.current());this.buttons[this.current()].focus({preventScroll:true});}
    close(){this.panel.hidden=true;this.localize();this.launcher.focus({preventScroll:true});}
    update(index){this.buttons.forEach((button,i)=>{button.setAttribute('aria-current',String(i===index));});if(!this.panel.hidden)this.buttons[index].scrollIntoView({block:'nearest'});}
  };
})();
