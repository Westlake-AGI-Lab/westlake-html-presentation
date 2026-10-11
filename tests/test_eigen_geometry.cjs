const {test}=require('node:test');
const assert=require('node:assert/strict');
const G=require('../web/assets/eigen-geometry.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('Every animation starts at identity and ends at the lecture matrix',()=>{
  for(const mode of ['stretch','identity','projection','rotation']) {
    G.matrix(mode,0).forEach((v,i)=>near(v,[1,0,0,1][i]));
  }
  G.matrix('projection').forEach((v,i)=>near(v,[.64,.48,.48,.36][i]));
  G.matrix('stretch').forEach((v,i)=>near(v,[1.6,0,0,.55][i]));
});
test('Rotation preserves length at every animation step, including half turns',()=>{
  for(const turn of [90,180])for(let step=0;step<=100;step++) {
    const output=G.apply(G.matrix('rotation',step/100,turn),[2,1]);
    near(Math.hypot(...output),Math.sqrt(5));
  }
});
test('Exact projection presets distinguish eigenvalues 1 and 0',()=>{
  for(const [angle,lambda] of [[G.projectionAngle,1],[G.projectionAngle+90,0]]) {
    const check=G.evidence(G.matrix('projection'),G.vector(angle));
    assert.equal(check.aligned,true);near(check.eigenvalue,lambda);
  }
  assert.equal(G.evidence(G.matrix('projection'),G.vector(30)).aligned,false);
});
test('Quarter turns have no real eigenline, while half turns have eigenvalue -1',()=>{
  for(let angle=0;angle<360;angle+=7) {
    assert.equal(G.evidence(G.matrix('rotation'),G.vector(angle)).aligned,false);
    const half=G.evidence(G.matrix('rotation',1,180),G.vector(angle));
    assert.equal(half.aligned,true);near(half.eigenvalue,-1);
  }
});
test('Zero vector is excluded and repeated eigenvalues are allowed',()=>{
  assert.equal(G.evidence(G.matrix('identity'),[0,0]).aligned,false);
  const check=G.evidence(G.matrix('identity'),[1,2]);
  assert.equal(check.aligned,true);near(check.eigenvalue,1);
});
