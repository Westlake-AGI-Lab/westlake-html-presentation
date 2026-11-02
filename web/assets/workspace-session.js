// Account type stays server-side; only the destination and basic profile are returned.
export async function signOut(event) {
  event?.preventDefault();
  const response = await fetch('/api/auth/logout', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'});
  if (response.ok) location.replace('/student.html');
}
export async function session() {
  const response = await fetch('/api/auth/session');
  if (!response.ok) throw new Error('Session unavailable');
  const account = await response.json();
  if (!account.authenticated) { location.replace('/student.html'); return null; }
  return account;
}
if (!location.pathname.startsWith('/teacher')) {
  document.querySelectorAll('.student-role').forEach(node=>node.remove());
  const logout = document.querySelector('.sidebar-bottom a[href="student.html"]');
  if (logout) { logout.lastElementChild.textContent='Sign out'; logout.addEventListener('click',signOut); }
  session().then(account=>{
    if (!account) return;
    const name=document.querySelector('.student-details strong');
    const id=document.querySelector('.student-id');
    const avatar=document.querySelector('.student-avatar');
    if(name) name.textContent=account.name;
    if(id) id.textContent=`ID: ${account.id}`;
    if(avatar) avatar.textContent=account.name.split(' ').map(n=>n[0]).slice(0,2).join('');
  }).catch(()=>location.replace('/student.html'));
}
