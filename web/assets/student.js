import { motion } from './student-integrations.js';
// Credentials are submitted only to the same-origin authentication endpoint.
const form = document.querySelector('#loginForm');
const id = document.querySelector('#studentId');
const password = document.querySelector('#password');
const status = document.querySelector('#loginStatus');
const toggle = document.querySelector('#togglePassword');
function resetVisibility() {
  password.type = 'password'; toggle.textContent = 'Show'; toggle.setAttribute('aria-pressed', 'false');
}
function clearErrors() {
  for (const [input, error] of [[id, 'idError'], [password, 'passwordError']]) {
    input.removeAttribute('aria-invalid'); document.getElementById(error).textContent = '';
  }
  status.textContent = '';
}
motion.reveal([document.querySelector('.intro .eyebrow'),document.querySelector('.intro h1'),document.querySelector('.intro .lead'),document.querySelector('.login-card')]);
motion.reveal([...document.querySelectorAll('.hero-entry')],{stagger:70,duration:450,rise:14});
toggle.addEventListener('click', () => {
  const show = password.type === 'password'; password.type = show ? 'text' : 'password'; toggle.textContent = show ? 'Hide' : 'Show'; toggle.setAttribute('aria-pressed', String(show));
});
form.addEventListener('input', clearErrors);
form.addEventListener('submit', async event => {
  event.preventDefault(); clearErrors();
  const submit = form.querySelector('[type=submit]');
  submit.disabled = true;
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({id: id.value, password: password.value})
    });
    const data = await response.json();
    if (!response.ok) throw new Error();
    id.value = ''; password.value = ''; resetVisibility();
    motion.navigate(data.redirect);
  } catch (_) {
    status.textContent = 'Incorrect ID or password';
    password.value = ''; resetVisibility(); id.focus(); motion.error(status);
  } finally { submit.disabled = false; }
});
window.addEventListener('pagehide', () => { id.value = ''; password.value = ''; resetVisibility(); });
