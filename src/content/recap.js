// content/recap.js (v0.8.1 "Addendum 2", LICRECAP; handoff D3): words for the year-end recap. Pure data; the sim is
// 2d_sim_recap.js (GG.recap), the screen 5l_ui_recap.js.
//   headlines : { <event>: [text] } Rolling Scone headlines, one event per year (the biggest one wins; see GG.recap.events).
//               Tokens: {band} {rival} {nth} (year number as a word) {n} {name} {award} {album} {cert} {label} {region}
//               {venue} {brand} {song} {van}.
//   quotes    : { S|A|B|C|D: [text] } the one-line quote under the best / worst gig when the band had nothing to say.
//   goodYear  : year one only (the tutorial tie-in): the bandmates explain what "a good year" looks like, one topic each.
//               [{ topic: fans|songs|gigs|loans|chemistry, who: [preferred speaker ids] (first one in the band; else any
//               bandmate but Kenji), target, good, bad }]. {n} = this year's number, {target} = the bar.
//   intro / outro : lines for the first and last page.
// v0.9 "Genres" (plan_contract_0.9 §4.1): headlines are neutral (+ {space}); recap.byBand[bandId] = { headlines: { <event>:
//   [text] }, goodYear: [entries] } adds a band's own (career.pool). The flat goodYear list is Hail Damage's set (its
//   speakers are Hail Damage's, so GG.recap skips the entries in other bands' careers); each pack adds its band's full set
//   in recap.byBand[bandId].goodYear (same topics: fans, songs, gigs, loans, chemistry).
(function (GG) {
  GG.content.recap = {
    masthead: 'Rolling Scone',
    headlines: {
      final_won: ['{band} Headline the Sad Dome Forever; {rival} Asked to Carry Amps', '{band} Win the Sad Dome; Dome Slightly Less Sad'],
      final_lost: ['{rival} Take the Sad Dome; {band} Take It Personally'],
      gong: ['{band} Bang the Global Gong; Neighbours File Noise Complaint', 'Gong! {band} Are the World\'s Problem Now'],
      loonie: ['{band} Win {award} at the Loonies; Speech Runs Long', 'Loonie for {band}; {rival} Clap Politely'],
      cert: ['"{album}" Goes {cert}; {band} Buy a Second Couch', '{band} Hang a {cert} Record Where the Dartboard Was'],
      world: ['{band} Go Global; The Van Stays Home', 'World Stage Calls; {band} Answer From a Payphone'],
      signed: ['{band} Sign With {label}; Mom Reads the Contract Twice', '{label} Signs {band}; Lawyers Learn What a Drummer Is'],
      chart_top: ['"{album}" Hits No. {n} on the Maple 100', '{band} Crack the Maple 100 Top Ten; {space} Declared a Landmark'],
      charted: ['"{album}" Debuts on the Maple 100; {band} Refresh the Page All Night', '{band} Chart at No. {n}; Relatives Suddenly Call'],
      crack: ['{rival} Crack; {band} Pretend Not to Gloat', 'Scene Shaken as {rival} Fall Apart'],
      license: ['{band} Sell "{song}" to {brand}; Fans Divided', '"{song}" Now Plays in a {brand} Ad; {band} Can\'t Watch TV'],
      region: ['{band} Conquer {region}; Customs Confused by the Gear', '{band} Big in {region}, Allegedly'],
      quit: ['{name} Quits {band}; Group Chat Goes Quiet', '{band} Down a Member; {name} "Needs Space"'],
      back: ['{name} Returns to {band}; Nobody Mentions It', 'The Prodigal {name} Comes Home to {band}'],
      best_s: ['{band} Level {venue}; Venue Still Standing, Barely', '{band} Melt Faces at {venue}; Faces Recovering'],
      banned: ['{band} Banned From {n} Venues; Call It a Tour', '{band} Wear Out Their Welcome at {n} Venues'],
      loans: ['{band} Borrow From Parents Again; Night School Brochures Multiply', 'Parents of {band} Refinance the House'],
      fans: ['{band} Add {n} Fans; Mom Counts Herself Twice', '{n} New Fans for {band}; Most of Them Real'],
      survive_van: ['{band} Survive Year {nth}; {van} Does Not', 'Year {nth} Done; {band} Fine, {van} Less So'],
      survive: ['{band} Survive Year {nth}', '{band} Complete Year {nth}; {space} Still Standing']
    },
    quotes: {
      S: ['I saw the face of God. He was in the mosh pit.', 'We didn\'t play that gig. That gig played us.'],
      A: ['Tight. Loud. Nobody fell off the stage.', 'Best night of the year and I didn\'t even trip on a cable.'],
      B: ['Solid. The sound guy nodded once. That counts.', 'A good, honest, sweaty night.'],
      C: ['The crowd was there. Physically.', 'We have played worse. We have also played better.'],
      D: ['Let\'s never speak of it.', 'The bingo caller was louder than us. And better.']
    },
    goodYear: [
      { topic: 'fans', who: ['marcel'], target: 250,
        good: 'A good year? {target} new fans. We got {n}. The spotlight has found us.',
        bad: 'A good year is {target} new fans. We got {n}. The spotlight is... warming up.' },
      { topic: 'songs', who: ['dana'], target: 6,
        good: '{target} new songs makes a year. We wrote {n}. Now we need longer solos.',
        bad: 'A good year is {target} songs. We wrote {n}. My solos can only fill so much.' },
      { topic: 'gigs', who: ['jaxon'], target: 10,
        good: 'Ten gigs is a real year. We played {n}! Baba came to two.',
        bad: 'Baba says a real band plays {target} gigs a year. We played {n}. She\'s not mad. She\'s disappointed.' },
      { topic: 'loans', who: ['mom'], target: 0,
        good: 'A good year is one where you don\'t borrow from us. You didn\'t! I\'m framing the bank statement.',
        bad: 'A good year is one where you don\'t borrow from us. You borrowed {n} times. I left a brochure on your kit.' },
      { topic: 'chemistry', who: ['kenji'], target: 60,
        good: '(Kenji gives the year one slow, silent nod.)',
        bad: '(Kenji looks at the band for a long time. No nod.)' }
    ],
    intro: 'Year {nth}. Swipe through it.',
    outro: 'On to year {next}.',
    // v0.9: Hail Damage's own headlines (packs add the other bands' headlines + goodYear sets)
    byBand: {
      hail_damage: {
        headlines: {
          signed: ['{label} Signs {band}; Lawyers Learn What a Cape Is'],
          chart_top: ['{band} Crack the Maple 100 Top Ten; Garage Declared a Landmark'],
          region: ['{band} Conquer {region}; Customs Confused by Cape'],
          loans: ['Parents of {band} Refinance the Garage'],
          survive: ['{band} Complete Year {nth}; Garage Still Standing']
        }
      }
    }
  };
})(window.GG);
