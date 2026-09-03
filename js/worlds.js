// ============================================================================
//  worlds.js — pack-themed biomes. The place follows the unit.
// ============================================================================
//
// The words already change with the pack. This file is what makes the PLACE
// change too: sky, ground, water, trees and the two landmark plots. Gameplay
// layout is untouched — the island is still four streets off a plaza, the obby
// is still a corridor over lava.
//
// A pack sets `world: 'beach'` in words.js. Unknown or missing ids fall back
// to `town`, so a pack a teacher adds later still boots.

export const DEFAULT_WORLD_ID = 'town';

const TOWN_SKY = {
  zenith: '#125aa8', mid: '#3d92d4', haze: '#8ecaed',
  horizon: '#d8eefb', belowHaze: '#c6e2f0', below: '#a8c6d8',
  background: 0x63aee2, fog: 0xbcdcf0, clouds: 1,
};

const TOWN_LIGHTS = {
  hemiSky: 0xcfe8ff, hemiGround: 0x8a7a4e, hemiInt: 0.42,
  fill: 0xd6e2ee, fillInt: 0.42,
  rim: 0xbfe3ff, rimInt: 0.6,
  ambient: 0xfff1dd, ambientInt: 0.20,
  sun: 0xffeec2, sunInt: 2.9,
};

const TOWN_ENV = {
  zenith: '#eaf3ff', sky: '#cfe6fb', haze: '#c9d8b4',
  near: '#9fae86', bounce: '#7d6f52',
};

