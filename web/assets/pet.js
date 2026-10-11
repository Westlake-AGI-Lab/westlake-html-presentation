(() => {
 const agentLauncher = document.getElementById('agentLauncher');
 if (!agentLauncher) return;
 agentLauncher.innerHTML = "    <span class=\"pet-greeting\" id=\"petGreeting\" lang=\"zh-CN\">\n      <strong id=\"petGreetingTitle\">你好，我是小西。</strong>\n      <span id=\"petGreetingQuestion\">有什么可以帮你？</span>\n    </span>\n    <span class=\"agent-pet\" aria-hidden=\"true\">\n      <img class=\"pet-idle\" src=\"assets/pet-idle.png\" alt=\"\" width=\"106\" height=\"132\">\n      <img class=\"pet-blink\" src=\"assets/pet-blink.png\" alt=\"\" width=\"106\" height=\"132\">\n      <img class=\"pet-walk\" src=\"assets/pet-walk.png\" alt=\"\" width=\"106\" height=\"132\">\n      <img class=\"pet-inspect\" src=\"assets/pet-inspect.png\" alt=\"\" width=\"106\" height=\"132\">\n    </span>\n    <span class=\"agent-launcher-copy\">问问这份 PPT</span>";
 const avatar = document.querySelector('.agent-avatar');
 if (avatar) avatar.innerHTML = '<img src="assets/pet-idle.png" alt="" width="42" height="52">';
 agentLauncher.addEventListener('touchend', event => event.stopPropagation());
      const petPositionKey = 'westlake-pet-position-v1';
      let petDrag = null;
      let suppressPetClick = false;
      const petGreeting = document.getElementById('petGreeting');
      function updatePetLanguage() {
        const english = document.documentElement.lang.toLowerCase().startsWith('en');
        petGreeting.lang = english ? 'en' : 'zh-CN';
        document.getElementById('petGreetingTitle').textContent = english ? "Hello, I'm Xiaoxi." : '你好，我是小西。';
        document.getElementById('petGreetingQuestion').textContent = english ? 'How can I help you?' : '有什么可以帮你？';
        agentLauncher.querySelector('.agent-launcher-copy').textContent = english ? 'Ask Xiaoxi' : '问问这份 PPT';
        agentLauncher.setAttribute('aria-label', english ? 'Open presentation assistant' : '打开 PPT 智能讲解');
        agentLauncher.title = english ? 'Open presentation assistant (A)' : '打开 PPT 智能讲解（A）';
        positionPetGreeting();
      }
      window.addEventListener('ppt-language-change', updatePetLanguage);
      document.addEventListener('DOMContentLoaded', updatePetLanguage);
      function positionPetGreeting() {
        const rect = agentLauncher.getBoundingClientRect();
        const width = petGreeting.offsetWidth;
        const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
        petGreeting.style.left = `${left - rect.left}px`;
        petGreeting.style.right = 'auto';
        const height = petGreeting.offsetHeight;
        const preferredTop = rect.top >= height + 20 ? rect.top - height - 12 : rect.bottom + 12;
        const top = Math.max(8, Math.min(preferredTop, window.innerHeight - height - 8));
        petGreeting.style.top = `${top - rect.top}px`;
        petGreeting.style.bottom = 'auto';
      }
      function placePet(x, y) {
        const margin = 8;
        const left = Math.max(margin, Math.min(x, window.innerWidth - agentLauncher.offsetWidth - margin));
        const top = Math.max(margin, Math.min(y, window.innerHeight - agentLauncher.offsetHeight - margin));
        Object.assign(agentLauncher.style, { left: `${left}px`, top: `${top}px`, right: 'auto', bottom: 'auto' });
        positionPetGreeting();
        return { x: left, y: top };
      }
      function savePetPosition(position) {
        try { localStorage.setItem(petPositionKey, JSON.stringify(position)); } catch (_) {}
      }
      try {
        const saved = JSON.parse(localStorage.getItem(petPositionKey));
        if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) placePet(saved.x, saved.y);
      } catch (_) {}
      agentLauncher.addEventListener('pointerdown', (event) => {
        if (!event.isPrimary || event.button !== 0) return;
        const rect = agentLauncher.getBoundingClientRect();
        suppressPetClick = false;
        petDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
        agentLauncher.setPointerCapture(event.pointerId);
      });
      agentLauncher.addEventListener('pointermove', (event) => {
        if (!petDrag || petDrag.id !== event.pointerId) return;
        const dx = event.clientX - petDrag.x;
        const dy = event.clientY - petDrag.y;
        if (!petDrag.moved && Math.hypot(dx, dy) < 6) return;
        petDrag.moved = true;
        agentLauncher.classList.add('pet-dragging');
        placePet(petDrag.left + dx, petDrag.top + dy);
      });
      function finishPetDrag(event) {
        if (!petDrag || petDrag.id !== event.pointerId) return;
        suppressPetClick = petDrag.moved;
        if (petDrag.moved) {
          const rect = agentLauncher.getBoundingClientRect();
          savePetPosition(placePet(rect.left, rect.top));
        }
        petDrag = null;
        agentLauncher.classList.remove('pet-dragging');
        if (agentLauncher.hasPointerCapture(event.pointerId)) agentLauncher.releasePointerCapture(event.pointerId);
      }
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((name) => agentLauncher.addEventListener(name, finishPetDrag));
      agentLauncher.addEventListener('click', (event) => {
        // Pointer release after dragging must not open the conversation.
        if (suppressPetClick && event.detail !== 0) {
          suppressPetClick = false;
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }

      }, true);
      window.addEventListener('resize', () => {
        if (!agentLauncher.style.left) { positionPetGreeting(); return; }
        const rect = agentLauncher.getBoundingClientRect();
        savePetPosition(placePet(rect.left, rect.top));
      });
      updatePetLanguage();

})();
