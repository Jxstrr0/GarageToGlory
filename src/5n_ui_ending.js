// 5n_ui_ending.js (v1.0 "Glory"): the end-of-career screen ('end', full). Stage 0 moved the v0.1 stub here unchanged from
// 52_ui_week.js; Lane E replaces it with the end sequence (plan_contract_1.0 §4.4): Legacy count-up (end-legacy) → tier
// (end-tier) → specials (end-special-<id>) → epilogues (end-epilogue-<id>) → rival line (end-final) → summary (end-hof,
// btn-end-title). An ended state is finished + recorded (GG.legacy.finish, GG.achieve.finish, GG.meta.recordCareer, all
// idempotent); a live career gets a read-only preview (GG.legacy.compute), nothing written. No share/screenshot/download.
(function (GG) {
  var ui = GG.ui, el = ui.el, btn = ui.btn, U = GG.util;
  function S() { return GG.state; }

  ui.define('end', {
    kind: 'full',
    build: function (s) {
      var st = S() || {}, stats = st.stats || {};
      var band = (GG.content.bands || {})[st.bandId];
      var grid = el('div.stat-grid', [
        ['Years', st.year || 10], ['Fans', U.fmtNum(st.fans || 0)], ['Fund', U.fmtMoney(st.fund || 0)],
        ['Gigs', stats.gigs || 0], ['Songs', stats.songsWritten || (st.songs || []).length], ["Parents' loans", stats.parentsLoans || 0]
      ].map(function (x) { return el('div', [el('span.caps', x[0]), el('b', String(x[1]))]); }));
      ui.append(s.body, el('div.title-wrap', [
        el('h1.logo', { style: 'font-size:44px' }, ["That's a", el('span.glory', ' career')]),
        el('p.tagline', (band ? band.name : 'The band') + ' played their last show in ' + ui.space(st) + '. Your mom kept every flyer.'),
        el('div.panel', grid), ui.rivalEnd ? ui.rivalEnd(st) : null
      ]));
      s.foot.appendChild(btn('.btn.primary.big.block', { testid: 'btn-end-title', onclick: function () { GG.main.quitToTitle(); } }, 'Back to title'));
    }
  });
})(window.GG);