export const WORLDS = {
  town: {
    id: 'town', name: 'Park Town',
    sky: TOWN_SKY, lights: TOWN_LIGHTS, env: TOWN_ENV,
    plateau: 'Bright green', shore: 'Cool yellow', plaza: 'Medium stone grey',
    plazaTex: 'pave',
    seaFloor: 'Sand blue', seaWater: 0x2ea6dd,
    groundTex: null, landmark: 'fair', landmarkPad: 'Br. yellowish green',
    trees: { palm: false, density: 1, flowers: true },
    isles: {
      sand: 'Cool yellow', mid: 'Bright green',
      grass: 'Br. yellowish green', top: 'Institutional white',
    },
    obby: {
      lobby: 'Medium stone grey',
      rim: ['Bright red', 'Bright blue', 'Bright yellow'],
      arch: 'Bright yellow', sides: 'trees', finish: 'Bright yellow',
    },
  },

  campus: {
    id: 'campus', name: 'School Campus',
    sky: TOWN_SKY, lights: TOWN_LIGHTS, env: TOWN_ENV,
    plateau: 'Br. yellowish green', shore: 'Cool yellow', plaza: 'Medium stone grey',
    plazaTex: 'pave',
    seaFloor: 'Sand blue', seaWater: 0x2ea6dd,
    groundTex: 'grass', landmark: 'campus', landmarkPad: 'Br. yellowish green',
    trees: { palm: false, density: 0.7, flowers: true },
    isles: {
      sand: 'Cool yellow', mid: 'Bright green',
      grass: 'Br. yellowish green', top: 'Institutional white',
    },
    obby: {
      lobby: 'Cool yellow',
      rim: ['Bright red', 'Bright blue', 'Cool yellow'],
      arch: 'Bright red', sides: 'flags', finish: 'Bright yellow',
    },
  },

  fair: {
    id: 'fair', name: 'Toy Fair',
    sky: {
      zenith: '#1a62b0', mid: '#4aa0dc', haze: '#a8d8f4',
      horizon: '#fff4d8', belowHaze: '#d8eaf8', below: '#b0d0e4',
      background: 0x6ab8e8, fog: 0xd0e8f8, clouds: 1,
    },
    lights: {
      hemiSky: 0xd8f0ff, hemiGround: 0xb09050, hemiInt: 0.46,
      fill: 0xffe8d0, fillInt: 0.48,
      rim: 0xffe8c8, rimInt: 0.55,
      ambient: 0xfff4dd, ambientInt: 0.24,
      sun: 0xfff0c4, sunInt: 3.0,
    },
    env: {
      zenith: '#f4f8ff', sky: '#d8eefc', haze: '#e8d8a8',
      near: '#b8ae70', bounce: '#8a7048',
    },
    plateau: 'Cool yellow', shore: 'Cool yellow', plaza: 'Hot pink',
    plazaTex: null,
    seaFloor: 'Sand blue', seaWater: 0x3eb4e4,
    groundTex: null, landmark: 'fair', landmarkPad: 'Cool yellow',
    trees: { palm: false, density: 0.55, flowers: true },
    isles: {
      sand: 'Cool yellow', mid: 'Bright yellow',
      grass: 'Br. yellowish green', top: 'Hot pink',
    },
    obby: {
      lobby: 'Hot pink',
      rim: ['Bright yellow', 'Bright violet', 'Bright blue'],
      arch: 'Bright yellow', sides: 'balloons', finish: 'Bright yellow',
    },
  },

  beach: {
    id: 'beach', name: 'Sandy Shore',
    sky: {
      zenith: '#0a72b8', mid: '#2eb8d8', haze: '#7ee4ea',
      horizon: '#fff0c8', belowHaze: '#d8f0ea', below: '#88d0c8',
      background: 0x48c8dc, fog: 0xc8f0f4, clouds: 0.7,
    },
    lights: {
      hemiSky: 0xc8f4ff, hemiGround: 0xc8a060, hemiInt: 0.5,
      fill: 0xffe0b8, fillInt: 0.5,
      rim: 0xfff0c0, rimInt: 0.55,
      ambient: 0xfff4dc, ambientInt: 0.26,
      sun: 0xfff2b0, sunInt: 3.15,
    },
    env: {
      zenith: '#e0f8ff', sky: '#b8ecf4', haze: '#e8d8a0',
      near: '#c8b878', bounce: '#a08048',
    },
    plateau: 'Cool yellow', shore: 'Cool yellow', plaza: 'Cool yellow',
    plazaTex: null,
    seaFloor: 'Pastel blue', seaWater: 0x1ec8d0,
    groundTex: null, landmark: 'pier', landmarkPad: 'Reddish brown',
    trees: { palm: true, density: 0.7, flowers: false },
    isles: {
      sand: 'Cool yellow', mid: 'Bright bluish green',
      grass: 'Br. yellowish green', top: 'Institutional white',
    },
    obby: {
      lobby: 'Cool yellow',
      rim: ['Bright bluish green', 'Bright yellow', 'Bright orange'],
      arch: 'Bright bluish green', sides: 'palms', finish: 'Bright yellow',
    },
  },

  jungle: {
    id: 'jungle', name: 'Wild Grove',
    sky: {
      zenith: '#145868', mid: '#2a8a78', haze: '#7ab898',
      horizon: '#c8dcb0', belowHaze: '#a8c898', below: '#6a8a68',
      background: 0x4a9a80, fog: 0xa8c8b0, clouds: 0.85,
    },
    lights: {
      hemiSky: 0xc0e8d8, hemiGround: 0x4a6a38, hemiInt: 0.4,
      fill: 0xb8d0b0, fillInt: 0.38,
      rim: 0xa8e0c8, rimInt: 0.5,
      ambient: 0xe8f0d8, ambientInt: 0.18,
      sun: 0xffe8b0, sunInt: 2.5,
    },
    env: {
      zenith: '#d8f0e8', sky: '#b0dcc8', haze: '#a8c080',
      near: '#6a8a50', bounce: '#4a5a32',
    },
    plateau: 'Bright green', shore: 'Br. yellowish green', plaza: 'Br. yellowish green',
    plazaTex: 'grass',
    seaFloor: 'Sand blue', seaWater: 0x1a8a9a,
    groundTex: 'grass', landmark: 'grove', landmarkPad: 'Bright green',
    trees: { palm: true, density: 1.55, flowers: true },
    isles: {
      sand: 'Br. yellowish green', mid: 'Bright green',
      grass: 'Bright green', top: 'Br. yellowish green',
    },
    obby: {
      lobby: 'Bright green',
      rim: ['Reddish brown', 'Bright green', 'Br. yellowish green'],
      arch: 'Bright green', sides: 'palms', finish: 'Br. yellowish green',
    },
  },

  stadium: {
    id: 'stadium', name: 'Sports Pitch',
    sky: {
      zenith: '#0e58a8', mid: '#3a98d8', haze: '#88d0f0',
      horizon: '#e8f4fc', belowHaze: '#c8e0f0', below: '#98c0d8',
      background: 0x58b0e4, fog: 0xc8e4f4, clouds: 0.55,
    },
    lights: {
      hemiSky: 0xd8f0ff, hemiGround: 0x708048, hemiInt: 0.48,
      fill: 0xe0e8f0, fillInt: 0.44,
      rim: 0xc8e8ff, rimInt: 0.62,
      ambient: 0xfff8e8, ambientInt: 0.22,
      sun: 0xfff0c8, sunInt: 3.05,
    },
    env: {
      zenith: '#f0f8ff', sky: '#c8e8fc', haze: '#c8d8a0',
      near: '#7aa050', bounce: '#5a7040',
    },
    plateau: 'Bright green', shore: 'Br. yellowish green', plaza: 'Bright green',
    plazaTex: 'grass',
    seaFloor: 'Sand blue', seaWater: 0x2ea6dd,
    groundTex: 'grass', landmark: 'pitch', landmarkPad: 'Bright green',
    trees: { palm: false, density: 0.25, flowers: false },
    isles: {
      sand: 'Cool yellow', mid: 'Bright green',
      grass: 'Br. yellowish green', top: 'Institutional white',
    },
    obby: {
      lobby: 'Bright green',
      rim: ['Institutional white', 'Bright red', 'Bright blue'],
      arch: 'Institutional white', sides: 'posts', finish: 'Bright yellow',
    },
  },

  market: {
    id: 'market', name: 'Town Market',
    sky: {
      zenith: '#2460a8', mid: '#5a9ad0', haze: '#c8b888',
      horizon: '#f4e0b8', belowHaze: '#d8c8a0', below: '#b0a078',
      background: 0x88b0c8, fog: 0xe0d4b8, clouds: 0.9,
    },
    lights: {
      hemiSky: 0xfff0d8, hemiGround: 0xa08048, hemiInt: 0.44,
      fill: 0xffd8a8, fillInt: 0.46,
      rim: 0xffe8c0, rimInt: 0.5,
      ambient: 0xfff0d0, ambientInt: 0.24,
      sun: 0xffe0a0, sunInt: 2.85,
    },
    env: {
      zenith: '#fff4e0', sky: '#e8dcc0', haze: '#d8c490',
      near: '#b09058', bounce: '#8a6840',
    },
    plateau: 'Cool yellow', shore: 'Cool yellow', plaza: 'Deep orange',
    plazaTex: null,
    seaFloor: 'Sand blue', seaWater: 0x3aa0c8,
    groundTex: null, landmark: 'market', landmarkPad: 'Cool yellow',
    trees: { palm: false, density: 0.6, flowers: true },
    isles: {
      sand: 'Cool yellow', mid: 'Deep orange',
      grass: 'Br. yellowish green', top: 'Institutional white',
    },
    obby: {
      lobby: 'Deep orange',
      rim: ['Cool yellow', 'Bright red', 'Reddish brown'],
      arch: 'Deep orange', sides: 'lamps', finish: 'Bright yellow',
    },
  },

  clinic: {
    id: 'clinic', name: 'Health Court',
    sky: {
      zenith: '#5a98c8', mid: '#98c8e4', haze: '#d0e8f4',
      horizon: '#f4f8fc', belowHaze: '#e0ecf4', below: '#c0d4e0',
      background: 0xb0d4e8, fog: 0xe4f0f8, clouds: 0.45,
    },
    lights: {
      hemiSky: 0xf0f8ff, hemiGround: 0xb0b0b8, hemiInt: 0.5,
      fill: 0xe8eef4, fillInt: 0.5,
      rim: 0xe0f0ff, rimInt: 0.55,
      ambient: 0xffffff, ambientInt: 0.28,
      sun: 0xfff8f0, sunInt: 2.7,
    },
    env: {
      zenith: '#ffffff', sky: '#e4f0f8', haze: '#d8dce4',
      near: '#b8bcc4', bounce: '#9098a0',
    },
    plateau: 'Institutional white', shore: 'Pastel blue', plaza: 'Pastel blue',
    plazaTex: 'pave',
    seaFloor: 'Pastel blue', seaWater: 0x8ec8e0,
    groundTex: 'pave', landmark: 'courtyard', landmarkPad: 'Institutional white',
    trees: { palm: false, density: 0.3, flowers: true },
    isles: {
      sand: 'Pastel blue', mid: 'Institutional white',
      grass: 'Institutional white', top: 'Bright red',
    },
    obby: {
      lobby: 'Institutional white',
      rim: ['Bright red', 'Pastel blue', 'Institutional white'],
      arch: 'Bright red', sides: 'lamps', finish: 'Institutional white',
    },
  },

  ruins: {
    id: 'ruins', name: 'Old Times',
    sky: {
      zenith: '#6a4a28', mid: '#c48840', haze: '#e8c070',
      horizon: '#f4dcb0', belowHaze: '#e0c898', below: '#c8a870',
      background: 0xc49850, fog: 0xe0c890, clouds: 0.35,
    },
    lights: {
      hemiSky: 0xffe8c0, hemiGround: 0x8a6030, hemiInt: 0.4,
      fill: 0xe8c890, fillInt: 0.4,
      rim: 0xffd890, rimInt: 0.45,
      ambient: 0xffe8c8, ambientInt: 0.22,
      sun: 0xffd080, sunInt: 2.6,
    },
    env: {
      zenith: '#fff0d0', sky: '#f0d8a8', haze: '#d8b878',
      near: '#b89050', bounce: '#8a6030',
    },
    plateau: 'Cool yellow', shore: 'Reddish brown', plaza: 'Reddish brown',
    plazaTex: null,
    seaFloor: 'Sand blue', seaWater: 0x7a9aaa,
    groundTex: null, landmark: 'columns', landmarkPad: 'Cool yellow',
    trees: { palm: true, density: 0.4, flowers: false },
    isles: {
      sand: 'Cool yellow', mid: 'Reddish brown',
      grass: 'Cool yellow', top: 'Institutional white',
    },
    obby: {
      lobby: 'Reddish brown',
      rim: ['Cool yellow', 'Dark stone grey', 'Bright yellow'],
      arch: 'Cool yellow', sides: 'columns', finish: 'Bright yellow',
    },
  },

  travel: {
    id: 'travel', name: 'World Plaza',
    sky: {
      zenith: '#1a58a0', mid: '#4a90c8', haze: '#98c0d8',
      horizon: '#d8e8f0', belowHaze: '#c0d4e0', below: '#98b0c0',
      background: 0x68a8c8, fog: 0xc8dce8, clouds: 0.8,
    },
    lights: {
      hemiSky: 0xd8e8f4, hemiGround: 0x807860, hemiInt: 0.44,
      fill: 0xd0dce8, fillInt: 0.44,
      rim: 0xc8dcf0, rimInt: 0.58,
      ambient: 0xf0f0e8, ambientInt: 0.22,
      sun: 0xffeec2, sunInt: 2.85,
    },
    env: {
      zenith: '#e8f0f8', sky: '#c8dce8', haze: '#c0c8b0',
      near: '#909888', bounce: '#6a6860',
    },
    plateau: 'Br. yellowish green', shore: 'Medium stone grey', plaza: 'Medium stone grey',
    plazaTex: 'pave',
    seaFloor: 'Sand blue', seaWater: 0x2ea6dd,
    groundTex: 'pave', landmark: 'flags', landmarkPad: 'Medium stone grey',
    trees: { palm: false, density: 0.5, flowers: false },
    isles: {
      sand: 'Medium stone grey', mid: 'Bright blue',
      grass: 'Br. yellowish green', top: 'Institutional white',
    },
    obby: {
      lobby: 'Medium stone grey',
      rim: ['Bright blue', 'Bright red', 'Bright yellow'],
      arch: 'Bright blue', sides: 'flags', finish: 'Bright yellow',
    },
  },
};

export function worldForPack(pack) {
  if (!pack || !pack.world) return WORLDS[DEFAULT_WORLD_ID];
  return WORLDS[pack.world] || WORLDS[DEFAULT_WORLD_ID];
}
