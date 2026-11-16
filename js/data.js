'use strict';
/* Rustwake — static content tables. No logic beyond tiny lookups. */

/* ---------- Resources ---------- */
// t: tier group, v: credit value, minL: system danger level where it starts to appear in the wild
G.RES = {
  credits: { n: 'Credits', c: '#ffd76a', t: 'core', v: 1 },
  energy: { n: 'Energy', c: '#6ee7ff', t: 'core', v: 0.5 },
  sci: { n: 'Research', c: '#b89bff', t: 'core', v: 2 },
  iron: { n: 'Iron', c: '#b7a79b', t: 'common', v: 1, minL: 0 },
  copper: { n: 'Copper', c: '#e08a4f', t: 'common', v: 1.5, minL: 0 },
  silicon: { n: 'Silicon', c: '#9fb4c9', t: 'common', v: 1.5, minL: 0 },
  crystal: { n: 'Crystal', c: '#7df0e0', t: 'common', v: 2.5, minL: 0 },
  gas: { n: 'Hydrogen', c: '#f3b6ff', t: 'common', v: 2, minL: 2 },
  titanium: { n: 'Titanium', c: '#d9e4f2', t: 'uncommon', v: 8, minL: 3 },
  uranium: { n: 'Uranium', c: '#9dff5c', t: 'uncommon', v: 14, minL: 6 },
  platinum: { n: 'Platinum', c: '#f4f1e0', t: 'uncommon', v: 20, minL: 9 },
  darkcrystal: { n: 'Dark Crystal', c: '#8a5cff', t: 'rare', v: 80, minL: 13 },
  voidgas: { n: 'Void Gas', c: '#4b6bff', t: 'rare', v: 110, minL: 17 },
  quantumore: { n: 'Quantum Ore', c: '#ff5ce1', t: 'rare', v: 160, minL: 22 },
  stellarheart: { n: 'Stellar Heart', c: '#ffb13d', t: 'legendary', v: 5000, minL: 30 },
  ancientmatter: { n: 'Ancient Matter', c: '#c9ffb8', t: 'legendary', v: 8000, minL: 30 },
  chronocrystal: { n: 'Chrono Crystal', c: '#9ff3ff', t: 'legendary', v: 12000, minL: 36 },
  paradox: { n: 'Paradox Shard', c: '#ffffff', t: 'mythic', v: 250000, minL: 60 },
  steel: { n: 'Steel', c: '#8ea0b5', t: 'refined', v: 4 },
  circuits: { n: 'Circuits', c: '#57e389', t: 'refined', v: 7 },
  fuel: { n: 'Fusion Fuel', c: '#ff9ad5', t: 'refined', v: 6 },
  rcrystal: { n: 'Refined Crystal', c: '#3fe0ff', t: 'refined', v: 9 },
  alloy: { n: 'Advanced Alloy', c: '#c8b6ff', t: 'advanced', v: 30 },
  antimatter: { n: 'Antimatter', c: '#ff5c7a', t: 'advanced', v: 90 },
  qcrystal: { n: 'Quantum Crystal', c: '#6a8dff', t: 'advanced', v: 120 },
  nano: { n: 'Nanomaterial', c: '#aaffdd', t: 'advanced', v: 140 },
  exotic: { n: 'Exotic Energy', c: '#ffdf5c', t: 'exotic', v: 900 },
  ncrystal: { n: 'Neural Crystal', c: '#ff8cf0', t: 'exotic', v: 1100 },
  qmatter: { n: 'Quantum Material', c: '#d05cff', t: 'exotic', v: 1300 },
  singularity: { n: 'Bottled Singularity', c: '#ffffff', t: 'mythic', v: 400000 }
};
G.RES_ORDER = Object.keys(G.RES);
G.TIER_NAME = { core: 'Core', common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary', mythic: '????', refined: 'Refined', advanced: 'Advanced', exotic: 'Exotic' };
for (const k in G.RES) G.RES[k].id = k;

/* ---------- Stars ---------- */
// w: weight, e: energy multiplier for solar, r: draw radius
G.STARS = {
  M: { n: 'Red Dwarf', c: '#ff7a5c', w: 30, e: 0.6, r: 130 },
  K: { n: 'Orange Star', c: '#ffae6b', w: 20, e: 0.85, r: 160 },
  G: { n: 'Yellow Star', c: '#ffe28a', w: 16, e: 1, r: 180 },
  F: { n: 'White Star', c: '#fff6da', w: 10, e: 1.2, r: 200 },
  A: { n: 'Blue-White Star', c: '#cfe0ff', w: 7, e: 1.5, r: 220 },
  B: { n: 'Blue Giant', c: '#9fb8ff', w: 4, e: 2, r: 270 },
  O: { n: 'Hypergiant', c: '#7f9dff', w: 1.5, e: 3, r: 330 },
  RG: { n: 'Red Giant', c: '#ff5a3c', w: 4, e: 1.4, r: 320 },
  WD: { n: 'White Dwarf', c: '#e8f4ff', w: 4, e: 0.5, r: 80 },
  NS: { n: 'Neutron Star', c: '#b4fffb', w: 2, e: 2.5, r: 60, minL: 8 },
  BH: { n: 'Black Hole', c: '#201030', w: 1.2, e: 0.2, r: 110, minL: 12 },
  BIN: { n: 'Binary Pair', c: '#ffd9a0', w: 3, e: 1.6, r: 150 },
  PU: { n: 'Pulsar', c: '#c7a8ff', w: 1.2, e: 2.2, r: 70, minL: 15 },
  NEG: { n: 'Strange Star', c: '#7cffc4', w: 0.4, e: 4, r: 170, minL: 25 }
};

/* ---------- Planet types ---------- */
// hab: base habitability, bias: resource weights, pal: palette [deep, low, mid, high, peak], atm: atmosphere colour
G.PTYPES = {
  terran: { n: 'Terran', hab: 82, w: 6, bias: { iron: 3, copper: 2, silicon: 2, crystal: 1 }, pal: ['#12366e', '#1c5fa8', '#3c8a4a', '#7a8f52', '#f2f2f2'], atm: '#8cc8ff', sea: 0.52 },
  ocean: { n: 'Ocean', hab: 70, w: 5, bias: { gas: 2, crystal: 2, silicon: 1 }, pal: ['#0a2a66', '#1250a0', '#1f7fc4', '#49b6c9', '#e8fbff'], atm: '#8fe0ff', sea: 0.78 },
  jungle: { n: 'Jungle', hab: 74, w: 5, bias: { copper: 2, iron: 2, crystal: 1, uranium: 1 }, pal: ['#0f3f4a', '#16695a', '#1f8a3c', '#4fb04a', '#d6f08a'], atm: '#9dffb0', sea: 0.4 },
  savanna: { n: 'Savanna', hab: 66, w: 5, bias: { iron: 2, copper: 3, silicon: 2 }, pal: ['#1d4a6a', '#8a7a3a', '#b89b4a', '#d4b86a', '#f0e2b0'], atm: '#ffe2a0', sea: 0.25 },
  desert: { n: 'Desert', hab: 42, w: 8, bias: { silicon: 4, copper: 2, titanium: 2 }, pal: ['#8a4a22', '#b46a30', '#d49248', '#e8b870', '#f8e0a8'], atm: '#ffc27a', sea: 0 },
  tundra: { n: 'Tundra', hab: 48, w: 6, bias: { iron: 3, titanium: 2, crystal: 1 }, pal: ['#27405a', '#5a6f78', '#8a9a98', '#c2ccd0', '#ffffff'], atm: '#c8e8ff', sea: 0.3 },
  ice: { n: 'Ice', hab: 24, w: 8, bias: { crystal: 3, gas: 2, platinum: 1 }, pal: ['#3c6a9a', '#6aa0c8', '#a8d4ea', '#dcf2fa', '#ffffff'], atm: '#bfefff', sea: 0 },
  volcanic: { n: 'Volcanic', hab: 12, w: 7, bias: { iron: 4, titanium: 3, uranium: 2, platinum: 1 }, pal: ['#ff8a1c', '#c8320a', '#3a1a16', '#241414', '#5a3a30'], atm: '#ff7a3c', sea: 0.22, glow: 1 },
  barren: { n: 'Barren', hab: 8, w: 12, bias: { iron: 3, silicon: 3, titanium: 1 }, pal: ['#3a3836', '#55504c', '#77706a', '#948c84', '#b8b0a8'], atm: null, sea: 0, crater: 1 },
  toxic: { n: 'Toxic', hab: 14, w: 6, bias: { uranium: 3, gas: 3, copper: 1 }, pal: ['#3a4a10', '#667a18', '#94a824', '#c4d43c', '#f0f88a'], atm: '#c8ff4a', sea: 0.35 },
  crystal: { n: 'Crystal', hab: 30, w: 3, bias: { crystal: 6, darkcrystal: 2, silicon: 2 }, pal: ['#14365a', '#1f6a8a', '#38b8c4', '#8af0e8', '#f0ffff'], atm: '#7df0e0', sea: 0, facet: 1 },
  gas: { n: 'Gas Giant', hab: 0, w: 9, bias: { gas: 6, voidgas: 2 }, pal: ['#6a4a30', '#a8784a', '#d4a86a', '#e8cf9a', '#f8ecd0'], atm: '#ffd9a0', gas: 1, big: 1 },
  storm: { n: 'Storm Giant', hab: 0, w: 4, bias: { gas: 5, voidgas: 3, crystal: 1 }, pal: ['#1a2a6a', '#2a4aa8', '#4a7ad4', '#8ab0f0', '#e0f0ff'], atm: '#8ab0ff', gas: 1, big: 1 },
  metallic: { n: 'Metallic', hab: 10, w: 4, bias: { iron: 5, titanium: 4, platinum: 3, copper: 3 }, pal: ['#2a2e36', '#4a525e', '#78828e', '#a8b4c0', '#e8f0f8'], atm: null, sea: 0, crater: 1 },
  irradiated: { n: 'Irradiated', hab: 4, w: 4, bias: { uranium: 6, quantumore: 1, titanium: 2 }, pal: ['#1a2a14', '#2e4a1c', '#4a7a22', '#7ac83a', '#d0ff8a'], atm: '#8aff4a', sea: 0.1, glow: 1 },
  dark: { n: 'Dark World', hab: 6, w: 2.5, bias: { darkcrystal: 5, voidgas: 2, quantumore: 2 }, pal: ['#05040a', '#100c1c', '#1c1432', '#34205a', '#7a4ac8'], atm: '#6a3cff', sea: 0, minL: 10 },
  shattered: { n: 'Shattered', hab: 2, w: 2.5, bias: { iron: 4, platinum: 3, quantumore: 2, titanium: 3 }, pal: ['#ff5a1c', '#3a2a26', '#5a4a44', '#847468', '#b8a898'], atm: '#ff9a5c', sea: 0.18, glow: 1, minL: 6 },
  exotic: { n: 'Exotic', hab: 35, w: 1.2, bias: { quantumore: 4, darkcrystal: 3, voidgas: 3, crystal: 2 }, pal: ['#3a0a5a', '#a81c8a', '#ff5cb0', '#ffb05c', '#fff08a'], atm: '#ff8cf0', sea: 0.45, minL: 14 },
  living: { n: 'Living World', hab: 90, w: 0.7, bias: { crystal: 3, uranium: 2, darkcrystal: 2 }, pal: ['#3a0a1c', '#7a1430', '#b82a4a', '#e86a6a', '#ffd0b0'], atm: '#ff8a9a', sea: 0.5, minL: 18 },
  machine: { n: 'Machine World', hab: 20, w: 0.7, bias: { titanium: 5, platinum: 4, quantumore: 3, silicon: 4 }, pal: ['#0a0e14', '#1a2430', '#2e4458', '#3ad0e8', '#e8ffff'], atm: '#3ad0e8', sea: 0, grid: 1, minL: 20 },
  hollow: { n: 'Hollow World', hab: 55, w: 0.5, bias: { iron: 2, crystal: 4, darkcrystal: 3, platinum: 2 }, pal: ['#1a1a3a', '#3a3a6a', '#6a6aa8', '#a8a8e0', '#ffffff'], atm: '#b8b8ff', sea: 0.2, minL: 24 }
};

/* ---------- Planet traits ---------- */
// eff keys are colony-local multipliers: mine, sci, energy, ind, pop, credits, def, slots (flat)
G.TRAITS = {
  ruins: { n: 'Ancient Ruins', d: '+35% research here', eff: { sci: 0.35 } },
  veins: { n: 'Rich Veins', d: '+50% extraction here', eff: { mine: 0.5 } },
  tidal: { n: 'Tidally Locked', d: '+60% energy here', eff: { energy: 0.6 } },
  fertile: { n: 'Fertile Biosphere', d: '+60% population capacity', eff: { pop: 0.6 } },
  hollowcore: { n: 'Cavernous Crust', d: '+3 building slots', eff: { slots: 3 } },
  tectonic: { n: 'Violent Tectonics', d: '+80% extraction, -2 slots', eff: { mine: 0.8, slots: -2 } },
  aurora: { n: 'Permanent Aurora', d: '+30% energy, +15% research', eff: { energy: 0.3, sci: 0.15 } },
  megafauna: { n: 'Megafauna', d: '+25% population capacity, +20% credits', eff: { pop: 0.25, credits: 0.2 } },
  vault: { n: 'Precursor Vault', d: 'Something is buried here. Colonise to open it.', eff: {}, vault: 1 },
  lowgrav: { n: 'Low Gravity', d: '+40% industry here', eff: { ind: 0.4 } },
  highgrav: { n: 'Crushing Gravity', d: '+40% extraction, -20% population', eff: { mine: 0.4, pop: -0.2 } },
  resonant: { n: 'Resonant Mantle', d: 'Crystal yields doubled', eff: { crystalx: 1 } },
  trade: { n: 'Old Trade Beacon', d: '+80% credits here', eff: { credits: 0.8 } },
  fortress: { n: 'Natural Fortress', d: '+100% defense here', eff: { def: 1 } },
  psionic: { n: 'Psionic Field', d: '+70% research, colonists dream in unison', eff: { sci: 0.7 } },
  rings: { n: 'Ring Shepherds', d: '+2 slots, +20% extraction', eff: { slots: 2, mine: 0.2 } },
  timeslip: { n: 'Time Slippage', d: 'Everything here runs 40% faster', eff: { mine: 0.4, sci: 0.4, ind: 0.4, energy: 0.4 }, minL: 20 },
  cursed: { n: 'Wrong Geometry', d: '+150% research, -40% population. Colonists avoid the horizon.', eff: { sci: 1.5, pop: -0.4 }, minL: 15 }
};

/* ---------- Buildings ---------- */
// cost: level-1 cost (scaled by cm^level). ext: extracted resources (per richness star). inp/out: conversion per level per second.
// pw: energy per level per second (+produces / -consumes). req: unlock flag.
G.BLD = {
  mine: { n: 'Mine', cat: 'Resource', d: 'Extracts iron, copper and silicon.', cost: { iron: 40 }, ext: ['iron', 'copper', 'silicon'], rate: 0.2, pw: -0.3 },
  extractor: { n: 'Crystal Extractor', cat: 'Resource', d: 'Extracts crystal and dark crystal.', cost: { iron: 60, copper: 25 }, ext: ['crystal', 'darkcrystal'], rate: 0.14, pw: -0.5 },
  harvester: { n: 'Gas Harvester', cat: 'Resource', d: 'Skims hydrogen and void gas.', cost: { steel: 40, copper: 40 }, ext: ['gas', 'voidgas'], rate: 0.18, pw: -0.5, req: 'b_harvester' },
  deepdrill: { n: 'Deep Core Drill', cat: 'Resource', d: 'Reaches titanium, uranium and platinum.', cost: { steel: 80, circuits: 30 }, ext: ['titanium', 'uranium', 'platinum'], rate: 0.08, pw: -1.2, req: 'b_deepdrill' },
  siphon: { n: 'Exotic Siphon', cat: 'Resource', d: 'Draws quantum ore out of the crust, slowly.', cost: { alloy: 200, rcrystal: 100 }, ext: ['quantumore'], rate: 0.035, pw: -5, req: 'b_siphon' },
  solar: { n: 'Solar Farm', cat: 'Energy', d: 'Energy scaled by sunlight on this world.', cost: { iron: 30, crystal: 12 }, pw: 2, solar: 1 },
  geothermal: { n: 'Geothermal Tap', cat: 'Energy', d: 'Steady energy. Doubled on volcanic and shattered worlds.', cost: { steel: 60, titanium: 20 }, pw: 7, req: 'b_geothermal' },
  fusion: { n: 'Fusion Reactor', cat: 'Energy', d: 'Burns fusion fuel for a lot of energy.', cost: { alloy: 80, circuits: 100 }, inp: { fuel: 0.1 }, out: { energy: 40 }, req: 'b_fusion' },
  qreactor: { n: 'Quantum Reactor', cat: 'Energy', d: 'Burns antimatter for absurd energy.', cost: { nano: 200, qcrystal: 80 }, inp: { antimatter: 0.04 }, out: { energy: 600 }, req: 'b_qreactor' },
  dysoncol: { n: 'Dyson Collector', cat: 'Energy', d: 'Receives beamed power. Scales with Dyson stages in this system.', cost: { alloy: 500, circuits: 500 }, pw: 150, dyson: 1, req: 'b_dysoncol' },
  smelter: { n: 'Smelter', cat: 'Industry', d: 'Iron → Steel', cost: { iron: 80, copper: 30 }, inp: { iron: 1 }, out: { steel: 0.5 }, pw: -0.8, req: 'b_smelter' },
  fabricator: { n: 'Fabricator', cat: 'Industry', d: 'Copper + Silicon → Circuits', cost: { iron: 80, silicon: 50 }, inp: { copper: 0.6, silicon: 0.6 }, out: { circuits: 0.4 }, pw: -1, req: 'b_fabricator' },
  refinery: { n: 'Refinery', cat: 'Industry', d: 'Hydrogen → Fusion Fuel', cost: { steel: 60, copper: 40 }, inp: { gas: 1 }, out: { fuel: 0.5 }, pw: -1, req: 'b_harvester' },
  crystallab: { n: 'Crystal Refinery', cat: 'Industry', d: 'Crystal → Refined Crystal', cost: { steel: 80, crystal: 80 }, inp: { crystal: 1 }, out: { rcrystal: 0.4 }, pw: -1.2, req: 'b_crystallab' },
  foundry: { n: 'Alloy Foundry', cat: 'Industry', d: 'Steel + Titanium → Advanced Alloy', cost: { steel: 150, circuits: 60 }, inp: { steel: 0.6, titanium: 0.3 }, out: { alloy: 0.3 }, pw: -2, req: 'b_foundry' },
  antimatter: { n: 'Antimatter Plant', cat: 'Industry', d: 'Fusion Fuel + Uranium → Antimatter', cost: { alloy: 300, rcrystal: 100 }, inp: { fuel: 0.5, uranium: 0.2 }, out: { antimatter: 0.1 }, pw: -6, req: 'b_antimatter' },
  qlab: { n: 'Quantum Crystal Lab', cat: 'Industry', d: 'Refined Crystal + Dark Crystal → Quantum Crystal', cost: { alloy: 250, rcrystal: 150 }, inp: { rcrystal: 0.5, darkcrystal: 0.1 }, out: { qcrystal: 0.15 }, pw: -5, req: 'b_qlab' },
  nanoforge: { n: 'Nanoforge', cat: 'Industry', d: 'Alloy + Circuits → Nanomaterial', cost: { alloy: 200, circuits: 200 }, inp: { alloy: 0.4, circuits: 0.4 }, out: { nano: 0.2 }, pw: -5, req: 'b_nanoforge' },
  exoticplant: { n: 'Exotic Condenser', cat: 'Industry', d: 'Antimatter + Void Gas → Exotic Energy', cost: { nano: 400, antimatter: 100 }, inp: { antimatter: 0.2, voidgas: 0.2 }, out: { exotic: 0.08 }, pw: -20, req: 'b_exotic' },
  neural: { n: 'Neural Lattice Grower', cat: 'Industry', d: 'Quantum Crystal + Platinum → Neural Crystal', cost: { nano: 200, qcrystal: 200 }, inp: { qcrystal: 0.2, platinum: 0.2 }, out: { ncrystal: 0.08 }, pw: -15, req: 'b_neural' },
  qforge: { n: 'Quantum Forge', cat: 'Industry', d: 'Nanomaterial + Quantum Ore → Quantum Material', cost: { nano: 300, qcrystal: 100 }, inp: { nano: 0.3, quantumore: 0.1 }, out: { qmatter: 0.1 }, pw: -20, req: 'b_qforge' },
  singforge: { n: 'Singularity Bottler', cat: 'Industry', d: 'Neural Crystal + Exotic Energy + a sliver of Paradox → Bottled Singularity', cost: { qmatter: 1000, exotic: 500 }, inp: { ncrystal: 0.05, exotic: 0.05, paradox: 0.0005 }, out: { singularity: 0.01 }, pw: -200, req: 'b_singforge' },
  shipyard: { n: 'Shipyard', cat: 'Industry', d: '+4 fleet command per level. Needed to build warships.', cost: { steel: 200, circuits: 80 }, pw: -2, req: 'b_shipyard', cap: 4 },
  robotfactory: { n: 'Robot Factory', cat: 'Industry', d: '+4 robot workers per level. Robots do not need air.', cost: { alloy: 120, circuits: 150 }, pw: -3, req: 'b_robot', robots: 4, nowork: 1 },
  tradehub: { n: 'Trade Hub', cat: 'Industry', d: 'Generates credits.', cost: { steel: 60, circuits: 30 }, pw: -0.5, req: 'b_tradehub', credits: 3 },
  lab: { n: 'Laboratory', cat: 'Science', d: 'Generates research.', cost: { iron: 50, crystal: 30 }, pw: -0.6, sci: 0.4 },
  observatory: { n: 'Observatory', cat: 'Science', d: 'Research, and widens what your scanners reveal.', cost: { steel: 80, crystal: 60, circuits: 20 }, pw: -1, sci: 1, req: 'b_observatory' },
  rescenter: { n: 'Research Center', cat: 'Science', d: 'Serious research output.', cost: { alloy: 100, circuits: 120 }, pw: -4, sci: 4, req: 'b_rescenter' },
  qcomputer: { n: 'Quantum Computer', cat: 'Science', d: 'Consumes quantum crystal. Thinks very hard.', cost: { nano: 150, qcrystal: 80 }, inp: { qcrystal: 0.02 }, out: { sci: 40 }, pw: -25, req: 'b_qcomputer' },
  habitat: { n: 'Habitat', cat: 'Population', d: '+5M housing per level.', cost: { iron: 50, silicon: 20 }, house: 5, nowork: 1 },
  city: { n: 'City', cat: 'Population', d: '+22M housing per level.', cost: { steel: 120, circuits: 40 }, house: 22, pw: -1, req: 'b_city', nowork: 1 },
  arcology: { n: 'Arcology', cat: 'Population', d: '+120M housing per level.', cost: { alloy: 300, nano: 60 }, house: 120, pw: -5, req: 'b_arcology', nowork: 1 },
  shieldgen: { n: 'Shield Generator', cat: 'Defense', d: 'Planetary shield. Absorbs raids.', cost: { steel: 100, crystal: 80 }, pw: -2, def: 60, req: 'b_shieldgen' },
  missileplat: { n: 'Missile Platform', cat: 'Defense', d: 'Cheap orbital firepower.', cost: { steel: 120, copper: 80 }, pw: -1, def: 90, req: 'b_missileplat' },
  orbitaldef: { n: 'Orbital Defense Grid', cat: 'Defense', d: 'Heavy guns in high orbit.', cost: { alloy: 150, circuits: 100 }, pw: -4, def: 260, req: 'b_orbitaldef' },
  terraformer: { n: 'Terraformer', cat: 'Special', d: '+6% habitability per level (max 10).', cost: { alloy: 200, rcrystal: 80 }, pw: -8, max: 10, req: 'b_terraformer' },
  spaceport: { n: 'Spaceport', cat: 'Special', d: '+6% to everything this colony produces, per level (max 10).', cost: { steel: 150, circuits: 60 }, pw: -2, max: 10, req: 'b_tradehub' }
};
for (const k in G.BLD) G.BLD[k].id = k;
G.BLD_CATS = ['Resource', 'Energy', 'Industry', 'Science', 'Population', 'Defense', 'Special'];
// order converters must run in so upstream products exist
G.CONV_ORDER = ['smelter', 'fabricator', 'refinery', 'crystallab', 'fusion', 'foundry', 'antimatter', 'qreactor', 'qlab', 'nanoforge', 'qcomputer', 'exoticplant', 'neural', 'qforge', 'singforge'];

/* ---------- Ship upgrades / hulls / weapons ---------- */
G.UPG = {
  hull: { n: 'Hull Plating', d: 'More hull points.' },
  shield: { n: 'Shield Emitters', d: 'More shield, faster recharge.' },
  weapon: { n: 'Weapon Cores', d: 'More damage from every mounted weapon.' },
  mining: { n: 'Mining Beam', d: 'Mine faster.' },
  cargo: { n: 'Cargo Hold', d: 'Carry more before you must bank.' },
  engine: { n: 'Engines', d: 'Faster, sharper turns.' },
  reactor: { n: 'Reactor', d: 'More energy, faster recharge.' },
  scanner: { n: 'Scanner Array', d: 'See further on the galaxy map, scan planets from further out.' },
  ftl: { n: 'FTL Drive', d: 'Jump further.' }
};
G.UPG_BANDS = [['iron', 'crystal'], ['steel', 'circuits'], ['alloy', 'rcrystal'], ['nano', 'qcrystal'], ['qmatter', 'ncrystal']];
G.HULLS = [
  { n: 'Rustbucket', mul: 1, slots: 2, shape: 0, cost: {} },
  { n: 'Prospector', mul: 2.2, slots: 2, shape: 1, cost: { steel: 300, circuits: 150, credits: 600 } },
  { n: 'Corvette', mul: 5, slots: 3, shape: 2, cost: { alloy: 400, circuits: 800, credits: 6000 } },
  { n: 'Frigate', mul: 12, slots: 3, shape: 3, cost: { nano: 500, alloy: 2500, credits: 60000 } },
  { n: 'Cruiser', mul: 30, slots: 4, shape: 4, cost: { qmatter: 400, nano: 4000, credits: 600000 } },
  { n: 'Flagship', mul: 90, slots: 4, shape: 5, cost: { qmatter: 6000, exotic: 800, credits: 8e6 } },
  { n: 'Worldship', mul: 320, slots: 5, shape: 6, cost: { singularity: 50, qmatter: 60000, credits: 2e8 } }
];
// f: damage factor (dps = ship damage × f), rate: seconds between shots
G.WEAPONS = {
  laser: { n: 'Pulse Laser', type: 'laser', f: 1, rate: 0.35, range: 430, d: 'Instant. Strong against shields, weak against armor.', cost: {} },
  plasma: { n: 'Plasma Cannon', type: 'plasma', f: 1.35, rate: 0.9, range: 400, d: 'Slow bolts that melt armor. Poor against shields.', cost: { steel: 150, crystal: 200 }, req: 'w_plasma' },
  missile: { n: 'Missile Rack', type: 'missile', f: 1.5, rate: 1.6, range: 650, d: 'Homing. Devastates slow ships; fast ships dodge them.', cost: { steel: 120, circuits: 60 }, req: 'w_missile' },
  pd: { n: 'Point Defense', type: 'pd', f: 0.45, rate: 0.14, range: 300, d: 'Shreds missiles and drones before they reach you.', cost: { steel: 200, circuits: 150 }, req: 'w_pd' },
  dronebay: { n: 'Drone Bay', type: 'drone', f: 1.2, rate: 6, range: 700, d: 'Launches attack drones. Excellent against large ships.', cost: { alloy: 100, circuits: 300 }, req: 'w_drone' },
  rail: { n: 'Railgun', type: 'rail', f: 1.25, rate: 1.4, range: 850, d: 'Long reach, punches through half of all armor.', cost: { alloy: 200, titanium: 300 }, req: 'w_rail' },
  lance: { n: 'Beam Lance', type: 'laser', f: 2.2, rate: 0.12, range: 540, d: 'A sustained beam. Twice the output of anything before it.', cost: { nano: 300, qcrystal: 150 }, req: 'w_lance' },
  voidp: { n: 'Void Projector', type: 'null', f: 3, rate: 1.1, range: 480, d: 'Ignores shields entirely. You are not sure it is a weapon.', cost: { qmatter: 500, exotic: 200 }, req: 'w_void' }
};
for (const k in G.WEAPONS) G.WEAPONS[k].id = k;

/* ---------- Fleet ---------- */
// cp: command points. Stats are per ship at multiplier 1.
G.FLEET = {
  drone: { n: 'Strike Drone', cp: 1, hp: 30, dmg: 4, w: 'drone', spd: 1.5, fast: 1, cost: { steel: 25, circuits: 12 }, req: 'f_drone', shape: 10, r: 7 },
  corvette: { n: 'Corvette', cp: 2, hp: 90, dmg: 8, w: 'laser', spd: 1.2, fast: 1, cost: { steel: 80, circuits: 30, credits: 60 }, req: 'f_corvette', shape: 11, r: 11 },
  destroyer: { n: 'Destroyer', cp: 4, hp: 220, dmg: 20, w: 'missile', spd: 1, cost: { steel: 250, circuits: 100, alloy: 20, credits: 250 }, req: 'f_destroyer', shape: 12, r: 14 },
  cruiser: { n: 'Cruiser', cp: 8, hp: 700, dmg: 46, w: 'plasma', spd: 0.85, arm: 0.25, cost: { alloy: 250, circuits: 300, credits: 1200 }, req: 'f_cruiser', shape: 13, r: 18 },
  carrier: { n: 'Carrier', cp: 14, hp: 1200, dmg: 90, w: 'drone', spd: 0.7, large: 1, cost: { alloy: 600, nano: 60, circuits: 900, credits: 5000 }, req: 'f_carrier', shape: 14, r: 24 },
  battleship: { n: 'Battleship', cp: 24, hp: 3600, dmg: 210, w: 'rail', spd: 0.6, arm: 0.4, large: 1, cost: { nano: 500, alloy: 2500, credits: 30000 }, req: 'f_battleship', shape: 15, r: 28 },
  titan: { n: 'Titan', cp: 60, hp: 16000, dmg: 800, w: 'laser', spd: 0.45, arm: 0.5, large: 1, cost: { qmatter: 300, nano: 4000, credits: 400000 }, req: 'f_titan', shape: 16, r: 38 },
  leviathan: { n: 'Leviathan', cp: 200, hp: 90000, dmg: 4200, w: 'null', spd: 0.4, arm: 0.6, large: 1, cost: { singularity: 5, qmatter: 8000, credits: 2e7 }, req: 'f_leviathan', shape: 16, r: 50 }
};
for (const k in G.FLEET) G.FLEET[k].id = k;

/* ---------- Enemies ---------- */
// fac: faction, th: threat cost when composing a wave, sh: shield, arm: armor fraction
G.ENEMY = {
  skiff: { n: 'Pirate Skiff', fac: 'pirate', th: 1, hp: 28, sh: 0, arm: 0, dmg: 3, w: 'laser', range: 330, rate: 0.6, spd: 1.25, r: 11, fast: 1, shape: 20, col: '#ff6a5c' },
  marauder: { n: 'Marauder', fac: 'pirate', th: 2.5, hp: 90, sh: 0, arm: 0.35, dmg: 7, w: 'plasma', range: 380, rate: 1.1, spd: 0.8, r: 16, shape: 21, col: '#ff8a4a' },
  rocketeer: { n: 'Rocketeer', fac: 'pirate', th: 2.5, hp: 50, sh: 20, arm: 0, dmg: 8, w: 'missile', range: 620, rate: 2.2, spd: 0.9, r: 14, shape: 22, col: '#ffb04a' },
  corsair: { n: 'Corsair Carrier', fac: 'pirate', th: 6, hp: 260, sh: 60, arm: 0.2, dmg: 5, w: 'drone', range: 700, rate: 5, spd: 0.5, r: 28, large: 1, shape: 23, col: '#ff5c8a' },
  lord: { n: 'Pirate Lord', fac: 'pirate', th: 20, hp: 1400, sh: 400, arm: 0.3, dmg: 22, w: 'plasma', range: 460, rate: 0.7, spd: 0.6, r: 40, large: 1, boss: 1, shape: 23, col: '#ff3c5c' },
  mite: { n: 'Void Mite', fac: 'creature', th: 0.6, hp: 14, sh: 0, arm: 0, dmg: 4, w: 'bite', range: 30, rate: 0.5, spd: 1.6, r: 8, fast: 1, shape: 30, col: '#b4ff6a' },
  jelly: { n: 'Star Jelly', fac: 'creature', th: 2.5, hp: 40, sh: 120, arm: 0, dmg: 9, w: 'laser', range: 300, rate: 1, spd: 0.6, r: 18, shape: 31, col: '#6affd9' },
  ray: { n: 'Void Manta', fac: 'creature', th: 3, hp: 120, sh: 0, arm: 0.2, dmg: 14, w: 'bite', range: 40, rate: 0.7, spd: 1.45, r: 20, fast: 1, shape: 32, col: '#8ab4ff' },
  leviathan: { n: 'Void Leviathan', fac: 'creature', th: 22, hp: 2600, sh: 0, arm: 0.5, dmg: 30, w: 'plasma', range: 420, rate: 0.9, spd: 0.55, r: 52, large: 1, boss: 1, shape: 33, col: '#6a8aff' },
  sentinel: { n: 'Rogue Sentinel', fac: 'ai', th: 2, hp: 50, sh: 50, arm: 0.2, dmg: 7, w: 'laser', range: 400, rate: 0.4, spd: 1.1, r: 12, pd: 1, shape: 40, col: '#5cf0ff' },
  replicator: { n: 'Replicator', fac: 'ai', th: 3, hp: 70, sh: 0, arm: 0.3, dmg: 6, w: 'plasma', range: 350, rate: 0.9, spd: 0.9, r: 15, split: 1, shape: 41, col: '#5cffb0' },
  warform: { n: 'War Machine', fac: 'ai', th: 7, hp: 400, sh: 200, arm: 0.45, dmg: 18, w: 'rail', range: 760, rate: 1.6, spd: 0.5, r: 26, large: 1, shape: 42, col: '#5ca8ff' },
  overmind: { n: 'Overmind Node', fac: 'ai', th: 26, hp: 2200, sh: 1600, arm: 0.4, dmg: 26, w: 'drone', range: 800, rate: 3, spd: 0.35, r: 46, large: 1, boss: 1, pd: 1, shape: 43, col: '#5cffff' },
  interceptor: { n: 'Interceptor', fac: 'empire', th: 1.5, hp: 40, sh: 30, arm: 0.1, dmg: 5, w: 'laser', range: 360, rate: 0.45, spd: 1.4, r: 11, fast: 1, shape: 50, col: '#c08aff' },
  frigate: { n: 'Frigate', fac: 'empire', th: 4, hp: 180, sh: 120, arm: 0.3, dmg: 13, w: 'missile', range: 640, rate: 1.8, spd: 0.8, r: 18, pd: 1, shape: 51, col: '#c08aff' },
  dreadnought: { n: 'Dreadnought', fac: 'empire', th: 14, hp: 1100, sh: 700, arm: 0.5, dmg: 34, w: 'rail', range: 800, rate: 1.5, spd: 0.4, r: 38, large: 1, shape: 52, col: '#c08aff' },
  warden: { n: 'Ancient Warden', fac: 'ancient', th: 6, hp: 300, sh: 300, arm: 0.5, dmg: 20, w: 'laser', range: 520, rate: 0.5, spd: 0.7, r: 22, shape: 60, col: '#ffe08a' },
  obelisk: { n: 'The Obelisk', fac: 'ancient', th: 32, hp: 4200, sh: 3000, arm: 0.6, dmg: 44, w: 'laser', range: 640, rate: 0.35, spd: 0.25, r: 56, large: 1, boss: 1, shape: 61, col: '#ffd24a' },
  wraith: { n: 'Phase Wraith', fac: 'dim', th: 4, hp: 110, sh: 0, arm: 0, dmg: 16, w: 'plasma', range: 360, rate: 0.8, spd: 1.2, r: 15, fast: 1, blink: 1, shape: 70, col: '#ff5cf0' },
  maw: { n: 'Rift Maw', fac: 'dim', th: 30, hp: 5200, sh: 800, arm: 0.3, dmg: 50, w: 'bite', range: 70, rate: 0.5, spd: 0.95, r: 60, large: 1, boss: 1, blink: 1, shape: 71, col: '#ff3cc0' },
  nullship: { n: 'A Quiet', fac: 'silence', th: 5, hp: 260, sh: 260, arm: 0.4, dmg: 22, w: 'null', range: 440, rate: 0.9, spd: 1, r: 16, shape: 80, col: '#e8e8ff' },
  eraser: { n: 'An Absence', fac: 'silence', th: 40, hp: 9000, sh: 5000, arm: 0.6, dmg: 70, w: 'null', range: 560, rate: 0.6, spd: 0.5, r: 64, large: 1, boss: 1, shape: 81, col: '#ffffff' }
};
for (const k in G.ENEMY) G.ENEMY[k].id = k;
G.FACTIONS = {
  pirate: { n: 'Pirates', units: ['skiff', 'marauder', 'rocketeer', 'corsair'], boss: 'lord' },
  creature: { n: 'Void Fauna', units: ['mite', 'mite', 'jelly', 'ray'], boss: 'leviathan' },
  ai: { n: 'Rogue AI', units: ['sentinel', 'replicator', 'warform'], boss: 'overmind', minL: 8 },
  empire: { n: 'Empire Navy', units: ['interceptor', 'frigate', 'dreadnought'], boss: 'dreadnought' },
  ancient: { n: 'Ancient Machines', units: ['warden'], boss: 'obelisk', minL: 18 },
  dim: { n: 'Dimensional', units: ['wraith'], boss: 'maw', minL: 26 },
  silence: { n: 'The Silence', units: ['nullship'], boss: 'eraser', minL: 30 }
};

/* ---------- Tech tree ---------- */
// br: branch, t: tier, req: prerequisite ids, e: additive multiplier bonuses, u: unlock flags, flag: story flag needed to even see it
const T = (id, n, br, t, req, d, e, u, extra) => Object.assign({ id, n, br, t, req, d, e: e || {}, u: u || [] }, extra || {});
G.BRANCH = { sci: { n: 'Science', c: '#b89bff' }, ind: { n: 'Industry', c: '#ffb86a' }, enr: { n: 'Energy', c: '#6ee7ff' }, mil: { n: 'Military', c: '#ff6a7a' }, exp: { n: 'Exploration', c: '#7dffb0' }, soc: { n: 'Society', c: '#ffd76a' }, meg: { n: 'Megastructures', c: '#ff9af0' }, trn: { n: '???', c: '#ffffff' } };
G.TECH_LIST = [
  T('sci1', 'Field Analysis', 'sci', 0, [], '+25% research.', { sci: 0.25 }),
  T('sci2', 'Xenoarchaeology', 'sci', 1, ['sci1'], 'Anomalies and ruins pay out 30% more.', { loot: 0.3 }),
  T('sci3', 'Observatories', 'sci', 2, ['sci2'], 'Unlocks the Observatory.', { scan: 0.15 }, ['b_observatory']),
  T('sci4', 'Research Centers', 'sci', 3, ['sci3'], 'Unlocks the Research Center.', {}, ['b_rescenter']),
  T('sci5', 'Quantum Physics', 'sci', 5, ['sci4', 'enr5'], 'Unlocks the Quantum Computer, Quantum Crystal Lab and Exotic Siphon.', {}, ['b_qcomputer', 'b_qlab', 'b_siphon']),
  T('sci6', 'Neural Lattices', 'sci', 6, ['sci5'], '+50% research. Unlocks the Neural Lattice Grower.', { sci: 0.5 }, ['b_neural']),
  T('sci7', 'Spacetime Engineering', 'sci', 7, ['sci6'], '+25% jump range. Things bend that should not.', { jump: 0.25, sci: 0.25 }),
  T('sci8', 'Wormhole Theory', 'sci', 8, ['sci7'], 'Wormholes can be re-used and lead somewhere chosen, not random.', {}, ['wormhole']),
  T('sci9', 'Dimensional Physics', 'sci', 9, ['sci8'], '+100% research. You notice the gaps between things.', { sci: 1 }),
  T('sci10', 'Reality Engineering', 'sci', 10, ['sci9'], '+100% everything industrial. The universe is a material now.', { ind: 1, mine: 1 }),
  T('ind1', 'Ore Processing', 'ind', 0, [], 'Unlocks the Smelter. +20% extraction.', { mine: 0.2 }, ['b_smelter']),
  T('ind2', 'Microfabrication', 'ind', 1, ['ind1'], 'Unlocks the Fabricator.', {}, ['b_fabricator']),
  T('ind3', 'Mining Drones', 'ind', 1, ['ind1'], 'Two drones follow your ship and mine on their own.', {}, ['drones1']),
  T('ind4', 'Deep Core Drilling', 'ind', 2, ['ind2'], 'Unlocks the Deep Core Drill.', {}, ['b_deepdrill']),
  T('ind5', 'Automation', 'ind', 2, ['ind3'], 'Build Mining Rigs on asteroid belts for passive income.', {}, ['rigs']),
  T('ind6', 'Alloy Metallurgy', 'ind', 3, ['ind4'], 'Unlocks the Alloy Foundry.', {}, ['b_foundry']),
  T('ind7', 'Robotics', 'ind', 4, ['ind6', 'ind5'], 'Unlocks the Robot Factory. Two more mining drones.', {}, ['b_robot', 'drones2']),
  T('ind8', 'AI Governors', 'ind', 4, ['ind7'], 'Colonies can manage their own construction.', {}, ['governor']),
  T('ind9', 'Nanobots', 'ind', 6, ['ind7'], 'Unlocks the Nanoforge. +30% industry.', { ind: 0.3 }, ['b_nanoforge']),
  T('ind10', 'Planetary Industry', 'ind', 7, ['ind9'], '+100% industry.', { ind: 1 }),
  T('ind11', 'Quantum Fabrication', 'ind', 8, ['ind10', 'sci5'], 'Unlocks the Quantum Forge.', {}, ['b_qforge']),
  T('ind12', 'Von Neumann Probes', 'ind', 8, ['ind10', 'ind8'], 'Probes can found colonies on habitable worlds in systems you have visited. Off until you switch them on (Colonies or Settings).', {}, ['probes']),
  T('enr1', 'Solar Optimization', 'enr', 0, [], '+30% energy.', { energy: 0.3 }),
  T('enr2', 'Gas Refining', 'enr', 1, ['enr1'], 'Unlocks the Gas Harvester and Refinery.', {}, ['b_harvester']),
  T('enr3', 'Geothermal Taps', 'enr', 2, ['enr2'], 'Unlocks the Geothermal Tap.', {}, ['b_geothermal']),
  T('enr4', 'Fusion Power', 'enr', 3, ['enr3'], 'Unlocks the Fusion Reactor. +30% ship energy.', { shipenergy: 0.3 }, ['b_fusion']),
  T('enr5', 'Crystal Resonance', 'enr', 3, ['enr2'], 'Unlocks the Crystal Refinery.', {}, ['b_crystallab']),
  T('enr6', 'Antimatter Containment', 'enr', 5, ['enr4'], 'Unlocks the Antimatter Plant.', {}, ['b_antimatter']),
  T('enr7', 'Quantum Reactors', 'enr', 6, ['enr6', 'sci5'], 'Unlocks the Quantum Reactor.', {}, ['b_qreactor']),
  T('enr8', 'Zero-Point Taps', 'enr', 8, ['enr7'], '+100% energy.', { energy: 1 }),
  T('enr9', 'Exotic Energy', 'enr', 9, ['enr8'], 'Unlocks the Exotic Condenser.', {}, ['b_exotic']),
  T('mil1', 'Targeting Computers', 'mil', 0, [], '+20% ship damage.', { shipdmg: 0.2 }),
  T('mil2', 'Missile Systems', 'mil', 1, ['mil1'], 'Unlocks the Missile Rack and Missile Platform.', {}, ['w_missile', 'b_missileplat']),
  T('mil3', 'Deflector Theory', 'mil', 1, ['mil1'], '+30% ship shields. Unlocks the Shield Generator.', { shipshield: 0.3 }, ['b_shieldgen']),
  T('mil4', 'Plasma Weapons', 'mil', 2, ['mil2'], 'Unlocks the Plasma Cannon.', {}, ['w_plasma']),
  T('mil5', 'Fleet Doctrine', 'mil', 2, ['mil3'], 'Unlocks the Shipyard and Corvettes.', {}, ['b_shipyard', 'f_corvette']),
  T('mil6', 'Point Defense', 'mil', 3, ['mil4'], 'Unlocks Point Defense.', {}, ['w_pd']),
  T('mil7', 'Combat Drones', 'mil', 3, ['mil5'], 'Unlocks the Drone Bay and Strike Drones.', {}, ['w_drone', 'f_drone']),
  T('mil8', 'Destroyers', 'mil', 4, ['mil5', 'mil2'], 'Unlocks Destroyers. +20% fleet hull.', { fleethp: 0.2 }, ['f_destroyer']),
  T('mil9', 'Railguns', 'mil', 4, ['mil6'], 'Unlocks the Railgun.', {}, ['w_rail']),
  T('mil10', 'Cruisers', 'mil', 5, ['mil8'], 'Unlocks Cruisers.', {}, ['f_cruiser']),
  T('mil11', 'Orbital Defense Grids', 'mil', 5, ['mil8'], 'Unlocks the Orbital Defense Grid. +50% colony defense.', { colonydef: 0.5 }, ['b_orbitaldef']),
  T('mil12', 'Carriers', 'mil', 6, ['mil10', 'mil7'], 'Unlocks Carriers. +30% fleet damage.', { fleetdmg: 0.3 }, ['f_carrier']),
  T('mil13', 'Battleships', 'mil', 7, ['mil12'], 'Unlocks Battleships.', {}, ['f_battleship']),
  T('mil14', 'Beam Lance', 'mil', 7, ['mil9'], 'Unlocks the Beam Lance.', {}, ['w_lance']),
  T('mil15', 'Titans', 'mil', 9, ['mil13'], 'Unlocks Titans. +50% fleet damage and hull.', { fleetdmg: 0.5, fleethp: 0.5 }, ['f_titan']),
  T('mil16', 'Void Projection', 'mil', 10, ['mil15', 'mil14'], 'Unlocks the Void Projector.', {}, ['w_void']),
  T('exp1', 'Long-Range Scanners', 'exp', 0, [], '+40% scanner range.', { scan: 0.4 }),
  T('exp2', 'Jump Calibration', 'exp', 1, ['exp1'], '+25% jump range, jumps cost 20% less energy.', { jump: 0.25, jumpcost: -0.2 }),
  T('exp3', 'Cargo Compression', 'exp', 1, ['exp1'], '+50% cargo.', { cargo: 0.5 }),
  T('exp5', 'Afterburners', 'exp', 2, ['exp2'], '+20% ship speed.', { speed: 0.2 }),
  T('exp4', 'Quantum Uplink', 'exp', 3, ['exp3'], 'Cargo is banked the instant you mine it. Nothing to lose on death.', {}, ['uplink']),
  T('exp7', 'Xenobiology', 'exp', 3, ['exp5'], 'A second companion slot. Companions level 50% faster.', { xp: 0.5 }, ['comp2']),
  T('exp6', 'Deep Space Survey', 'exp', 4, ['exp4'], 'The map shows what each known system contains. +20% rare finds.', { rare: 0.2 }, ['survey']),
  T('exp8', 'Stealth Field', 'exp', 5, ['exp6'], 'Your signature builds 30% slower.', { heat: -0.3 }),
  T('exp9', 'Hyperlanes', 'exp', 6, ['exp8'], '+60% jump range.', { jump: 0.6 }),
  T('exp10', 'Exotic Navigation', 'exp', 8, ['exp9'], '+100% jump range. A third companion slot.', { jump: 1 }, ['comp3']),
  T('soc1', 'Colonial Charter', 'soc', 0, [], 'Lets you found colonies.', {}, ['colonize']),
  T('soc2', 'Hydroponics', 'soc', 1, ['soc1'], '+50% population growth, +20% housing.', { popgrow: 0.5, popcap: 0.2 }),
  T('soc3', 'Xenolinguistics', 'soc', 1, ['soc1'], 'Talk to aliens properly: trade pacts and gifts land 25% better.', { diplo: 0.25 }, ['pacts']),
  T('soc4', 'Urban Planning', 'soc', 2, ['soc2'], 'Unlocks the City.', {}, ['b_city']),
  T('soc5', 'Trade Networks', 'soc', 2, ['soc3'], 'Unlocks the Trade Hub and Spaceport. +25% credits.', { credits: 0.25 }, ['b_tradehub']),
  T('soc6', 'Environment Suits', 'soc', 3, ['soc4'], 'Colonise worlds down to 15% habitability.', {}, ['hab15']),
  T('soc10', 'Espionage', 'soc', 4, ['soc5'], 'Spy on other civilisations.', {}, ['spy']),
  T('soc7', 'Terraforming', 'soc', 4, ['soc6'], 'Unlocks the Terraformer.', {}, ['b_terraformer']),
  T('soc8', 'Arcologies', 'soc', 5, ['soc7'], 'Unlocks the Arcology.', {}, ['b_arcology']),
  T('soc9', 'Sealed Biomes', 'soc', 5, ['soc6'], 'Colonise anything, gas giants included.', {}, ['hab0']),
  T('soc12', 'Sector Administration', 'soc', 6, ['soc8'], '+50% housing, +25% credits.', { popcap: 0.5, credits: 0.25 }),
  T('soc11', 'Galactic Federation', 'soc', 7, ['soc12', 'soc10'], 'Form alliances. Allies lend warships.', { diplo: 0.25 }, ['alliance']),
  T('meg1', 'Orbital Construction', 'meg', 4, ['ind6'], 'Unlocks Orbital Stations.', {}, ['m_station']),
  T('meg2', 'Space Elevators', 'meg', 5, ['meg1'], 'Unlocks Space Elevators.', {}, ['m_elevator']),
  T('meg3', 'Planetary Forges', 'meg', 6, ['meg2', 'ind9'], 'Unlocks Planetary Forges.', {}, ['m_forge']),
  T('meg4', 'Dyson Theory', 'meg', 7, ['meg3', 'enr6'], 'Begin a Dyson structure: collectors, network, swarm. Unlocks Dyson Collectors.', {}, ['m_dyson', 'b_dysoncol']),
  T('meg5', 'Dyson Sphere', 'meg', 8, ['meg4'], 'Dyson stages four and five: array, then sphere.', {}, ['m_dyson2']),
  T('meg6', 'Stargates', 'meg', 8, ['meg4', 'sci8'], 'Unlocks Stargates. Jump between gates for free, at any distance.', {}, ['m_stargate']),
  T('meg7', 'Planet Engines', 'meg', 9, ['meg5'], 'Unlocks Planet Engines.', {}, ['m_planeteng']),
  T('meg8', 'Star Lifting', 'meg', 9, ['meg5'], 'Unlocks Star Lifters.', {}, ['m_starlifter']),
  T('meg9', 'Stellar Engineering', 'meg', 10, ['meg8', 'enr9'], 'Final Dyson stages and the Artificial Star.', {}, ['m_dyson3', 'm_artstar']),
  T('meg10', 'Galactic Nexus', 'meg', 11, ['meg9', 'sci10'], 'One structure to bind a galaxy.', {}, ['m_nexus']),
  T('trn1', 'Reality Anchors', 'trn', 10, ['sci9'], 'Pin a region of space so it cannot be removed.', {}, ['m_anchor'], { flag: 'silence' }),
  T('trn2', 'Null Weaponry', 'trn', 11, ['trn1'], 'Triple damage against the Silence.', { vsSilence: 2 }, [], { flag: 'silence' }),
  T('trn3', 'Paradox Engineering', 'trn', 12, ['trn2', 'sci10'], 'Unlocks the Singularity Bottler. Unlocks Leviathans.', {}, ['b_singforge', 'f_leviathan'], { flag: 'silence' }),
  T('trn4', 'The Aperture', 'trn', 13, ['trn3', 'meg10'], 'A way out.', {}, ['m_aperture'], { flag: 'silence' })
];
// Repeatable techs: infinite levels, each +10%.
G.REPEAT = [
  { id: 'r_mine', n: 'Applied Geology', k: 'mine', d: '+10% extraction per level' },
  { id: 'r_ind', n: 'Process Optimisation', k: 'ind', d: '+10% industry per level' },
  { id: 'r_sci', n: 'Pure Theory', k: 'sci', d: '+10% research per level' },
  { id: 'r_energy', n: 'Grid Efficiency', k: 'energy', d: '+10% energy per level' },
  { id: 'r_dmg', n: 'Weapons Doctrine', k: 'shipdmg', k2: 'fleetdmg', d: '+10% ship and fleet damage per level' },
  { id: 'r_hp', n: 'Armor Doctrine', k: 'shiphp', k2: 'fleethp', d: '+10% ship and fleet hull per level' },
  { id: 'r_def', n: 'Fortification', k: 'colonydef', d: '+10% colony defense per level' }
];
G.TECH = {};
for (const t of G.TECH_LIST) G.TECH[t.id] = t;

/* ---------- Megastructures ---------- */
// scope: 'sys' (one per system) or 'uni' (one per universe). stages: cumulative build steps.
G.MEGA = {
  station: { n: 'Orbital Station', req: 'm_station', scope: 'sys', d: '+25% to everything produced in this system, +300 defense.', stages: [{ n: 'Orbital Station', cost: { steel: 2000, circuits: 1000, alloy: 300 } }] },
  elevator: { n: 'Space Elevator', req: 'm_elevator', scope: 'sys', d: '+60% extraction in this system.', stages: [{ n: 'Space Elevator', cost: { alloy: 2500, nano: 300, steel: 8000 } }] },
  forge: { n: 'Planetary Forge', req: 'm_forge', scope: 'sys', d: '+120% industry in this system.', stages: [{ n: 'Planetary Forge', cost: { nano: 2000, alloy: 8000, circuits: 10000 } }] },
  dyson: {
    n: 'Dyson Structure', req: 'm_dyson', scope: 'sys', d: 'Wrap the star. Each stage multiplies energy output and lifts all production by 10%. Energy on this scale gets noticed.',
    stages: [
      { n: 'Solar Collectors', cost: { alloy: 5000, circuits: 5000 } },
      { n: 'Energy Network', cost: { nano: 5000, rcrystal: 5000 } },
      { n: 'Orbital Swarm', cost: { nano: 30000, qcrystal: 5000 } },
      { n: 'Dyson Array', cost: { qmatter: 5000, nano: 150000 }, req: 'm_dyson2' },
      { n: 'Dyson Sphere', cost: { qmatter: 50000, exotic: 5000 }, req: 'm_dyson2' },
      { n: 'Stellar Engine', cost: { qmatter: 300000, exotic: 50000, stellarheart: 3 }, req: 'm_dyson3' },
      { n: 'Star Manipulation', cost: { singularity: 100, stellarheart: 10, exotic: 500000 }, req: 'm_dyson3' }
    ]
  },
  stargate: { n: 'Stargate', req: 'm_stargate', scope: 'sys', d: 'Jump between any two Stargates for free.', stages: [{ n: 'Stargate', cost: { qmatter: 2000, exotic: 300, nano: 20000 } }] },
  planeteng: { n: 'Planet Engine', req: 'm_planeteng', scope: 'sys', d: 'Move the worlds where you want them: every planet here becomes 100% habitable with +3 slots.', stages: [{ n: 'Planet Engine', cost: { qmatter: 8000, antimatter: 5000 } }] },
  starlifter: { n: 'Star Lifter', req: 'm_starlifter', scope: 'sys', d: 'Mines the star itself. A river of common and uncommon material.', stages: [{ n: 'Star Lifter', cost: { qmatter: 20000, exotic: 3000 } }] },
  artstar: { n: 'Artificial Star', req: 'm_artstar', scope: 'sys', d: 'A sun you designed. +100% research everywhere.', stages: [{ n: 'Artificial Star', cost: { singularity: 20, exotic: 20000, stellarheart: 5 } }] },
  anchor: { n: 'Reality Anchor', req: 'm_anchor', scope: 'sys', d: 'Systems within 8 cells cannot be erased by the Silence.', stages: [{ n: 'Reality Anchor', cost: { qmatter: 10000, ancientmatter: 5, chronocrystal: 3 } }] },
  nexus: { n: 'Galactic Nexus', req: 'm_nexus', scope: 'uni', d: 'Binds every system you hold into one machine. +200% to all production.', stages: [{ n: 'Lattice', cost: { singularity: 100, qmatter: 300000 } }, { n: 'Binding', cost: { singularity: 300, ancientmatter: 20, exotic: 300000 } }, { n: 'Galactic Nexus', cost: { singularity: 800, qmatter: 3e6, chronocrystal: 20 } }] },
  aperture: { n: 'The Aperture', req: 'm_aperture', scope: 'uni', d: 'Something that has never existed before. It opens outward.', stages: [{ n: 'Frame', cost: { singularity: 1000, qmatter: 5e6 } }, { n: 'Lens', cost: { singularity: 2500, paradox: 5, chronocrystal: 30 } }, { n: 'The Aperture', cost: { singularity: 6000, paradox: 12, stellarheart: 30, ancientmatter: 30 } }] }
};
for (const k in G.MEGA) G.MEGA[k].id = k;

/* ---------- Artifacts ---------- */
const A = (id, n, d, e, rar) => ({ id, n, d, e, rar: rar || 1 });
G.ARTI_LIST = [
  A('a_compass', 'Broken Star Compass', '+15% jump range', { jump: 0.15 }),
  A('a_lens', 'Precursor Lens', '+25% scanner range', { scan: 0.25 }),
  A('a_drill', 'Singing Drill Bit', '+25% extraction', { mine: 0.25 }),
  A('a_coil', 'Warm Coil', '+20% energy', { energy: 0.2 }),
  A('a_abacus', 'Alien Abacus', '+20% research', { sci: 0.2 }),
  A('a_coin', 'Coin With No Mint', '+30% credits', { credits: 0.3 }),
  A('a_plate', 'Self-Knitting Plate', '+25% ship hull', { shiphp: 0.25 }),
  A('a_fang', 'Leviathan Fang', '+20% ship damage', { shipdmg: 0.2 }),
  A('a_seed', 'World Seed', '+30% population growth and housing', { popgrow: 0.3, popcap: 0.3 }),
  A('a_flag', 'Flag of a Dead Empire', '+25% fleet damage', { fleetdmg: 0.25 }),
  A('a_bell', 'Vacuum Bell', 'Signature builds 20% slower', { heat: -0.2 }),
  A('a_map', 'Map of Elsewhere', '+25% anomaly finds', { anomaly: 0.25 }),
  A('a_pod', 'Folded Cargo Pod', '+60% cargo', { cargo: 0.6 }),
  A('a_tooth', 'Miner\'s Lucky Tooth', '+15% rare finds', { rare: 0.15 }),
  A('a_mask', 'Diplomat\'s Mask', 'Diplomacy lands 40% better', { diplo: 0.4 }),
  A('a_anvil', 'Anvil of Korr', '+30% industry', { ind: 0.3 }, 2),
  A('a_eye', 'Unblinking Eye', '+40% research', { sci: 0.4 }, 2),
  A('a_heart', 'Reactor Heart', '+50% ship energy and shields', { shipenergy: 0.5, shipshield: 0.5 }, 2),
  A('a_crown', 'Crown of the Swarm', '+12 fleet command', { fleetcap: 12 }, 2),
  A('a_engine', 'Impossible Engine', '+35% ship speed', { speed: 0.35 }, 2),
  A('a_ledger', 'Infinite Ledger', 'Buildings cost 12% less', { cost: -0.12 }, 2),
  A('a_aegis', 'Aegis Fragment', '+60% colony defense', { colonydef: 0.6 }, 2),
  A('a_horn', 'Horn of Plenty', 'Loot and event rewards +40%', { loot: 0.4 }, 2),
  A('a_egg', 'Dormant Egg', 'Companions level twice as fast', { xp: 1 }, 2),
  A('a_clock', 'Clock Running Backward', 'Offline progress +50%', { offline: 0.5 }, 2),
  A('a_shard', 'Mirror Shard', '+60% ship damage', { shipdmg: 0.6 }, 3),
  A('a_core', 'Sleeping Core', '+80% energy', { energy: 0.8 }, 3),
  A('a_tablet', 'Tablet of First Words', '+80% research', { sci: 0.8 }, 3),
  A('a_keel', 'Keel of the First Ship', '+80% fleet hull and damage', { fleethp: 0.8, fleetdmg: 0.8 }, 3),
  A('a_loom', 'Matter Loom', '+80% industry and extraction', { ind: 0.8, mine: 0.8 }, 3),
  A('a_key', 'Key to Nothing', 'Megastructures cost 20% less', { megacost: -0.2 }, 3),
  A('a_star', 'Pocket Star', '+150% energy, +50% research', { energy: 1.5, sci: 0.5 }, 4),
  A('a_voice', 'The Other Voice', 'Triple damage against the Silence', { vsSilence: 2 }, 4),
  A('a_page', 'Page From Outside', '+100% to all production', { mine: 1, ind: 1, sci: 1, energy: 1, credits: 1 }, 4),
  A('a_hand', 'Hand That Was Never Attached', '+150% ship damage and hull', { shipdmg: 1.5, shiphp: 1.5 }, 4),
  A('a_zero', 'Zero', 'You cannot describe what it does. +25% ascension points.', { ap: 0.25 }, 4)
];
G.ARTI = {}; for (const a of G.ARTI_LIST) G.ARTI[a.id] = a;
G.RAR_NAME = ['', 'Curio', 'Relic', 'Wonder', 'Impossible'];
G.RAR_COL = ['', '#9fb4c9', '#57e389', '#b89bff', '#ffd76a'];

/* ---------- Companions ---------- */
// k: bonus key, b: bonus at level 1 (grows 8% of base per level; ×2 at lvl 10 evolution, ×3 at lvl 25)
G.COMP_LIST = [
  { id: 'c_manta', n: 'Void Manta', k: 'speed', b: 0.08, d: 'ship speed', col: '#8ab4ff', shape: 0 },
  { id: 'c_beetle', n: 'Crystal Beetle', k: 'shipmine', b: 0.12, d: 'ship mining', col: '#7df0e0', shape: 1 },
  { id: 'c_fox', n: 'Quantum Fox', k: 'anomaly', b: 0.05, d: 'anomaly finds', col: '#ff9af0', shape: 2 },
  { id: 'c_machine', n: 'Ancient Machine', k: 'sci', b: 0.1, d: 'research', col: '#ffe08a', shape: 3 },
  { id: 'c_moth', n: 'Solar Moth', k: 'energy', b: 0.1, d: 'energy', col: '#ffd76a', shape: 4 },
  { id: 'c_slug', n: 'Ore Slug', k: 'mine', b: 0.08, d: 'extraction', col: '#e08a4f', shape: 5 },
  { id: 'c_wisp', n: 'Shield Wisp', k: 'shipshield', b: 0.15, d: 'ship shields', col: '#6ee7ff', shape: 6 },
  { id: 'c_hound', n: 'Hull Hound', k: 'shipdmg', b: 0.1, d: 'ship damage', col: '#ff6a7a', shape: 2 },
  { id: 'c_owl', n: 'Star Owl', k: 'scan', b: 0.12, d: 'scanner range', col: '#cfe0ff', shape: 4 },
  { id: 'c_crab', n: 'Trader Crab', k: 'credits', b: 0.12, d: 'credits', col: '#ffb86a', shape: 1 },
  { id: 'c_spore', n: 'Garden Spore', k: 'popgrow', b: 0.2, d: 'population growth', col: '#9dff5c', shape: 6 },
  { id: 'c_eel', n: 'Rift Eel', k: 'jump', b: 0.08, d: 'jump range', col: '#c08aff', shape: 0 },
  { id: 'c_golem', n: 'Forge Golem', k: 'ind', b: 0.1, d: 'industry', col: '#c8b6ff', shape: 3 },
  { id: 'c_magpie', n: 'Lucky Magpie', k: 'rare', b: 0.06, d: 'rare finds', col: '#f4f1e0', shape: 4 },
  { id: 'c_shade', n: 'Quiet Shade', k: 'heat', b: -0.08, d: 'signature build-up', col: '#8a8aa8', shape: 6 },
  { id: 'c_paradox', n: 'Schrödinger\'s Kitten', k: 'loot', b: 0.15, d: 'loot and rewards', col: '#ffffff', shape: 2 }
];
G.COMP = {}; for (const c of G.COMP_LIST) G.COMP[c.id] = c;

/* ---------- Ascension perks ---------- */
G.PERKS = [
  { id: 'p_mine', n: 'Deep Memory', d: '+15% extraction per level', k: 'mine', v: 0.15, max: 50 },
  { id: 'p_ind', n: 'Inherited Blueprints', d: '+15% industry per level', k: 'ind', v: 0.15, max: 50 },
  { id: 'p_sci', n: 'Remembered Proofs', d: '+15% research per level', k: 'sci', v: 0.15, max: 50 },
  { id: 'p_energy', n: 'First Light', d: '+15% energy per level', k: 'energy', v: 0.15, max: 50 },
  { id: 'p_dmg', n: 'Old Grudges', d: '+20% ship and fleet damage per level', k: 'shipdmg', k2: 'fleetdmg', v: 0.2, max: 50 },
  { id: 'p_hp', n: 'Scar Tissue', d: '+20% ship and fleet hull per level', k: 'shiphp', k2: 'fleethp', v: 0.2, max: 50 },
  { id: 'p_rare', n: 'Dowser\'s Instinct', d: '+4% rare finds per level', k: 'rare', v: 0.04, max: 25 },
  { id: 'p_cargo', n: 'Bigger On The Inside', d: '+25% cargo per level', k: 'cargo', v: 0.25, max: 20 },
  { id: 'p_cost', n: 'Efficient Rebuild', d: 'Buildings cost 4% less per level', k: 'cost', v: -0.04, max: 12 },
  { id: 'p_offline', n: 'Patient Machines', d: '+10% offline progress per level', k: 'offline', v: 0.1, max: 10 },
  { id: 'p_heat', n: 'Ghost Protocol', d: 'Signature builds 5% slower per level', k: 'heat', v: -0.05, max: 10 },
  { id: 'p_fleet', n: 'Veteran Admirals', d: '+6 fleet command per level', k: 'fleetcap', v: 6, max: 30 },
  { id: 'p_xp', n: 'Old Friends', d: 'Companions level 25% faster per level', k: 'xp', v: 0.25, max: 10 },
  { id: 'p_ap', n: 'Compounding', d: '+10% ascension points per level', k: 'ap', v: 0.1, max: 20 },
  { id: 'p_tech', n: 'Head Start', d: 'Begin with every tech of tier (level-1) and below', special: 1, max: 5, cmul: 4 },
  { id: 'p_colony', n: 'Seed Colony', d: 'Begin with your home world already colonised and built up', special: 1, max: 1, cmul: 6 },
  { id: 'p_arti', n: 'Carry-On Luggage', d: 'Keep 2 artifacts per level through ascension', special: 1, max: 10, cmul: 2 },
  { id: 'p_ship', n: 'Family Heirloom', d: 'Begin with ship upgrades at level 3 per level', special: 1, max: 5, cmul: 3 }
];
G.PERK = {}; for (const p of G.PERKS) G.PERK[p.id] = p;

/* ---------- Universe modifiers ---------- */
// m: multiplicative factors applied on top of everything
G.UMODS = [
  { id: 'rich', n: 'Abundant', d: 'Resources ×2, enemies ×3', m: { mine: 2, enemy: 3 } },
  { id: 'genius', n: 'Lucid', d: 'Research ×5, energy ×0.5', m: { sci: 5, energy: 0.5 } },
  { id: 'weird', n: 'Haunted', d: 'Anomalies ×20', m: { anomaly: 20 } },
  { id: 'elder', n: 'Elder', d: 'Alien civilisations start much stronger and are everywhere', m: { civ: 2.5 } },
  { id: 'dim', n: 'Dim', d: 'Energy ×0.4, crystal extraction ×4', m: { energy: 0.4, crystalx: 4 } },
  { id: 'feral', n: 'Feral', d: 'Void fauna everywhere, loot ×2.5', m: { fauna: 1, loot: 2.5 } },
  { id: 'hushed', n: 'Hushed', d: 'The Silence is awake from the start. Ascension points ×2', m: { silence: 1, ap: 2 } },
  { id: 'dense', n: 'Crowded', d: 'More stars, jump range ×0.7', m: { density: 1.6, jump: 0.7 } },
  { id: 'sparse', n: 'Thin', d: 'Fewer stars, jump range ×1.7', m: { density: 0.55, jump: 1.7 } },
  { id: 'frail', n: 'Brittle', d: 'All hulls ×0.5, all damage ×2', m: { hull: 0.5, dmg: 2 } },
  { id: 'gilded', n: 'Gilded', d: 'Credits ×4, buildings cost ×1.5', m: { credits: 4, cost: 1.5 } },
  { id: 'old', n: 'Ancient', d: 'Ruins everywhere, artifacts three times as likely', m: { ruins: 1, arti: 3 } },
  { id: 'quick', n: 'Hasty', d: 'All production ×2, raids twice as often', m: { mine: 2, ind: 2, sci: 2, energy: 2, raids: 2 } },
  { id: 'loud', n: 'Loud', d: 'Signature builds ×2, ship mining ×3', m: { heat: 2, shipmine: 3 } }
];
G.UMOD = {}; for (const u of G.UMODS) G.UMOD[u.id] = u;

/* ---------- Alien civilisation ingredients ---------- */
G.GOVS = ['Collective Intelligence', 'Military Empire', 'Merchant League', 'Theocracy', 'Hive', 'Technocracy', 'Nomad Fleet', 'Corporate Syndicate', 'Hereditary Dominion', 'Machine Consensus', 'Monastic Order', 'Pirate Republic', 'Dream Parliament', 'Fungal Commonwealth'];
G.PERSONALITIES = [
  { id: 'peace', n: 'Pacifist', base: 25, war: 0 }, { id: 'trader', n: 'Mercantile', base: 15, war: 0.1 },
  { id: 'curious', n: 'Curious', base: 10, war: 0.1 }, { id: 'proud', n: 'Proud', base: -5, war: 0.4 },
  { id: 'xeno', n: 'Xenophobic', base: -30, war: 0.6 }, { id: 'war', n: 'Warlike', base: -45, war: 1 },
  { id: 'zeal', n: 'Zealous', base: -20, war: 0.7 }, { id: 'sly', n: 'Scheming', base: 0, war: 0.3 }
];
G.QUIRKS = [
  { id: 'hateAI', n: 'They hate artificial intelligence.', d: 'Relations fall while you run Robot Factories.' },
  { id: 'loveTrade', n: 'They respect a good deal.', d: 'Trade pacts are worth double with them.' },
  { id: 'hateExpand', n: 'They resent expansion.', d: 'Every ten colonies you hold costs you standing.' },
  { id: 'loveStrong', n: 'They admire strength.', d: 'They like you more the bigger your fleet.' },
  { id: 'hateMega', n: 'They fear star-builders.', d: 'Megastructures frighten them.' },
  { id: 'loveScience', n: 'They worship knowledge.', d: 'They warm to you as you research.' },
  { id: 'isolation', n: 'They want to be left alone.', d: 'Entering their space without a pact angers them.' },
  { id: 'lovePets', n: 'They adore strange animals.', d: 'Each companion you keep pleases them.' },
  { id: 'hatePirates', n: 'They despise pirates.', d: 'Destroying pirate bases earns their respect.' },
  { id: 'remember', n: 'They remember the Silence.', d: 'They will help when it comes.' }
];
G.BODIES = ['avian', 'fungal', 'crystalline', 'cephalopod', 'insectoid', 'reptilian', 'gaseous', 'mechanical', 'mammalian', 'arboreal', 'aquatic', 'energy'];

/* ---------- Cosmetics: hull paint and engine trails. Earned by playing, kept through ascension. ---------- */
// c: colour (null = factory finish), anim: colour cycles, u: unlock test, d: how to earn it
G.PAINTS = [
  { id: 'stock', n: 'Factory Finish', c: null, d: 'What it came with.', u: () => true },
  { id: 'crimson', n: 'Crimson', c: '#ff5a6a', d: 'Destroy 50 hostiles.', u: () => G.S.stats.kills >= 50 },
  { id: 'jade', n: 'Jade', c: '#5cffb0', d: 'Found 3 colonies.', u: () => G.S.stats.colonized >= 3 },
  { id: 'cobalt', n: 'Cobalt', c: '#5c8cff', d: 'Jump 25 times.', u: () => G.S.stats.jumps >= 25 },
  { id: 'amber', n: 'Amber', c: '#ffc24a', d: 'Mine 5,000 ore by hand.', u: () => G.S.stats.mined >= 5000 },
  { id: 'violet', n: 'Envoy Violet', c: '#c08aff', d: 'Meet an alien civilisation.', u: () => Object.keys(G.S.codex.species).length >= 1 },
  { id: 'bone', n: 'Bone', c: '#f1ead8', d: 'Die 10 times.', u: () => G.S.stats.deaths >= 10 },
  { id: 'midnight', n: 'Midnight', c: '#4a5a8a', d: 'Destroy 5 pirate bases.', u: () => G.S.stats.bases >= 5 },
  { id: 'hunter', n: 'Trophy Orange', c: '#ff8a3c', d: 'Kill 5 bosses.', u: () => G.S.stats.bossKills >= 5 },
  { id: 'solar', n: 'Solar Gold', c: '#ffe27a', d: 'Complete a Dyson Sphere.', u: () => G.megaAny('dyson', 5) },
  { id: 'ghost', n: 'Ghost White', c: '#ffffff', d: 'Defeat the Silence.', u: () => G.S.silence.defeated },
  { id: 'prism', n: 'Prismatic', c: '#ffffff', anim: 1, d: 'Own a prismatic companion.', u: () => Object.values(G.S.comp).some(c => c.pris) },
  { id: 'aurora', n: 'Aurora', c: '#7dffb0', anim: 2, d: 'Reach a second universe.', u: () => G.S.uni.n >= 2 }
];
G.TRAILS = [
  { id: 'ember', n: 'Ember', c: '#ffb060', d: 'Standard exhaust.', u: () => true },
  { id: 'ion', n: 'Ion Blue', c: '#7dd0ff', d: 'Research Afterburners.', u: () => !!G.S.tech.exp5 },
  { id: 'toxic', n: 'Reactor Green', c: '#9dff5c', d: 'Research Fusion Power.', u: () => !!G.S.tech.enr4 },
  { id: 'rose', n: 'Rose', c: '#ff8cc0', d: 'Gain a companion.', u: () => Object.keys(G.S.comp).length >= 1 },
  { id: 'void', n: 'Void Violet', c: '#b07cff', d: 'Go through a wormhole.', u: () => G.S.stats.wormholes >= 1 },
  { id: 'gold', n: 'Gilded', c: '#ffd76a', d: 'Ascend once.', u: () => G.S.asc.count >= 1 },
  { id: 'white', n: 'Whiteout', c: '#ffffff', d: 'Defeat the Silence.', u: () => G.S.silence.defeated },
  { id: 'rainbow', n: 'Spectrum', c: '#ffffff', anim: 1, d: 'Reach a second universe.', u: () => G.S.uni.n >= 2 }
];
G.PAINT = {}; for (const p of G.PAINTS) G.PAINT[p.id] = p;
G.TRAIL = {}; for (const p of G.TRAILS) G.TRAIL[p.id] = p;
G.cosColor = function (d, fallback) {
  if (!d || !d.c) return fallback;
  if (d.anim === 1) return G.hslHex(G.S.t * 60, 0.9, 0.7);
  if (d.anim === 2) return G.hslHex(140 + 70 * Math.sin(G.S.t * 0.8), 0.9, 0.68);
  return d.c;
};
G.paintColor = function () { const S = G.S; return G.cosColor(G.PAINT[S.cos.paint], S.ship.hullClass === 0 ? '#d99a6a' : '#9fd8ff'); };
G.trailColor = function () { return G.cosColor(G.TRAIL[G.S.cos.trail], '#ffb060'); };
G.cosTick = function () {
  const own = G.S.cos.own;
  for (const list of [G.PAINTS, G.TRAILS]) for (const p of list) if (!own[p.id]) { let ok = false; try { ok = p.u(); } catch (e) { /* not yet */ } if (ok) { own[p.id] = 1; G.log('Cosmetic unlocked: ' + p.n + ' (Ship panel, Hulls & Paint).', 'good'); } }
};
