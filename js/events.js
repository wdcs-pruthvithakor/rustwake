'use strict';
/* Rustwake — event templates. Each is combined with procedural context (system, planet, civilisation, danger level).
   where: which situations can draw the event. Outcomes are weighted; f(X) applies effects via the helper in empire.js. */

const E = (id, title, where, text, choices, extra) => Object.assign({ id, title, where, text, choices }, extra || {});
const C = (l, out, req) => ({ l, out, req });

G.EVENTS = [
  /* ----- space anomalies ----- */
  E('strangestar', 'Strange Star', ['anomaly'], 'A knot of light hangs here that your instruments insist is a star. It is emitting negative energy. Your reactor gauge is climbing on its own.', [
    C('Open the collectors', [{ w: 3, t: 'The reactor drinks until the needles bend. Your engineers copy down everything.', f: X => { X.energy(1); X.sci(40); } }, { w: 1, t: 'The reactor drinks too much. Something important melts.', f: X => { X.hurt(0.3); X.sci(70); } }]),
    C('Sample it', [{ w: 1, t: 'A flask of light that weighs less than nothing. The lab will be busy for weeks.', f: X => { X.sci(90); X.res('crystal', 30); } }]),
    C('Leave it alone', X => { })
  ]),
  E('satellite', 'Ancient Satellite', ['anomaly', 'jump'], 'A satellite, tumbling slowly. Age: 4.7 billion years. Origin: unknown. It is still transmitting, very quietly, to no one.', [
    C('Download its memory', [{ w: 3, t: 'Star charts for constellations that no longer exist, and a few that still do.', f: X => { X.sci(60); X.tech(0.15); } }, { w: 1, t: 'It was a lure. Its owners left, but their defence drones did not.', f: X => { X.sci(30); X.fight('ai', 4); } }]),
    C('Salvage the hull', [{ w: 1, t: 'Whatever this alloy is, your smelters have never managed it.', f: X => { X.res('iron', 80); X.rare(); } }]),
    C('Take it home', [{ w: 2, t: 'It goes in a display case. Visitors pay to see it.', f: X => { X.credits(200); } }, { w: 1, t: 'On the way home it stops transmitting, and you find you miss the sound. It was not just a satellite.', f: X => X.arti(1) }])
  ]),
  E('impossible', 'Impossible Planet', ['anomaly'], 'There is a rogue planet here with no star. Isotope dating says it is older than the universe by a comfortable margin.', [
    C('Land', [{ w: 2, t: 'Under the dust is a floor. Under the floor, a room. In the room, a gift, clearly left for whoever came next.', f: X => X.arti(2) }, { w: 1, t: 'You land. Your clocks disagree with each other for a week afterward.', f: X => { X.sci(150); X.flat('chronocrystal', 1); } }, { w: 1, t: 'It did not want visitors.', f: X => { X.hurt(0.4); X.fight('ancient', 6); } }], X => true),
    C('Scan from orbit', [{ w: 1, t: 'Your scientists argue for a month and publish nothing they agree on.', f: X => X.sci(110) }]),
    C('Mark it and move on', X => X.sci(15))
  ], { minL: 4 }),
  E('eye', 'The Signal From Outside', ['anomaly'], 'Your dish points itself. Something is transmitting from outside the galaxy. It is a count. It is counting down. It is very, very slow.', [
    C('Listen', [{ w: 1, t: 'You record six hours of it. On playback the tape is blank, but your navigator has written a set of coordinates on her own arm.', f: X => { X.sci(200); X.heat(30); } }]),
    C('Answer', [{ w: 1, t: 'The count pauses. Resumes. You have the distinct impression of having been noticed.', f: X => { X.sci(120); X.heat(60); X.xp(20); } }, { w: 1, t: 'Something answers back in your own voice, saying something you have not said yet.', f: X => { X.tech(0.4); } }]),
    C('Turn the dish away', X => { })
  ], { minL: 8 }),
  E('cloud', 'Singing Nebula', ['anomaly', 'jump'], 'A pocket of gas resonates against your hull. The whole ship hums one enormous chord.', [
    C('Harvest the gas', [{ w: 3, t: 'Tanks full. The humming follows you for a while.', f: X => { X.res('gas', 120); } }, { w: 1, t: 'The chord changes key. Something large was sleeping in there.', f: X => { X.res('gas', 60); X.fight('creature', 5); } }]),
    C('Record the song', [{ w: 1, t: 'It tops the charts on three of your colonies.', f: X => { X.credits(180); X.sci(30); } }]),
    C('Fly through slowly', [{ w: 2, t: 'When you come out the other side there is a passenger.', f: X => X.comp() }, { w: 3, t: 'Beautiful. Nothing else happens.', f: X => X.xp(10) }])
  ]),
  E('graveyard', 'Battle Graveyard', ['anomaly', 'derelict'], 'Hundreds of hulls, two fleets, no survivors. Whatever they fought over, nobody collected it.', [
    C('Strip the wrecks', [{ w: 3, t: 'Good steel, better electronics.', f: X => { X.res('steel', 70); X.res('circuits', 35); } }, { w: 1, t: 'One of the wrecks is not as dead as it looked.', f: X => { X.res('steel', 40); X.fight('ai', 5); } }]),
    C('Find the flagship', [{ w: 1, t: 'In the admiral\'s safe: a weapon schematic generations ahead of yours.', f: X => X.upg('weapon') }, { w: 1, t: 'The flagship\'s log is intact. Your tacticians read it like scripture.', f: X => { X.sci(120); } }, { w: 1, t: 'The flagship has a caretaker.', f: X => X.fight('ancient', 7, true) }]),
    C('Hold a moment of silence and go', X => X.xp(5))
  ]),
  E('lens', 'Gravitational Lens', ['anomaly'], 'Space is folded here like a pocket. Through the fold you can see a system that, by your charts, is four hundred light-years away.', [
    C('Chart what you can see', [{ w: 1, t: 'Free survey data.', f: X => { X.sci(70); } }]),
    C('Push the ship through', [{ w: 1, t: 'It was a door after all.', f: X => X.wormhole() }, { w: 1, t: 'It was a mirror. You hit it.', f: X => X.hurt(0.35) }]),
    C('Leave', X => { })
  ], { minL: 3 }),
  E('garden', 'Drifting Garden', ['anomaly', 'jump'], 'A sphere of ice with a forest inside it, tumbling through the dark. Things move between the trees.', [
    C('Dock and explore', [{ w: 2, t: 'Something small and curious follows your crew back aboard.', f: X => X.comp() }, { w: 1, t: 'Seeds, cuttings, and a soil chemistry your colonists will thank you for.', f: X => { X.sci(60); X.res('crystal', 40); } }, { w: 1, t: 'The forest is one animal. It is hungry.', f: X => { X.hurt(0.25); X.fight('creature', 6); } }]),
    C('Tow it to a colony', [{ w: 1, t: 'It becomes a park. People are happier.', f: X => X.credits(300) }]),
    C('Admire it and go', X => X.xp(8))
  ]),
  E('mirror', 'Your Own Ship', ['anomaly'], 'Ahead: a ship with your registration, your scorch marks, your patched hull. It is derelict. It has been derelict for a long time.', [
    C('Board it', [{ w: 1, t: 'The log\'s last entry is today\'s date. In the hold is everything you were carrying, and one thing you were not.', f: X => X.arti(2) }, { w: 1, t: 'The reactor is still warm. You take its core. You try not to think about it.', f: X => X.upg('reactor') }]),
    C('Hail it', [{ w: 1, t: 'It hails back, half a second before you press the button.', f: X => { X.sci(180); X.heat(25); } }]),
    C('Change course. Do not look back.', X => { })
  ], { minL: 10, once: true }),
  E('whale', 'Migration', ['anomaly', 'jump'], 'A pod of void leviathans crosses your bow, each one the size of a moon, ignoring you completely.', [
    C('Follow them', [{ w: 2, t: 'They lead you to their feeding ground: a field of ore they have no use for.', f: X => { X.rare(); X.rare(); } }, { w: 1, t: 'A calf mistakes your ship for a toy.', f: X => X.hurt(0.3) }]),
    C('Harpoon a straggler', [{ w: 1, t: 'It was not a straggler. It was the rear guard.', f: X => X.fight('creature', 8, true) }]),
    C('Watch', X => X.xp(15))
  ], { minL: 5 }),
  E('monolith', 'Black Slab', ['anomaly', 'ruins'], 'A rectangle of absolute black, proportions 1:4:9, hanging in space. Your scanners report nothing there.', [
    C('Touch it', [{ w: 2, t: 'Your crew cannot describe what they learned, but they build better afterward.', f: X => X.tech(0.5) }, { w: 1, t: 'It rings like a bell. Everything for a light-year heard that.', f: X => { X.sci(100); X.heat(80); } }]),
    C('Measure it', [{ w: 1, t: 'The numbers go on being exact to as many places as you can measure.', f: X => X.sci(130) }]),
    C('Leave it', X => { })
  ], { minL: 6 }),
  E('timeloop', 'Stuttering Space', ['anomaly'], 'You have had this conversation before. You have had this conversation before. You have had', [
    C('Use it: run the lab experiment a thousand times', [{ w: 1, t: 'A thousand afternoons of work in one afternoon.', f: X => X.tech(0.7) }]),
    C('Use it: mine the same asteroid over and over', [{ w: 1, t: 'The hold fills with a thousand copies of one rock.', f: X => { X.res('iron', 200); X.res('crystal', 80); } }]),
    C('Break out', [{ w: 1, t: 'A piece of the loop comes with you.', f: X => X.flat('chronocrystal', 1) }, { w: 2, t: 'You get out. You think you get out.', f: X => { } }])
  ], { minL: 14 }),
  /* ----- derelicts ----- */
  E('alienship', 'Damaged Alien Ship', ['derelict', 'jump'], 'A vessel of unfamiliar design, venting atmosphere. Faint life signs. A distress loop in a language you do not have.', [
    C('Rescue', [{ w: 3, t: 'The survivors cannot thank you in words. Their people can, and do.', f: X => { X.relAll(6, 'Rescued a crew'); X.credits(150); } }, { w: 1, t: 'One survivor stays. It is not, strictly, a person.', f: X => X.comp() }]),
    C('Salvage', [{ w: 1, t: 'You take what is useful and leave what is breathing.', f: X => { X.res('circuits', 50); X.res('steel', 60); X.relAll(-3, 'Left a crew to die'); } }]),
    C('Ignore', X => { }),
    C('Attack', [{ w: 2, t: 'It dies easily. The cargo is yours.', f: X => { X.credits(400); X.rare(); X.relAll(-8, 'Fired on a ship in distress'); } }, { w: 1, t: 'The distress call was bait.', f: X => X.fight('pirate', 6) }])
  ]),
  E('lifeboat', 'Lifeboat', ['derelict', 'jump'], 'One pod, one occupant, forty years of cryosleep. They wake up asking who won the war. You have never heard of the war.', [
    C('Take them aboard', [{ w: 2, t: 'An old-school engineer. Your engines have never run so clean.', f: X => X.upg('engine') }, { w: 2, t: 'A gunner. A good one.', f: X => X.upg('weapon') }, { w: 1, t: 'A quartermaster with a key to a cache that should still be there.', f: X => { X.credits(600); X.res('steel', 100); } }]),
    C('Sell the pod', [{ w: 1, t: 'Antique. Fetches a price.', f: X => X.credits(250) }])
  ]),
  E('freighter', 'Ghost Freighter', ['derelict'], 'A bulk hauler on autopilot, crew long gone, still running its route between two ports that no longer exist.', [
    C('Crack the holds', [{ w: 3, t: 'Ore, stacked to the ceiling.', f: X => { X.res('iron', 150); X.res('copper', 80); X.res('silicon', 80); } }, { w: 1, t: 'The hold is full of something that was once food.', f: X => X.credits(20) }]),
    C('Reprogram it to run to your colonies', [{ w: 1, t: 'It will never arrive anywhere, but its pilot AI is a patient teacher.', f: X => X.sci(100) }], X => true),
    C('Follow its route', [{ w: 1, t: 'It leads you to its last depot.', f: X => { X.rare(); X.credits(300); } }, { w: 1, t: 'It leads you to what ate its crew.', f: X => X.fight('creature', 7) }])
  ]),
  E('prison', 'Prison Hulk', ['derelict'], 'A sealed transport. The manifest lists one prisoner and four hundred guards. The guards are dead of old age.', [
    C('Open the cell', [{ w: 1, t: 'It thanks you politely and leaves through the wall. It left something behind as payment.', f: X => X.arti(2) }, { w: 1, t: 'You understand now why there were four hundred guards.', f: X => X.fight('dim', 8, true) }]),
    C('Weld it shut and tow it into a star', [{ w: 1, t: 'On the way, you hear knocking. Rhythmic. Patient.', f: X => { X.xp(20); X.sci(40); } }]),
    C('Loot the armoury only', [{ w: 1, t: 'Guard-issue shield emitters. Vintage but excellent.', f: X => X.upg('shield') }])
  ], { minL: 9 }),
  E('seedship', 'Sleeper Ship', ['derelict'], 'Ten thousand colonists in cold sleep, bound for a star that went nova before they launched.', [
    C('Wake them and offer them a home', [{ w: 1, t: 'They accept. Your colonies swell.', f: X => { for (const pid in G.S.colonies) G.S.colonies[pid].pop *= 1.25; X.lines.push('All colonies: population +25%'); X.credits(100); } }]),
    C('Leave them dreaming', X => X.xp(10)),
    C('Strip the ship around them', [{ w: 1, t: 'You tell yourself the pods have their own power. They do. For a while.', f: X => { X.res('steel', 200); X.res('circuits', 120); X.relAll(-10, 'Atrocity'); } }])
  ], { minL: 3 }),
  /* ----- ruins ----- */
  E('vault', 'Sealed Vault', ['ruins'], 'A door the size of a city, set into an asteroid. There is a lock. The lock is a question.', [
    C('Answer honestly', [{ w: 2, t: 'The door opens.', f: X => X.arti(2) }, { w: 1, t: 'The door opens. The room is empty. The answer was the point.', f: X => X.tech(0.6) }]),
    C('Cut through', [{ w: 1, t: 'It takes a week. The defences take less.', f: X => { X.fight('ancient', 8); X.arti(1); } }]),
    C('Walk away', X => { })
  ]),
  E('library', 'Drowned Library', ['ruins'], 'Shelves of crystal lattice, most of them cracked. A few still hum.', [
    C('Read what survives', [{ w: 1, t: 'Mathematics. Beautiful, alien, immediately useful.', f: X => { X.sci(220); } }]),
    C('Take the lattices', [{ w: 1, t: 'Data storage far denser than anything you make.', f: X => { X.res('rcrystal', 40); X.res('crystal', 120); } }]),
    C('Look for the librarian', [{ w: 1, t: 'It is still here. It is glad of the company. It asks to come along.', f: X => X.comp() }, { w: 1, t: 'It is still here. It does not lend to barbarians.', f: X => X.fight('ancient', 6) }])
  ]),
  E('factory', 'Running Factory', ['ruins'], 'An automated foundry, still running. It has filled its own warehouse, then its own corridors, then its own orbit, with identical unlabelled parts.', [
    C('Take the parts', [{ w: 1, t: 'Nobody knows what they are for. They melt down beautifully.', f: X => { X.res('steel', 160); X.res('alloy', 12); } }]),
    C('Find the off switch', [{ w: 1, t: 'It was not an off switch.', f: X => X.fight('ai', 7) }, { w: 2, t: 'The foundry sighs to a halt. Its control core is yours.', f: X => { X.res('circuits', 150); X.sci(80); } }]),
    C('Give it a new blueprint', [{ w: 1, t: 'It starts making your hull plating instead, and ships a batch at once.', f: X => X.upg('hull') }], X => true)
  ]),
  E('throne', 'Empty Throne', ['ruins'], 'A hall under a dead world. Ten thousand seats face one chair. The chair is sized for something that was not built like you.', [
    C('Sit', [{ w: 1, t: 'Lights come on across three star systems. Something has been waiting for a ruler. It will be disappointed, but it pays up front.', f: X => { X.credits(1500); X.heat(40); } }, { w: 1, t: 'The chair considers you and finds you adequate.', f: X => X.arti(3) }]),
    C('Search the hall', [{ w: 1, t: 'Regalia. Heavy, radioactive, priceless.', f: X => { X.res('platinum', 20); X.res('uranium', 30); } }]),
    C('Leave it for whoever it is for', X => X.xp(12))
  ], { minL: 12 }),
  E('tombs', 'Star Tombs', ['ruins'], 'A ring of mausoleums in close solar orbit. Each one holds a single enormous heart-shaped crystal, still beating with light.', [
    C('Take one', [{ w: 1, t: 'It is warm in the hold. It keeps beating.', f: X => { X.flat('stellarheart', 1); X.heat(50); } }, { w: 1, t: 'The tombs have guardians.', f: X => { X.fight('ancient', 10, true); X.flat('stellarheart', 1); } }]),
    C('Study them where they lie', [{ w: 1, t: 'This is how they kept a star alive past its time.', f: X => X.sci(400) }]),
    C('Pay your respects', X => X.relAll(3, 'Honoured the dead'))
  ], { minL: 26 }),
  /* ----- jump-in encounters ----- */
  E('toll', 'Toll Booth', ['jump'], 'A pirate cutter matches your vector. "Nice ship. Rusty, but nice. Be a shame."', [
    C('Pay the toll', [{ w: 1, t: 'They take the money and, to your surprise, leave.', f: X => X.lose('credits', 0.15) }]),
    C('Refuse', [{ w: 1, t: 'They had friends.', f: X => X.fight('pirate', 5) }]),
    C('Bluff', [{ w: 1, t: '"…Sorry, didn\'t recognise you. No charge."', f: X => X.credits(60) }, { w: 1, t: 'They are not fooled.', f: X => X.fight('pirate', 7) }])
  ]),
  E('trader', 'Wandering Trader', ['jump'], 'A lumpy little ship covered in antennae. "Buying! Selling! Mostly selling! You look like someone who needs something."', [
    C('Buy the mystery crate (20% of your credits)', [{ w: 2, t: 'Ore. Good ore.', f: X => { X.lose('credits', 0.2); X.rare(); X.rare(); } }, { w: 1, t: 'It is a rock. A normal rock.', f: X => { X.lose('credits', 0.2); X.flat('iron', 1); } }, { w: 1, t: '"You have a good eye," says the trader, a little sadly.', f: X => { X.lose('credits', 0.2); X.arti(2); } }]),
    C('Sell them your scan data', [{ w: 1, t: 'A fair price.', f: X => X.credits(220) }]),
    C('Wave and move on', X => { })
  ]),
  E('refugees', 'Refugee Convoy', ['jump'], 'Forty ships, none of them warships, running from something behind them. They ask for fuel.', [
    C('Give them energy', [{ w: 1, t: 'They will remember this. So will everyone they tell.', f: X => { X.energy(-0.5); X.relAll(5, 'Aided refugees'); X.xp(10); } }]),
    C('Ask what they are running from', [{ w: 1, t: 'They do not have a word for it. They draw you a circle with nothing inside.', f: X => X.sci(60) }]),
    C('Offer them a colony', [{ w: 1, t: 'They accept with a dignity that embarrasses you.', f: X => { for (const pid in G.S.colonies) G.S.colonies[pid].pop *= 1.12; X.lines.push('All colonies: population +12%'); } }])
  ]),
  E('object', 'Approaching Object', ['jump', 'colony'], 'A strange object is approaching. It is not on a ballistic course. It corrects, every few hours, to keep heading exactly toward you.', [
    C('Scan', [{ w: 1, t: 'It is a probe. It scans you back, exchanges data, and leaves.', f: X => X.sci(120) }, { w: 1, t: 'The scan wakes it up.', f: X => X.fight('ai', 6) }]),
    C('Destroy', [{ w: 1, t: 'It comes apart into very valuable pieces.', f: X => { X.res('circuits', 90); X.rare(); } }, { w: 1, t: 'It was a messenger. Whoever sent it now knows where you are and what you are like.', f: X => { X.heat(60); X.relAll(-3, 'Destroyed a messenger'); } }]),
    C('Follow it back', [{ w: 1, t: 'It leads you a long way, to something its makers wanted found.', f: X => X.arti(1) }]),
    C('Ignore', X => { })
  ]),
  E('storm', 'Ion Storm', ['jump'], 'You drop out of FTL into a wall of lightning.', [
    C('Ride it out', [{ w: 1, t: 'Shields gone, some hull gone, crew shaken.', f: X => X.hurt(0.25) }, { w: 1, t: 'You come through untouched. Luck.', f: X => { } }]),
    C('Extend the collectors', [{ w: 1, t: 'Risky. Lucrative.', f: X => { X.energy(1); X.hurt(0.12); } }]),
    C('Full burn through the eye', [{ w: 1, t: 'In the calm at the centre, something has been sheltering for a long time.', f: X => X.comp() }, { w: 2, t: 'You make it. Nothing in the eye but quiet.', f: X => X.xp(6) }])
  ]),
  E('duel', 'A Challenge', ['jump'], 'A lone warship, immaculate, hails you. Its captain wishes to test themselves against a worthy opponent and has decided, for reasons unclear, that this is you.', [
    C('Accept', [{ w: 1, t: 'Battle stations.', f: X => X.fight('empire', 6, true) }]),
    C('Decline politely', [{ w: 1, t: 'They are disappointed but gracious.', f: X => { } }]),
    C('Decline rudely', [{ w: 1, t: 'They are no longer gracious.', f: X => X.fight('empire', 9, true) }])
  ], { minL: 4 }),
  /* ----- colony events ----- */
  E('independence', 'A Vote', ['colony'], c => 'The population of ' + c.planet.name + ' requests independence. The petition has a lot of signatures.', [
    C('Allow greater autonomy', [{ w: 1, t: 'Productivity rises. So do their opinions.', f: X => { X.pop(0.2); X.credits(200); } }]),
    C('Deny', [{ w: 1, t: 'There are strikes. Then there are fewer strikers.', f: X => X.pop(-0.2) }, { w: 1, t: 'They grumble and go back to work.', f: X => { } }]),
    C('Negotiate', [{ w: 2, t: 'A new charter, a holiday, a statue. Everyone is mostly satisfied.', f: X => { X.pop(0.08); X.sci(40); } }, { w: 1, t: 'Negotiations collapse. A rival faction calls in outside help.', f: X => X.fight('pirate', 5) }])
  ]),
  E('plague', 'Something In The Water', ['colony'], c => 'A sickness is moving through ' + c.planet.name + '. It is not in any database.', [
    C('Quarantine', [{ w: 1, t: 'It burns out. So does a part of the colony.', f: X => X.pop(-0.15) }]),
    C('Pour research into a cure', [{ w: 2, t: 'Cured. And the cure has other uses.', f: X => { X.lose('sci', 0.3); X.pop(0.05); X.credits(400); } }, { w: 1, t: 'Too slow.', f: X => { X.lose('sci', 0.3); X.pop(-0.25); } }]),
    C('Let it run its course', [{ w: 1, t: 'The survivors are immune. There are fewer of them.', f: X => X.pop(-0.35) }, { w: 1, t: 'It turns out to be mostly harmless, and oddly euphoric.', f: X => X.pop(0.1) }])
  ]),
  E('find', 'The Miners Found Something', ['colony'], c => 'A deep shaft on ' + c.planet.name + ' has broken into a cavity that is clearly not natural.', [
    C('Send an expedition', [{ w: 2, t: 'They come back with their arms full.', f: X => { X.rare(); X.rare(); X.sci(60); } }, { w: 1, t: 'They come back with one thing, carried very carefully.', f: X => X.arti(1) }, { w: 1, t: 'They do not come back.', f: X => X.pop(-0.1) }]),
    C('Seal the shaft', X => { }),
    C('Widen the shaft and keep mining', [{ w: 1, t: 'Whatever built the cavity built it out of something excellent.', f: X => { X.res('titanium', 60); X.res('platinum', 10); } }])
  ]),
  E('boom', 'Baby Boom', ['colony'], c => 'For reasons the demographers are still arguing about, ' + c.planet.name + ' is having a very good year.', [
    C('Build schools', [{ w: 1, t: 'A generation of engineers.', f: X => { X.pop(0.15); X.sci(80); } }]),
    C('Build housing', [{ w: 1, t: 'Room for everyone.', f: X => X.pop(0.3) }]),
    C('Tax it', [{ w: 1, t: 'The treasury approves.', f: X => { X.credits(500); X.pop(0.05); } }])
  ]),
  E('cult', 'The Quiet Church', ['colony'], c => 'A new religion on ' + c.planet.name + ' teaches that the stars are being taken away one by one, and that this is good.', [
    C('Ban it', [{ w: 1, t: 'It goes underground, which is where it wanted to be.', f: X => X.pop(-0.05) }]),
    C('Study it', [{ w: 1, t: 'Their star charts are disturbingly accurate about which stars are missing.', f: X => X.sci(250) }]),
    C('Ask its prophet what they have seen', [{ w: 1, t: 'She gives you a small object she says she "was not carrying before".', f: X => X.arti(2) }, { w: 1, t: 'She only smiles.', f: X => X.xp(15) }])
  ], { minL: 6 }),
  E('strike', 'Breakthrough', ['colony'], c => 'A lab on ' + c.planet.name + ' reports a result so good that nobody believes it.', [
    C('Fund the replication', [{ w: 2, t: 'It replicates.', f: X => X.tech(0.5) }, { w: 1, t: 'It does not replicate, but the failure is interesting.', f: X => X.sci(100) }]),
    C('Weaponise it immediately', [{ w: 1, t: 'Your gunners are delighted.', f: X => X.upg('weapon') }, { w: 1, t: 'The prototype removes a wing of the lab.', f: X => X.pop(-0.05) }]),
    C('Sell the patent', [{ w: 1, t: 'Someone pays a great deal.', f: X => X.credits(900) }])
  ]),
  E('meteor', 'Incoming', ['colony'], c => 'A fragment the size of a city is on course for ' + c.planet.name + '. Impact in nine hours.', [
    C('Intercept with the colony guns', [{ w: 2, t: 'It breaks up in the upper atmosphere. The meteor shower is spectacular and the fragments are rich.', f: X => { X.res('iron', 140); X.rare(); } }, { w: 1, t: 'Most of it burns up.', f: X => X.pop(-0.1) }]),
    C('Evacuate the impact zone', [{ w: 1, t: 'Nobody dies. A district does.', f: X => X.pop(-0.06) }]),
    C('Mine it before it lands', [{ w: 1, t: 'A frantic nine hours. Worth it.', f: X => { X.res('platinum', 14); X.res('titanium', 50); X.pop(-0.03); } }])
  ]),
  /* ----- planet-surface anomalies ----- */
  E('structure', 'Unknown Structure', ['planet'], c => 'Scans of ' + c.planet.name + ' show a structure under the surface. Straight lines, right angles, a faint power reading.', [
    C('Excavate', [{ w: 2, t: 'A reactor of a kind you have only theorised about. Your engineers take notes until their hands cramp.', f: X => { X.sci(120); X.tech(0.2); } }, { w: 1, t: 'A storeroom. Whoever stocked it expected a long winter.', f: X => { X.rare(); X.res('rcrystal', 20); } }, { w: 1, t: 'A tomb, and a guard.', f: X => { X.fight('ancient', 5); X.arti(1); } }]),
    C('Send a drone first', [{ w: 1, t: 'Slow, safe, and modestly rewarding.', f: X => X.sci(70) }]),
    C('Log it for later', X => X.sci(10))
  ]),
  E('nativelife', 'Something Waving', ['planet'], c => 'On the night side of ' + c.planet.name + ', lights are being switched on and off in prime-number sequences.', [
    C('Signal back', [{ w: 2, t: 'They are shy, clever, and very interested in your reactor.', f: X => { X.sci(100); X.credits(150); } }, { w: 1, t: 'One of them wants to see the stars. You have room.', f: X => X.comp() }]),
    C('Observe quietly', [{ w: 1, t: 'A thick folder for the xenology department.', f: X => X.sci(80) }]),
    C('Land openly', [{ w: 1, t: 'They panic. Their defences are primitive but numerous.', f: X => X.hurt(0.15) }, { w: 1, t: 'They throw a festival.', f: X => { X.credits(300); X.xp(10); } }])
  ]),
  E('geode', 'World Geode', ['planet'], c => 'A canyon on ' + c.planet.name + ' opens into a hollow lined with crystal the size of towers.', [
    C('Harvest carefully', [{ w: 1, t: 'The hold glitters.', f: X => { X.res('crystal', 200); X.res('rcrystal', 20); } }]),
    C('Blast it loose', [{ w: 1, t: 'More crystal, more quickly, and a great deal of it ruined.', f: X => X.res('crystal', 320) }, { w: 1, t: 'The resonance from the blast cracks your hull plating.', f: X => { X.res('crystal', 200); X.hurt(0.2); } }]),
    C('Look deeper', [{ w: 1, t: 'At the centre, one crystal is a different colour, and is thinking.', f: X => { X.flat('darkcrystal', 3); X.sci(90); } }])
  ]),
  E('wreckplanet', 'Crash Site', ['planet'], c => 'A furrow twelve kilometres long ends in the wreck of something that fell onto ' + c.planet.name + ' a very long time ago.', [
    C('Search the cockpit', [{ w: 1, t: 'The pilot\'s last act was to hide something under the seat.', f: X => X.arti(1) }, { w: 2, t: 'Flight recorders, still readable.', f: X => X.sci(110) }]),
    C('Cut out the engine', [{ w: 1, t: 'A drive design that makes yours look like a campfire.', f: X => X.upg('ftl') }]),
    C('Strip it for metal', [{ w: 1, t: 'Hull metal that shrugs off your cutters. Eventually you win.', f: X => { X.res('titanium', 70); X.res('steel', 100); } }])
  ]),
  /* ----- special / scripted ----- */
  E('firstcontact', 'First Contact', [], c => c.civ.name + ' — ' + c.civ.gov + '. The ' + c.civ.species + ' are ' + c.civ.body + ' and, by reputation, ' + c.civ.pers.n.toLowerCase() + '. ' + c.civ.quirk.n + ' A patrol ship is hailing you.', [
    C('Open with a gift', [{ w: 1, t: 'Accepted. A good beginning.', f: X => { X.lose('credits', 0.1); X.rel(15, 'A good first impression'); } }]),
    C('Exchange star charts', [{ w: 1, t: 'A cautious, useful trade.', f: X => { X.rel(6, 'Exchanged charts'); X.sci(60); } }]),
    C('Say nothing and watch', [{ w: 1, t: 'They watch back.', f: X => { } }]),
    C('Arm weapons', [{ w: 1, t: 'A clear statement. They make one in return.', f: X => { X.rel(-25, 'Hostile first contact'); X.fight('empire', 5); } }])
  ]),
  E('wormhole', 'Wormhole', ['wormhole'], 'A hole in space, edged with light bent double. Destination unknown.', [
    C('Go through', [{ w: 1, t: 'Everything stretches. Then you are somewhere else.', f: X => X.wormhole() }]),
    C('Send a probe', [{ w: 1, t: 'The probe returns ninety years older, with a full memory bank.', f: X => X.sci(90) }]),
    C('Stay here', X => { })
  ]),
  E('signal0', 'The Signal — Source One', ['signal0'], 'The transmitter is a buoy the size of your thumb, older than your species. It repeats one message: a map with five points on it. This is the first. As you watch, it stops transmitting, as if its job is done.', [
    C('Take the buoy', [{ w: 1, t: 'The second point is now marked on your charts.', f: X => { X.signal(); X.sci(80); } }])
  ], { once: true }),
  E('signal1', 'The Signal — Source Two', ['signal1'], 'A wrecked observatory, every instrument pointed at the same patch of empty sky. The last log entry reads: "Counted again. One fewer."', [
    C('Copy the logs', [{ w: 1, t: 'Centuries of observations of stars that are not there. The third point is marked.', f: X => { X.signal(); X.sci(300); } }])
  ], { once: true }),
  E('signal2', 'The Signal — Source Three', ['signal2'], 'A fleet, parked in perfect formation, crews at their stations, all long dead. No battle damage. Their guns point outward in every direction at once.', [
    C('Board the flagship', [{ w: 1, t: 'The admiral\'s final order: "Do not let it hear the engines." You take what you can carry, quietly.', f: X => { X.signal(); X.arti(2); X.sci(900); } }])
  ], { once: true }),
  E('signal3', 'The Signal — Source Four', ['signal3'], 'A planet-sized machine, its purpose obvious even across the gulf of species: it is an anchor. It was built to hold something still. It failed, and half of it is simply missing, edges smooth as glass.', [
    C('Study the half that remains', [{ w: 1, t: 'You do not yet understand it. You will. The last point is marked.', f: X => { X.signal(); X.sci(4000); X.legend(); } }])
  ], { once: true }),
  E('signal4', 'The Signal — The End Of It', ['signal4'], 'There is nothing here. No buoy, no wreck. Your charts show a star at these coordinates. Your eyes show none. Then your charts stop showing it too, and you find you are no longer sure there ever was one. The signal was not a call for help. It was a warning, and by following it, with your engines and your bright colonies, you have been very, very loud.', [
    C('Go home. Quickly.', [{ w: 1, t: 'Behind you, another star goes out.', f: X => { X.signal(); X.sci(20000); } }])
  ], { once: true })
];
G.EVENT = {};
for (const e of G.EVENTS) G.EVENT[e.id] = e;
