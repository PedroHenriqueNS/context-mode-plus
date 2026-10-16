/**
 * Compare "X.Y.Z" and "X.Y.Z-plus.N" version strings (fork scheme).
 * A plain X.Y.Z sorts as N=0, i.e. below any -plus.N of the same X.Y.Z.
 * Unparseable input sorts as 0.0.0. Returns <0, 0 or >0 like Array#sort.
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string): number[] => {
    const m = /^(\d+)\.(\d+)\.(\d+)(?:-plus\.(\d+))?/.exec(String(v));
    return m ? [+m[1], +m[2], +m[3], +(m[4] || 0)] : [0, 0, 0, 0];
  };
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 4; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}
