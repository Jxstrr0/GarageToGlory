// content/achievements.js (v1.0 "Glory", Addendum 2 D4; plan_contract_1.0 §4.6): the achievements ("Trophies" on the laptop).
// Shape: GG.content.achievements = [ ACH ]
//   ACH = { id, name, blurb, icon (emoji), band?: [bandId], seat?: [seat], when: 'gig'|'week'|'year'|'end'|'meta'|'load',
//           test: { kind, … }, nameBySize?: { 4: '…', 5: '…' }, hidden?: false }
// Kinds and their numbers are evaluated by GG.achieve (src/2g_sim_achieve.js; KINDS lists them). Rules: text is band-neutral
// unless the row is band-gated (a gated row may name its own band's people and rival, never another band's); any drum word
// (kit, drum, sticks, snare, kick, cymbal, hi-hat) gates the row to seat: ['drums'] (handoff E12; v1.1 adds seat rows). No US
// places, parody names only, no gong on any kit (the Global Gong award may be named). Achievements are bragging only: they
// never gate content (the cosmetic unlocks come from ending tiers and specials, 12_meta).
(function (GG) {
  var HD = ['hail_damage'], FH = ['frost_heave'], GK = ['gravel_kings'], GRR = ['grid_road_ramblers'];
  GG.content.achievements = [
    // ---- the fifteen seeds (D4) ----------------------------------------------------------------------------------------
    { id: 'twelve_people', name: 'Twelve People and a Dog', icon: '🐕', when: 'gig', test: { kind: 'milestone', id: 'firstGig' },
      blurb: 'Play your first gig. Twelve people came. One was a dog. He stayed for the encore.' },
    { id: 'the_wall', name: 'The Wall', icon: '🚫', when: 'gig', test: { kind: 'bannedInYear', min: 3 },
      blurb: 'Get banned from three venues in one year. Your photo is on more bar walls than the prime minister’s.' },
    { id: 'ma_pelouse', name: 'Ma Pelouse', icon: '🌱', band: HD, when: 'week', test: { kind: 'releasedFr' },
      blurb: 'Release a song with one of Marcel’s French titles. Nobody on the radio can say it. Marcel is thrilled.' },
    { id: 'original_lineup', name: 'The Original Lineup', nameBySize: { 4: 'The Original Four', 5: 'The Original Five' }, icon: '🤝',
      when: 'end', test: { kind: 'originals', neverQuit: true },
      blurb: 'Finish a career with every original member still in the van. Nobody quit. Not once. Not even for a weekend.' },
    { id: 'kijiji_all_stars', name: 'Kijiji All-Stars', icon: '🛒', when: 'end', test: { kind: 'originals', kept: 0 },
      blurb: 'Finish a career with none of the originals left. Everybody in the van answered an ad.' },
    { id: 'sold_out', name: 'Sold Out', icon: '💸', when: 'week', test: { kind: 'milestone', id: 'soldOut' },
      blurb: 'License a song to a commercial. Your mom heard it during the weather and phoned everyone she knows.' },
    { id: 'worst_van', name: 'Worst Van', icon: '🚐', when: 'year', test: { kind: 'award', id: 'worst_van', won: true },
      blurb: 'Win the Loonie for Worst Van. The award is framed. The van is still leaking.' },
    { id: 'block_heater', name: 'Block Heater', icon: '🔌', when: 'week', test: { kind: 'winterNoBreakdown', away: 3 },
      blurb: 'Play three away gigs in one prairie winter without a single breakdown. Plug it in, eh.' },
    { id: 'buddy', name: 'Buddy', icon: '🙄', band: HD, when: 'year', test: { kind: 'rivalLoonieStreak', n: 3 },
      blurb: 'Tundra Wraith win Loonies three years running. Their frontman calls you “buddy” at every single one.' },
    { id: 'big_in_japan', name: 'Big in Japan', icon: '🏮', when: 'end', test: { kind: 'special', id: 'big_in_japan' },
      blurb: 'End a career big in Japan. A fan club in Osaka knits toques in your colours.' },
    { id: 'frostbite', name: 'Frostbite', icon: '🥶', when: 'gig', test: { kind: 'venuePlayed', id: 'siberian_frostfest' },
      blurb: 'Play Siberian Frostfest on the frozen lake. Minus forty. Everybody back home asks if it was cold.' },
    { id: 'chugging_along', name: 'Chugging Along', icon: '🚂', seat: ['drums'], when: 'week', test: { kind: 'songKickShare', genre: 'metal', min: 0.5 },
      blurb: 'Write a metal song where the kick drum is half of everything you play. The neighbours’ windows hum along.' },
    { id: 'grey_mug', name: 'Grey Mug', icon: '🏈', when: 'week', test: { kind: 'flag', flag: 'greyMug', values: ['played', 'done'] },
      blurb: 'Play the Grey Mug halftime show. Your mom bought a foam finger. It is bigger than she is.' },
    { id: 'night_school', name: 'Night School', icon: '📚', when: 'week', test: { kind: 'stat', stat: 'parentsLoans', min: 3 },
      blurb: 'Borrow from your parents three times. The night-school brochures on the fridge are multiplying.' },
    { id: 'sad_dome', name: 'Sad Dome', icon: '🏟', when: 'end', test: { kind: 'final', headliner: 'you' },
      blurb: 'Headline the Sad Dome in your final year. The roof stayed up. Mostly.' },
    // ---- the band twins (one storyline row + one rival-streak row per band) -----------------------------------------------
    { id: 'read_the_minutes', name: 'Read the Minutes', icon: '📜', band: FH, when: 'week', test: { kind: 'flag', flag: 'council', values: ['won'] },
      blurb: 'Win the fight at city council. Rox read the minutes out loud. All of them. Twice.' },
    { id: 'legally_distinct', name: 'Legally Distinct', icon: '⚖️', band: GK, when: 'week', test: { kind: 'flag', flag: 'riff', values: ['original'] },
      blurb: 'Keep the riff and prove it is yours. The lawyer’s letter is framed in the strip-mall unit.' },
    { id: 'truck_song', name: 'Truck Song', icon: '🛻', band: GRR, when: 'week', test: { kind: 'flag', flag: 'truckStory', values: ['famous'] },
      blurb: 'Make the ’87 truck famous. It gets more fan mail than Earl. Earl has noticed.' },
    { id: 'sponsored_content', name: 'Sponsored Content', icon: '🛹', band: FH, when: 'year', test: { kind: 'rivalLoonieStreak', n: 3 },
      blurb: 'Mall Rats win Loonies three years running. Every acceptance speech is brought to you by a skate shop.' },
    { id: 'power_ballad_blues', name: 'Power Ballad Blues', icon: '🎹', band: GK, when: 'year', test: { kind: 'rivalLoonieStreak', n: 3 },
      blurb: 'Chartbusters win Loonies three years running. Every acceptance speech has a key change.' },
    { id: 'tailgated', name: 'Tailgated', icon: '🤠', band: GRR, when: 'year', test: { kind: 'rivalLoonieStreak', n: 3 },
      blurb: 'Buckle and Boot win Loonies three years running. Their tour bus parks in your spot. Every year.' },
    // ---- the extras ----------------------------------------------------------------------------------------------------------
    { id: 'overtime', name: 'Overtime', icon: '⏱', when: 'week', test: { kind: 'bonus', min: 2 },
      blurb: 'Reach the world stage early and earn bonus years. Ten years was never going to be enough.' },
    { id: 'statue_season', name: 'Statue Season', icon: '🏛', when: 'end', test: { kind: 'tier', id: 'arena_legends' },
      blurb: 'Finish a career as Arena Legends. There is a statue now. The pigeons have opinions.' },
    { id: 'mom_needs_the_garage', name: 'Mom Needs the Garage', icon: '🚗', when: 'end', test: { kind: 'tier', id: 'still_in_the_garage' },
      blurb: 'Finish a career still in the garage tier. Your mom would like to park the car now, please.' },
    { id: 'hat_trick', name: 'Hat Trick', icon: '🎩', when: 'gig', test: { kind: 'botbInYear', min: 3 },
      blurb: 'Win three Battles of the Bands in one year. Somebody threw a toque on stage. Then everybody did.' },
    { id: 'between_periods', name: 'Between Periods', icon: '🏒', when: 'week', test: { kind: 'licensedBrand', id: 'hockey' },
      blurb: 'License a song to the hockey highlights. It plays between periods. Every period. Forever.' },
    { id: 'whos_opening_now', name: 'Who’s Opening Now', icon: '🎤', when: 'week', test: { kind: 'crack', id: 'opener' },
      blurb: 'Beat your rivals so often they end up opening for you. You let them have the good green room. Kidding.' },
    { id: 'prodigal_bandmate', name: 'Prodigal Bandmate', icon: '🔁', when: 'week', test: { kind: 'returned' },
      blurb: 'A bandmate who quit comes back. Nobody mentions it. Everybody mentions it.' },
    { id: 'pitchspork_proof', name: 'Pitchspork Proof', icon: '🍴', when: 'week', test: { kind: 'reviewBelow', outlet: 'pitchspork', max: 3.0 },
      blurb: 'Go gold with a record Pitchspork scored 3.0 or lower. The critic was not invited to the party.' },
    { id: 'moms_basement_tapes', name: 'Mom’s Basement Tapes', icon: '🎙', when: 'week', test: { kind: 'studio', id: 'moms_basement' },
      blurb: 'Release a record made in Mom’s Basement. You can hear the dryer on track four. It is the best part.' },
    { id: 'gas_station_sushi', name: 'Gas Station Sushi', icon: '🍣', when: 'gig', test: { kind: 'km', min: 7000 },
      blurb: 'Drive 7,000 km to gigs. You now rank every gas station’s sushi between here and the coast.' },
    { id: 'minus_forty', name: 'Minus Forty and Fine', icon: '🌡', when: 'gig', test: { kind: 'weatherGig', maxTemp: -30, or: ['blizzard'] },
      blurb: 'Play a gig at minus thirty or in a blizzard. The crowd kept their mitts on. Nobody complained.' },
    { id: 'prairie_grand_slam', name: 'Prairie Grand Slam', icon: '🌾', when: 'meta', test: { kind: 'allBands' },
      blurb: 'Finish a career with all four bands. Metal, punk, rock and country. Your mom has every shirt.' },
    // ---- reserve ("add freely") ----------------------------------------------------------------------------------------------
    { id: 'brutal_honesty', name: 'Brutal Honesty', icon: '💀', when: 'end', test: { kind: 'difficulty', id: 'brutal' },
      blurb: 'Finish a career on Brutal. No mercy, no refunds, no regrets. Some regrets.' },
    { id: 'lifer', name: 'Lifer', icon: '🎖', when: 'meta', test: { kind: 'careers', min: 3 },
      blurb: 'Finish three careers. At this point it is not a phase, Mom.' },
    { id: 'global_gonger', name: 'Global Gonger', icon: '🌍', when: 'year', test: { kind: 'gongWon' },
      blurb: 'Win the Global Gong award. The trophy weighs more than the van’s spare tire.' }
  ];
})(window.GG);
