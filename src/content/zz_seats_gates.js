// content/zz_seats_gates.js (v1.1 "Seats", review fix): v0.9 / v1.0 band cards whose whole premise is the swapped member
// playing their OLD instrument (Kenji's bass take, Dana's solo takes and signature guitar, Benny's guitar and third chord,
// Lenny's riff lawsuit played on guitar, Earl's solo, Travis Lee's acoustic). On the seat that sends that member to the kit
// they make no sense, so they never draw there: a top-level seat gate of every other seat (career.cardOk / seatOk). Lines
// that only mentioned the instrument in passing were reworded seat-neutral in their own files instead. The second pass of
// the seat leak scan (tests/seat_scan.js oldLeak: the swapped member's name next to their old instrument's words) keeps it so.
// Loads after the band packs (zz_band_*), whose cards it gates; an id ending in '*' is a prefix (a whole chain).
(function (GG) {
  var C = GG.contracts, K = GG.content;
  var OFF = {
    bass: ['studio_kenji_one_take', 'studio_fh_van_booth', 'signed_fh_monolith_image'],
    rhythm: ['grr_lantern_rehearsal', 'grr_local_truck_stop'],
    lead: [
      // Hail Damage: Dana drums
      'scandal_cover', 'signed_dana_signature', 'signed_monolith_radio', 'studio_dana_take_41',
      // Frost Heave: Benny drums
      'fh_benny_capo', 'fh_local_two_string', 'fh_benny_lessons', 'fh_benny_third_chord', 'fh_signed_japan_zine', 'fh_signed_third_chord_offer',
      'scandal_fh_third_chord', 'studio_fh_third_chord', 'fh_rox_minutes', 'road_fh_three_chords', 'holiday_st_paddys_frost_heave',
      // Gravel Kings: Lenny drums (his riffs are still his songs; these cards have him playing them on guitar)
      'gk_l_anthem', 'gk_s_signature_guitar', 'gk_rep_riff_night', 'road_gk_cassette_war', 'fans_trucker_gravel_kings', 'gk_freeze_demo',
      'gk_early_voicemail', 'scandal_gk_riff_leak', 'studio_gk_riff_flag',
      // Grid Road Ramblers: Earl drums
      'grr_small_rodeo_anthem', 'signed_grr_monolith_radio', 'grr_rep_tuning'
    ]
  };
  var want = {};   // id (or prefix*) -> [seats to leave out]
  Object.keys(OFF).forEach(function (seat) { OFF[seat].forEach(function (id) { (want[id] = want[id] || []).push(seat); }); });
  var prefixes = Object.keys(want).filter(function (k) { return /\*$/.test(k); });
  function offFor(id) {
    var out = (want[id] || []).slice();
    prefixes.forEach(function (p) { if (id.indexOf(p.slice(0, -1)) === 0) out = out.concat(want[p]); });
    return out;
  }
  (function walk(v, depth) {   // (idempotent: a shared object visited twice gets the same gate)
    if (!v || typeof v !== 'object' || depth > 8) return;
    if (Array.isArray(v)) { v.forEach(function (x) { walk(x, depth + 1); }); return; }
    if (typeof v.id === 'string' && (v.text || v.choices)) {
      var off = offFor(v.id);
      if (off.length) {
        var base = v.seat != null ? [].concat(v.seat) : C.SEATS.slice();
        v.seat = base.filter(function (s) { return off.indexOf(s) < 0; });
      }
      return;
    }
    Object.keys(v).forEach(function (k) { walk(v[k], depth + 1); });
  })(K, 0);
})(window.GG);
