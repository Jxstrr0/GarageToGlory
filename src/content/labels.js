// content/labels.js: v0.5 record labels, studios and producers (24_sim_labels.js reads the numbers; UI reads the words).
//   GG.content.labels = { gopherwood|monolith|diy: { id, name, blurb, advance: [min, max] $, royalty (band share of each
//     unit's $, 0..1), albums (owed on the deal; 0 = none), deadlineWeeks (weeks to deliver each owed album; 0 = none),
//     demands: [{ kind, text, card? }] (card = a Monday-card id in cards.js that dramatises it), offerMinFans,
//     offerMinBuzz, dropOnFlop (album units in its first 12 weeks below this = a flop, and a flop drops you; 0 = never),
//     rep: { name, blurb } (who calls), offer (the pitch when an offer arrives), perks: [text], catches: [text] } }
//   GG.content.studios   = [ { id, name, city, blurb, costPerWeek $, quality 0..100, reverb 0..100 (natural room sound),
//     era (earliest era it can be booked), locked? (true = not bookable yet), quirk } ]
//   GG.content.producers = [ { id, name, blurb, costPerWeek $, style, production +n, polish +n, hook +n (points on 0..100
//     scores), weird 0..10 (odds of studio events, and of Pitchspork noticing), era, quirk } ]
//     styles: loud | cabin | pitch (the three from the brief) + tape | radio | weird.
// Owner decisions: no 360 deals, ever. Advances are recoupable. No USA content. Abbot Lane (London) waits for the World era.
// Cards gate on the sim flag `label` (= the signed labelId, 'diy' after a DIY release, cleared when dropped).
(function (GG) {
  GG.content.labels = {
    gopherwood: {
      id: 'gopherwood', name: 'Gopherwood Records',
      blurb: 'A tiny indie label run out of a former feed store in Humboldt. Small advance, big cut, zero opinions about your cape.',
      advance: [4000, 10000], royalty: 0.5, albums: 2, deadlineWeeks: 40,
      demands: [
        { kind: 'showcase', text: 'Play the Gopherwood Christmas showcase in Humboldt. Every year. Forever.', card: 'signed_gopherwood_showcase' },
        { kind: 'sampler', text: "One song on the label sampler, 'Songs from the Feed Store, Vol. 9'." }
      ],
      offerMinFans: 500, offerMinBuzz: 35, dropOnFlop: 800,
      rep: { name: 'Wendell Pasloski',
        blurb: 'Retired shop teacher. Owns the label, the feed store and a label van with a gopher painted on the side. Signs contracts in carpenter pencil.' },
      offer: "Wendell hands you a contract typed on a real typewriter. 'Two records. You keep half. I don't tell you what to play. Coffee?'",
      perks: ['Half of every sale goes to the band', 'Total creative freedom (the cape stays)', 'Wendell drives the label van himself'],
      catches: ['Small advance, paid in two cheques', 'Distribution is Wendell and a post office box', 'Two albums owed']
    },
    monolith: {
      id: 'monolith', name: 'Monolith Records',
      blurb: 'The big one. A glass tower in Toronto with a lobby waterfall and a legal department bigger than Humboldt. Huge advance. Opinions.',
      advance: [25000, 50000], royalty: 0.16, albums: 3, deadlineWeeks: 30,
      demands: [
        { kind: 'english', text: 'Marcel should sing in English. Some of the time. Most of the time.', card: 'signed_monolith_english' },
        { kind: 'radio', text: 'The lead single needs a 3:30 radio edit. The solo is not 3:30.', card: 'signed_monolith_radio' },
        { kind: 'image', text: 'An image consultant will be flying in to "refresh the brand".', card: 'signed_monolith_image' },
        { kind: 'feature', text: 'A duet with a Monolith pop-country act, for "reach".' }
      ],
      offerMinFans: 2500, offerMinBuzz: 60, dropOnFlop: 8000,
      rep: { name: 'Brayden Castellano-Pratt',
        blurb: 'Monolith A&R. Wears sunglasses indoors, like Kenji, but with none of the mystery. Says "love that" about everything, including bad news.' },
      offer: "Brayden slides a contract the thickness of a phone book across a boardroom table. 'Three records, huge advance, the machine behind you. Love that.'",
      perks: ['A huge advance (recoupable)', 'Radio, press and a real promo budget', 'Theatre tours and the big studios'],
      catches: ['The band keeps 16% of each sale', 'Three albums, tight deadlines', 'Notes. So many notes.', 'Flop and you are dropped']
    },
    diy: {
      id: 'diy', name: 'Do It Yourself',
      blurb: 'No label. You book it, you pay for it, you mail the CDs from Mom\'s kitchen table. You also keep every loonie.',
      advance: [0, 0], royalty: 1, albums: 0, deadlineWeeks: 0, demands: [],
      offerMinFans: 0, offerMinBuzz: 0, dropOnFlop: 0,
      rep: { name: 'You', blurb: 'The drummer, the founder, and now the label, the accountant and the shipping department.' },
      offer: 'No contract, no advance, no notes. Just a box of blank mailers and your mom asking who is paying for all these stamps.',
      perks: ['Keep every dollar', 'Nobody tells Marcel what language to sing in', 'Release whenever you like'],
      catches: ['You pay for the studio, the producer and the promo', 'No advance, no safety net', 'Distribution is a hockey bag']
    }
  };

  GG.content.studios = [
    { id: 'moms_basement', name: "Mom's Basement", city: 'Saskatoon', era: 'local', costPerWeek: 0, quality: 30, reverb: 8,
      blurb: 'Free. Carpeted. Next to the laundry room. Mom brings pizza pops at the exact moment you hit record.',
      quirk: 'The dryer runs every take. It is in the key of E flat. Nothing else is.' },
    { id: 'strip_mall_sound', name: 'Strip Mall Sound', city: 'Saskatoon', era: 'local', costPerWeek: 150, quality: 52, reverb: 22,
      blurb: 'Unit 7, between a nail salon and a vacuum repair shop. Cheap. The engineer, Walt, also owns the strip mall.',
      quirk: 'Walt stops sessions to deal with tenants. The nail salon bleeds through the wall on every ballad.' },
    { id: 'grain_silo', name: 'Grain Silo Studios', city: 'Rosthern', era: 'local', costPerWeek: 600, quality: 76, reverb: 95,
      blurb: 'A converted wooden grain elevator on the edge of Rosthern. Thirty metres of natural reverb. Pigeons included.',
      quirk: 'A snare hit decays for nine seconds. A cough decays for eleven. A grain truck still unloads next door at harvest.' },
    { id: 'abbot_lane', name: 'Abbot Lane Studios', city: 'London', era: 'world', costPerWeek: 3000, quality: 97, reverb: 60, locked: true,
      blurb: 'The famous one in London, with the famous zebra crossing out front. Everyone takes the photo. Marcel will wear the cape.',
      quirk: 'Opens in the World era. The tea lady has heard every legend in history and is unimpressed by all of them.' }
  ];

  GG.content.producers = [
    { id: 'dwayne_redline', name: 'Dwayne "Redline" Sawchuk', style: 'loud', era: 'local', costPerWeek: 250,
      production: 8, polish: 2, hook: 0, weird: 3,
      blurb: 'Makes everything loud. Then louder. Has a tattoo of a VU meter, pinned. Owns earplugs but considers them a personal insult.',
      quirk: '"If the needle ain\'t in the red, it ain\'t in the record."' },
    { id: 'solveig_birch', name: 'Solveig Birch', style: 'cabin', era: 'local', costPerWeek: 400,
      production: 6, polish: 6, hook: 3, weird: 8,
      blurb: 'Records the vocals and overdubs at her cabin in the woods near Waskesiu, whatever studio you book. No cell service. There is a bear.',
      quirk: 'The bear is called Gerald. Solveig says he is "a big fan of the low end".' },
    { id: 'quiet_pierre', name: 'Pierre "Quiet" Lavoie', style: 'pitch', era: 'signed', costPerWeek: 600,
      production: 7, polish: 9, hook: 4, weird: 1,
      blurb: 'Never raises his voice. Quietly fixes Marcel\'s pitch after every take. Marcel does not know. Marcel must never know.',
      quirk: 'Marcel thinks he has simply never sounded better. Pierre lets him think it.' },
    { id: 'bev_kostiuk', name: 'Bev Kostiuk', style: 'tape', era: 'local', costPerWeek: 300,
      production: 5, polish: 7, hook: 2, weird: 4,
      blurb: 'Records only to tape, on a 1974 machine rescued from a Yorkton radio station. Bans laptops. Splices with a razor blade and a cigarette.',
      quirk: 'Every take is the take. There is no undo. There is Bev.' },
    { id: 'chad_lorimer', name: 'Chad Lorimer', style: 'radio', era: 'signed', costPerWeek: 1200,
      production: 9, polish: 5, hook: 9, weird: 0,
      blurb: 'Monolith\'s hit-maker. Has produced eleven songs you have heard in a dentist\'s office. Wants every chorus twice as early.',
      quirk: 'Calls the bridge "the part people skip". Calls Kenji "the tall one".' },
    { id: 'lyle_hnatiuk', name: 'Lyle Hnatiuk', style: 'weird', era: 'local', costPerWeek: 150,
      production: 3, polish: 1, hook: 1, weird: 10,
      blurb: 'Experimental. Once recorded a cowbell inside a combine at harvest. Mics the kick drum from the next farm over. Cheap, for reasons.',
      quirk: 'Pitchspork adores him. Nobody else has finished listening to one of his records.' }
  ];
})(window.GG);
