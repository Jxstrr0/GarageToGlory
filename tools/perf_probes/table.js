// table.js: one row per scene from results/scenes_*.json (1x 390, 4x 390, 1x 440, 1x 440 DPR3).
const r1 = require('./results/scenes_t1_390x844.json').scenes, r4 = require('./results/scenes_t4_390x844.json').scenes,
  r440 = require('./results/scenes_t1_440x956.json').scenes, rd = require('./results/scenes_t1_440x956_dpr3.json').scenes;
console.log('scene | calls | tris | geo/tex/prog | heapMB | js p50/p95 1x | js p50/p95 4x | render p50/p95 4x | fps sw 390@1x / 440@1x / 440@dpr3 | build ms 1x/4x');
for (const k of Object.keys(r1)) { const a = r1[k], b = r4[k], c = r440[k], d = rd[k];
  const f = x => x && x.frame.fps ? x.frame.fps : (x && x.drawing === false ? 'paused' : '-');
  console.log([k, a.info.calls, a.info.tris, a.info.geometries + '/' + a.info.textures + '/' + a.info.programs, a.heap.usedMB,
    a.frame.js.p50 + '/' + a.frame.js.p95, b.frame.js.p50 + '/' + b.frame.js.p95, b.frame.render.p50 + '/' + b.frame.render.p95,
    f(a) + ' / ' + f(c) + ' / ' + f(d), (a.build != null ? a.build : '-') + '/' + (b.build != null ? b.build : '-')].join(' | ')); }
