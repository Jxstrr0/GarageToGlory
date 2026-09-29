// content/reviews.js: v0.5 album reviews (24_sim_labels.js scores them; the UI reveals them one outlet at a time).
//   GG.content.reviews = {
//     scoreBands: { awful: 0, meh: 40, good: 62, great: 80 }   // lowest normalised score (0..100) for each band
//     outlets: { <outletId in C.OUTLETS>: {
//       id, name, critic, scale: 10|5|100, decimals, unit ('stars'|'/10'|'skulls'|'/100'), caps (true = print the
//       filled quote in ALL CAPS), genres: { metal, punk, rock, country } (0..1: how much this outlet matters for the
//       genre; genre-relevant outlets weigh more), bias (points added on 0..100 before scaling), weights: { quality,
//       production, polish, recycled } (what this outlet cares about; recycled = how hard it punishes recycled drum
//       patterns, GG.songs.similarity), voice,
//       quotes: { awful, meh, good, great: [text] }          // any band, any genre
//       byBand: { <bandId>: { awful, meh, good, great } }    // extra pools for one band (member nicks, genre jokes)
//       recycled: [text] } } }                               // used when the tracklist recycles drum patterns
//   Pick: pool = quotes[b] + byBand[bandId][b] (when present); a heavily recycled album may use recycled instead.
// Tokens: {band} {album} {single} (the lead single's title) {nick:<memberId>}. The sim replaces {album} and {single},
// then GG.career.fillText does the rest. Quotes never state a number: the score is shown next to them.
// Voices: Rolling Scone is boomer-reverent; Proclaim! is breathless Canadiana; Pitchspork is insufferable (one decimal);
// Deci-Hell writes in ALL CAPS; Tailgate Weekly is a country paper and is confused by metal. No USA content.
(function (GG) {
  GG.content.reviews = {
    scoreBands: { awful: 0, meh: 40, good: 62, great: 80 },
    outlets: {
      rolling_scone: {
        id: 'rolling_scone', name: 'Rolling Scone', critic: 'Dale Whitcombe', scale: 5, decimals: 0, unit: 'stars', caps: false,
        genres: { metal: 0.6, punk: 0.7, rock: 1, country: 0.8 }, bias: 2,
        weights: { quality: 0.5, production: 0.2, polish: 0.3, recycled: 0.5 },
        voice: 'Boomer-reverent. Has been to 400 concerts and remembers 12. Everything is measured against a gatefold sleeve from 1972.',
        quotes: {
          awful: [
            'I played {album} for my record club. Gerald left early. Gerald has never left early.',
            "There's no warmth on {album}. You can't hug a record like this. I tried. My wife has asked me to stop hugging records.",
            'In my day this would have been a demo, and we would have been kind about it. It is not my day. It is, apparently, theirs.',
            "{band} have made a record for people who have never sat on a shag carpet and simply listened. I pity them. The people, not the band. Also the band."
          ],
          meh: [
            '{album} has moments. So did my second marriage. Neither quite earns the gatefold.',
            "{band} are young, and it shows, and one day it won't, and that record I will review kindly.",
            "There's a real song hiding inside {single}. It just needs a harmonica and thirty more years.",
            'Competent, loud, sincere. I kept waiting for a saxophone solo. It never came. I am still waiting.'
          ],
          good: [
            'Not since the golden age of prairie rock has a band made me put down my coffee and turn it up. My coffee is cold now. Worth it.',
            "{single} is the kind of song they used to play at the Ex. The good Ex, before the mini doughnuts got expensive.",
            'Real instruments, real sweat, real Saskatchewan. {album} belongs on vinyl, in a gatefold, next to your father\'s records.',
            'The drums on {album} swing like a screen door on a farmhouse in August. That is the highest praise I have.'
          ],
          great: [
            'Forty-one years reviewing records. I wept at {single}. My wife came in to check on me. She wept too. Then she asked who it was.',
            '{album} is a classic. I say that about once a decade, usually about a record from 1972.',
            'Put it on the turntable, pour a rye, call your kids. Tell them this is what music sounded like back when it mattered, which is now, somehow.',
            'I have seen the future of prairie music and it is {band}, and it wears a cape, and it is louder than my doctor would like.'
          ]
        },
        byBand: {
          hail_damage: {
            awful: [
              'Pleasant enough, if you enjoy being shouted at in French by a man in a bedsheet. I do not. I checked.',
              '{nick:dana} plays a guitar with eight strings. The Lord gave us six for a reason. {album} is the reason.'
            ],
            meh: [
              "I'm told metal is having a moment. {album} is having about half of one.",
              'The lyrics, I am informed by a teenager, are about a lawn. I have a lawn. I did not need an album about it.'
            ],
            good: [
              '{nick:marcel} sings like a man selling hail insurance to the devil, and closing. I bought a policy.',
              'Heavy music, yes, but with manners. The bass player never speaks in interviews. Neither did the greats.'
            ],
            great: [
              '{nick:marcel} sings like the last man in a burning barn, and the band plays like they are trying to save him. Essential.',
              'I do not like heavy metal. I like {album}. I am as confused as you are. Buy it on vinyl.'
            ]
          }
        },
        recycled: [
          'Track four is track two in a nicer shirt. I remember when bands wrote two whole songs.',
          'The drummer seems to know one beat, and to love it very much. So did every drummer in 1964. That was different.',
          'Half of {album} shares one drum pattern. My turntable thought it was skipping.'
        ]
      },

      proclaim: {
        id: 'proclaim', name: 'Proclaim!', critic: 'Kendra Beausoleil-Tran', scale: 10, decimals: 0, unit: '/10', caps: false,
        genres: { metal: 0.7, punk: 0.9, rock: 0.9, country: 0.7 }, bias: 5,
        weights: { quality: 0.4, production: 0.2, polish: 0.4, recycled: 0.4 },
        voice: 'Breathless Canadiana. Exclamation marks. Every record is the sound of a province, a season or a block heater.',
        quotes: {
          awful: [
            "Oh no! Oh, {band}! We wanted to love {album}! We wore the toque and everything! It's a slush puddle in April, friends!",
            'Listening to {album} is like a four-hour drive to Kenora behind a combine! We love you! We do not love this!',
            "We tried! We put it on at the cottage! The loons stopped singing! THE LOONS, {band}!"
          ],
          meh: [
            '{album} is a solid double-double of a record! Hot! Fine! Gone by lunch!',
            "{band} are almost there! It's a hockey rink in November: the ice is in, but nobody's flooded it!",
            'A perfectly nice record for a long weekend when the weather turns! Which it will! It always does!'
          ],
          good: [
            "WOW! {single} is a minus-forty morning when the truck finally starts! We cheered! The neighbours cheered!",
            "{album} tastes like a butter tart at a gas station at 2 a.m.: unexpected, sticky, perfect! Canada!",
            'This is the sound of the prairie sky doing that thing it does! You know the thing! {band} know the thing!'
          ],
          great: [
            "STOP EVERYTHING! {album} is the best thing to come out of the prairies since the prairies! Call your nan! Call your MP!",
            '{single} is a national anthem for people who shovel their own driveways! Which is all of us! GLORIOUS!',
            "We have listened to {album} eleven times on the train from Saskatoon to Jasper and cried at every elevator we passed! Masterpiece!"
          ]
        },
        byBand: {
          hail_damage: {
            awful: ["Metal from Saskatoon! We were SO ready! And then {album} happened! It happened for a long time!"],
            meh: ["Hail Damage's lyrics are in French, which is very Canadian of them! We checked! They're about a lawn! Also Canadian!"],
            good: ["{nick:marcel} in a cape, screaming in French about lawn care over a blast beat! Is anything MORE Canadian?! No!"],
            great: ["{band} are a hailstorm in July: loud, sudden, and absolutely everyone is talking about it at the Co-op! TEN TOQUES!"]
          }
        },
        recycled: [
          "Wait! Didn't we just hear this beat?! Two tracks ago?! And one track before that?!",
          'The drummer is sticking with what works! Like wearing the same parka for nine years! Respect! But also, a new parka!',
          "Some of these songs are wearing each other's snow pants, {band}!"
        ]
      },

      pitchspork: {
        id: 'pitchspork', name: 'Pitchspork', critic: 'Soren Vale-Quigley', scale: 10, decimals: 1, unit: '/10', caps: false,
        genres: { metal: 0.5, punk: 0.6, rock: 0.6, country: 0.4 }, bias: -10,
        weights: { quality: 0.3, production: 0.3, polish: 0.1, recycled: 0.3 },
        voice: 'Insufferable. Scores to one decimal. Mentions a band nobody has heard of in the first sentence. Loves weird producers.',
        quotes: {
          awful: [
            '{album} is not a record so much as a hostage situation with a tracklist. I listened on a wax cylinder, ironically. It did not help.',
            "One suspects {band} have never heard of the Finnish accordion-noise scene. It shows. It is all that shows.",
            '{single} is what happens when a band mistakes volume for a thesis. I have written a thesis. It was quieter than this.'
          ],
          meh: [
            "There's a better album buried in {album}, the way a better city is buried under every strip mall. Neither will be excavated.",
            '{band} gesture at post-rural dread without committing to it. I committed to it years ago. I live in a converted church.',
            '{single} is fine. I hate that it is fine. "Fine" is the sound a genre makes as it dies.'
          ],
          good: [
            '{album} is a hauntological document of the grain economy. I am almost certain the band does not know this. That is the point.',
            'The hi-hat on {single} functions as a metaphor for late-stage canola futures. I cried, but critically.',
            'Against every one of my principles, {album} slaps. I have filed a complaint with myself.'
          ],
          great: [
            '{album} is the record the prairies have been dreaming, fitfully, under a duvet of snow. Best New Music. I will not be taking questions.',
            'Rarely does a band make me reconsider my entire vinyl shelf. I have sold it. I now own only {album}. And one cassette from Tromsø.',
            '{band} have made the rarest thing: an album I cannot be clever about. This has never happened. I need to lie down in my church.'
          ]
        },
        byBand: {
          hail_damage: {
            awful: ['Lyrics about a lawn, sung in French, over a metal band that has clearly never read theory. Any theory. Of anything.'],
            meh: ['{nick:dana} solos the way a toddler narrates: with total conviction and no sense of an ending.'],
            good: ["{nick:marcel}'s lawn lyrics are, read correctly, about the enclosure of the commons. Read incorrectly, they are about a lawn."],
            great: ['The bassist, Kenji Blackbird, reportedly declined to be interviewed by declining to be anywhere. It is the most radical act on any record this decade.']
          }
        },
        recycled: [
          'By the fourth song sharing one drum pattern, the pattern becomes a character. By the sixth, a hostage.',
          'The drummer has found a groove and would like to be buried in it. Across several tracks. It is almost conceptual. It is not conceptual.',
          'Recycling is good for the planet. It is less good for a tracklist.'
        ]
      },

      deci_hell: {
        id: 'deci_hell', name: 'Deci-Hell', critic: 'ANONYMOUS (PHOTOCOPIED AT THE DOWNTOWN LIBRARY)', scale: 5, decimals: 0, unit: 'skulls', caps: true,
        genres: { metal: 1, punk: 0.5, rock: 0.3, country: 0.1 }, bias: 0,
        weights: { quality: 0.3, production: 0.4, polish: 0.3, recycled: 0.6 },
        voice: 'A photocopied metal zine. ALL CAPS, ALWAYS. Rates in skulls. Nobody knows who writes it. Kenji might.',
        quotes: {
          awful: [
            '{album} IS WEAKER THAN LIBRARY COFFEE. WE KNOW. WE PRINT THIS AT THE LIBRARY.',
            'WHERE ARE THE RIFFS. WE LOOKED. WE CHECKED UNDER {single}. NO RIFFS. ONLY SADNESS AND A TAMBOURINE.',
            '{band} HAVE MADE A RECORD YOU COULD PLAY AT A BABY SHOWER. SOMEONE WILL. THEY WILL BE WRONG.'
          ],
          meh: [
            '{album} HAS TEETH BUT FORGOT TO BITE. GUMMED US A BIT. FELT WEIRD.',
            'HALF A RIFF STORM. THE OTHER HALF IS A LIGHT PRAIRIE DRIZZLE. BRING A HOODIE, NOT AN UMBRELLA.',
            '{single} IS FINE. METAL IS NOT SUPPOSED TO BE FINE. METAL IS SUPPOSED TO BE ON FIRE.'
          ],
          good: [
            '{album} RIPS. WE PLAYED IT IN THE STAIRWELL AND THE FIRE DOOR OPENED BY ITSELF.',
            '{single} HITS LIKE A GRAVEL TRUCK ON A GRID ROAD. WE FELT IT IN OUR FILLINGS. WE WANT MORE FILLINGS.',
            'HEAVY. HONEST. LOUD ENOUGH THAT THE LIBRARIAN CAME OVER. SHE STAYED FOR SIDE TWO.'
          ],
          great: [
            '{album} IS A BLIZZARD OF DOOM FROM WHICH NO GRID ROAD RETURNS. WE HAVE NOT SLEPT. WE WILL NOT SLEEP.',
            'ALL HAIL {band}. WE PHOTOCOPIED THIS REVIEW NINE HUNDRED TIMES. THE LIBRARY HAS BANNED US. WORTH IT.',
            'THIS IS THE HEAVIEST THING TO COME OUT OF THE PRAIRIES SINCE THE 1954 HAILSTORM. EVERY SKULL WE HAVE.'
          ]
        },
        byBand: {
          hail_damage: {
            awful: ['{nick:marcel} SCREAMS ABOUT HIS LAWN AGAIN. WE HAVE MET THE LAWN. THE LAWN DESERVES BETTER.'],
            meh: ['THE DRUMMER MAKES FACES. WE CAN HEAR THE FACES. PLEASE STOP MAKING THE FACES.'],
            good: ['{nick:jaxon} SNEAKS SHRED FILLS INTO THE CHUGS LIKE CONTRABAND. WE SEE YOU, {nick:jaxon}. KEEP DOING CRIMES.'],
            great: ['THE BASSIST HAS NEVER SPOKEN TO US. WE HAVE NEVER SPOKEN TO THE BASSIST. WE ARE BOTH AT PEACE. {album} IS PERFECT.']
          }
        },
        recycled: [
          'SAME BEAT. SAME BEAT. SAME BEAT. WE ARE NOT A DRUM MACHINE AND NEITHER ARE YOU.',
          'THE DRUMMER RECYCLED MORE PATTERNS THAN THE BOTTLE DEPOT. MINUS ONE SKULL. RECYCLE CANS, NOT BEATS.',
          'WE HEARD THIS GROOVE ON TRACK TWO. AND FIVE. AND SEVEN. IT IS A GOOD GROOVE. IT IS TIRED NOW.'
        ]
      },

      tailgate_weekly: {
        id: 'tailgate_weekly', name: 'Tailgate Weekly', critic: 'Loretta Mae Gerbrandt', scale: 100, decimals: 0, unit: '/100', caps: false,
        genres: { metal: 0.2, punk: 0.3, rock: 0.6, country: 1 }, bias: 0,
        weights: { quality: 0.5, production: 0.2, polish: 0.3, recycled: 0.3 },
        voice: 'A country paper from Swift Current, printed next to the livestock report. Scores albums like a 4-H steer show. Confused by metal, polite about it.',
        quotes: {
          awful: [
            "We'd call {album} a steer with poor conformation. Weak through the middle, and it kicked the judge.",
            "We played {album} at the auction mart. Two heifers left without being sold. That's never happened.",
            "Bless their hearts. {band} tried. So did the Johnsons' boy with the fiddle, and we don't talk about that either."
          ],
          meh: [
            '{album} is a fair to middling crop in a dry year. You could sell it. You could not brag at coffee row.',
            'Sturdy enough. {single} would do fine at a small-town dance, after the good band has gone home.',
            'Pleasant enough to fix a fence to. We fixed two. Neither fence has an opinion.'
          ],
          good: [
            "{single} has a hook you could hang a saddle on. Grandma tapped her foot. Grandma doesn't tap.",
            '{album} is a good honest record with strong shoulders. Blue ribbon in its class, and the class was tough this year.',
            'We played {album} in the truck from Swift Current to Maple Creek and did not change the station once. High praise out here.'
          ],
          great: [
            '{album} is grand champion of the whole fair. Best in show. We would put it on the cover next to the prize bull, and we do not say that lightly.',
            "{single} is the kind of song you hear once at a wedding social and hum till harvest. We're humming it now. Harvest is in September.",
            'Grandpa took his hat off during {single}. He has not done that since the curling rink burned down in 1987.'
          ]
        },
        byBand: {
          hail_damage: {
            awful: [
              "We were told this was a hoedown. It was not a hoedown. We are still not certain what it was. Is the tall gentleman okay?",
              "The singer is either French or very upset. Possibly both. We sent a casserole."
            ],
            meh: [
              "Our reviewer played {album} on the truck radio and the truck made a noise too. We have taken the truck in.",
              "There's no fiddle on {album}, but there is a lady who plays a guitar with a lot of strings. Eight. We counted twice."
            ],
            good: [
              "We don't understand this music, but the cattle were very calm afterwards. Tired, maybe. Something happened to them.",
              "Heavy stuff. But the drummer has the good steady feel of a man who has baled hay, and we respect that."
            ],
            great: [
              "We still don't know what kind of music this is. Neither does the pastor. But the whole congregation bought one.",
              "Our barn cats sat in a circle and listened to all of {album} without moving. Blue ribbon. We are a little scared."
            ]
          }
        },
        recycled: [
          'Some of these songs are the same song wearing different boots.',
          "The beat on track three came back on track six like a stray dog. We fed it. It'll keep coming back now.",
          'The drummer has one good horse and rides it in every race.'
        ]
      }
    }
  };
})(window.GG);
