/* Shared model/storage boundary. Local prototype: no network or autonomous agents. */
export const KEY='xiaoxi-discussions-v1';
export const uid=()=>crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
export const categories=['Question','Concept explanation','Study together'];
export const visibilityOptions=['Course members','Study group','Only me'];
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const language=()=>localStorage.getItem('westlake-ui-language')==='zh'?'zh':'en';
export const L=(en,zh)=>language()==='zh'?zh:en;
const sampleTime=Date.now()-3600000;
const seeds=[
 {id:'sample-renaming',course:'computer-architecture',title:'Does register renaming remove every data hazard?',context:'In Lecture 7, Tomasulo uses register tags instead of architectural register names. I can see how this helps WAW, but why does RAW still matter?',author:'Maya Chen',sample:true,category:'Question',visibility:'Course members',createdAt:sampleTime,pinned:true,replies:[{id:'sample-instructor',author:'Course instructor',sample:true,verified:true,text:'Renaming removes false name dependencies (WAR and WAW), not a true RAW dependency. An instruction still needs the value produced by its predecessor. Reservation stations wait for the producing tag.',parent:null,createdAt:sampleTime+1000},{id:'sample-student',author:'Leo Zhang',sample:true,text:'So renaming lets independent instructions proceed, while the tag preserves which result a consumer needs. Is that the right interpretation?',parent:'sample-instructor',createdAt:sampleTime+2000}]},
 {id:'sample-eigen',course:'linear-algebra',title:'Why does a zero determinant mean we lose information?',context:'I can compute the determinant, but I am looking for a geometric explanation. Could someone explain what happens to two different input vectors?',author:'Amira Patel',sample:true,category:'Concept explanation',visibility:'Course members',createdAt:sampleTime-50000,replies:[]},
 {id:'sample-hash',course:'data-structures',title:'When should we resize a hash table?',context:'A low load factor uses more memory. A high load factor makes collisions more likely. What assumptions do we need for expected O(1) lookup?',author:'Leo Zhang',sample:true,category:'Study together',visibility:'Course members',createdAt:sampleTime-100000,replies:[]}
];
function read(){const raw=localStorage.getItem(KEY);if(!raw)return structuredClone(seeds);const posts=JSON.parse(raw);if(!Array.isArray(posts)||posts.some(p=>!p||typeof p.title!=='string'||!Array.isArray(p.replies)))throw Error('Discussion storage is invalid. Export or clear this prototype’s browser data before continuing.');return posts;}
export const store={read,write(posts){localStorage.setItem(KEY,JSON.stringify(posts));},update(id,change){const posts=read(),post=posts.find(p=>p.id===id);if(!post)throw Error('This discussion no longer exists.');change(post,posts);this.write(posts);return post;},create(data){const post={...data,id:uid(),author:'You',createdAt:Date.now(),replies:[]};this.write([post,...read()]);return post;},remove(id){this.write(read().filter(p=>p.id!==id));}};
export async function courseList(){const r=await fetch('api/courses');if(!r.ok)throw Error('Cannot load the course catalog.');return (await r.json()).courses;}
export function agentDraft(post,mode,index=0){
 const topic=(post.title+' '+post.context+' '+(post.excerpt||'')).toLowerCase();
 let explanation,counterexample;
 if(/renam|tomasulo|hazard|register/.test(topic)){
 explanation='Register renaming separates storage names from values. WAR and WAW are name dependencies, so different physical destinations remove them. RAW is a true value dependency: a consumer must wait for its producer’s result.\n\nExample:\nI1: R1 ← R2 + R3\nI2: R4 ← R1 + R5\nI2 still needs the result from I1, even after R1 is renamed.';
 counterexample='Challenge the claim “renaming removes all hazards.” If I2 consumes the value produced by I1, changing the destination name cannot create that value earlier. This is a counterexample to the stronger claim, not a disagreement with renaming removing WAR/WAW.';
 }else if(/hash|load factor|collision/.test(topic)){
 explanation='Expected O(1) lookup assumes a suitable hash distribution and controlled load factor α = n / m. With separate chaining, expected work is O(1 + α). Resizing has an O(n) cost that can be amortized over many insertions.';
 counterexample='If every key hashes to the same bucket, lookup can take O(n) even at a low load factor. Low α alone does not guarantee constant time. Compare the expected-case assumptions with a deliberately poor hash function.';
 }else if(/determinant|eigen|matrix|vector/.test(topic)){
 explanation='A zero determinant means a square linear transformation is not invertible. At least one nonzero vector v satisfies Av = 0, so A(x + v) = Ax. Distinct inputs produce the same output: information is lost. Example: diag(1, 0) maps both (1, 0) and (1, 2) to (1, 0).';
 counterexample='Avoid claiming that a negative determinant also loses information. A = diag(−1, 1) has determinant −1 and A² = I. It is a reversible reflection. The boundary is zero versus nonzero, not positive versus negative.';
 }else{explanation='This scripted prototype has examples for register renaming, determinants, and hash tables. For this topic, state the claim precisely, list its assumptions, and work through a small example. No model has read or answered this thread.';counterexample='Try a boundary case where one assumption fails. Ask a classmate whether the original explanation still holds. This is a fixed discussion prompt, not a generated answer.';}
 if(mode==='single'||index===0)return explanation;
 if(index===1)return counterexample;
 return 'Compare the explanation and its boundary case above. Which assumptions matter? Write a conclusion in your own words, and invite a classmate to check it. These scripted agents have not performed independent reasoning or verified each other’s output.';
}
