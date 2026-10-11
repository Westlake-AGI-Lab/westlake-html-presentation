/* Pure 2D geometry shared by the lecture canvas and its numerical checks. */
((root, factory) => {
  const geometry = factory();
  if (typeof module === 'object' && module.exports) module.exports = geometry;
  else root.EigenGeometry = geometry;
})(typeof window === 'undefined' ? globalThis : window, () => {
  'use strict';
  const clamp = x => Math.max(0, Math.min(1, x));
  const apply = (a, v) => [a[0]*v[0]+a[1]*v[1], a[2]*v[0]+a[3]*v[1]];
  function matrix(mode, progress = 1, turn = 90) {
    const t = clamp(progress);
    if (mode === 'rotation') {
      const angle = turn*t*Math.PI/180, c = Math.cos(angle), s = Math.sin(angle);
      return [c, -s, s, c];
    }
    const a = {stretch:[1.6,0,0,.55], identity:[1,0,0,1], projection:[.64,.48,.48,.36]}[mode];
    if (!a) throw new Error('Unknown transformation');
    return [1+t*(a[0]-1), t*a[1], t*a[2], 1+t*(a[3]-1)];
  }
  function evidence(a, v) {
    const lengthSquared = v[0]**2+v[1]**2;
    if (lengthSquared < 1e-16) return {aligned:false, eigenvalue:null, residual:null};
    const w = apply(a,v), eigenvalue = (v[0]*w[0]+v[1]*w[1])/lengthSquared;
    const residual = Math.hypot(w[0]-eigenvalue*v[0],w[1]-eigenvalue*v[1])/Math.sqrt(lengthSquared);
    return {aligned:residual < 1e-8, eigenvalue, residual};
  }
  const vector = angle => [2*Math.cos(angle*Math.PI/180),2*Math.sin(angle*Math.PI/180)];
  const projectionAngle = Math.atan2(3,4)*180/Math.PI;
  return {matrix, apply, evidence, vector, projectionAngle, clamp};
});
