/*
 * The Ridge, as the game has it (trailquest/Software/Libs/Core/Header/data/:
 * Stages.hpp, Species.hpp, Story.hpp). Names, lines and the stage pages are
 * the game's own words; the colours follow DESIGN.md's "By stage".
 * The sprites are exported from Tools/Art/gen_art.py into public/trail-quest/sprites/.
 */

export type Spirit = { id: string; name: string; line: string; boss?: boolean };

export type Stage = {
  n: number;
  name: string;
  page: string;
  ahead: string;
  sky: string;
  hill: string;
  ground: string;
  path: string;
  spirits: Spirit[];
};

export const STAGES: Stage[] = [
  {
    n: 1,
    name: 'Valley Path',
    page: 'Easy ground. Start steady and eat early.',
    ahead: 'The Old Tortoise is fatigue. Fuel up first.',
    sky: '#0080c0',
    hill: '#008000',
    ground: '#00c000',
    path: '#c0c080',
    spirits: [
      { id: 'fox', name: 'Red Fox', line: 'A side stitch: sharp pain under the ribs.' },
      { id: 'bear', name: 'Brown Bear', line: 'The bonk. Fuel runs out and the legs go.' },
      { id: 'beetle', name: 'Ruby Beetle', line: 'A hot spot in your sock, rubbing raw.' },
      { id: 'crab', name: 'Sand Crab', line: 'Grit in your shoe, chafing every step.' },
      { id: 'tortoise', name: 'Old Tortoise', line: 'Late fatigue. Slow, steady, heavy.', boss: true },
    ],
  },
  {
    n: 2,
    name: 'Switchback Climb',
    page: 'Steep. Pace it, save energy.',
    ahead: 'The Great Stag is the long climb. Take a Gel before it.',
    sky: '#404080',
    hill: '#004000',
    ground: '#408000',
    path: '#804000',
    spirits: [
      { id: 'fire_newt', name: 'Fire Newt', line: 'Burning quads from the climb. Walk the steeps.' },
      { id: 'gnat_swarm', name: 'Gnat Swarm', line: 'Calf cramp. Salt and a shorter stride.' },
      { id: 'barn_owl', name: 'Barn Owl', line: 'Doubt in the dark. Slow your breathing.' },
      { id: 'pygmy_shrew', name: 'Pygmy Shrew', line: 'A niggle: small aches that wreck your focus.' },
      { id: 'great_stag', name: 'The Great Stag', line: 'The long climb, taken too fast.', boss: true },
    ],
  },
  {
    n: 3,
    name: 'Scree Fields',
    page: 'Loose rock. Short steps, eyes ahead.',
    ahead: 'The Ram King is the scree itself. Poles help on rock.',
    sky: '#808080',
    hill: '#404040',
    ground: '#808040',
    path: '#c0c080',
    spirits: [
      { id: 'rock_goat', name: 'Rock Goat', line: 'Loose rock punishes a long stride.' },
      { id: 'mist_wisp', name: 'Mist Wisp', line: 'Self-doubt in the mist. Stay on pace.' },
      { id: 'wall_lizard', name: 'Wall Lizard', line: 'Wet rock. One bad step and you slip.' },
      { id: 'marmot', name: 'Marmot', line: 'Rolling stones. Watch your footing.' },
      { id: 'ram_king', name: 'The Ram King', line: 'Loose scree. Short steps.', boss: true },
    ],
  },
  {
    n: 4,
    name: 'Ridge Line',
    page: 'Wind and drops. Keep a short, low stride.',
    ahead: 'The Golden Eagle is the exposed edge. Stay steady.',
    sky: '#40c0c0',
    hill: '#c08040',
    ground: '#c0c080',
    path: '#804000',
    spirits: [
      { id: 'wind_sprite', name: 'Wind Sprite', line: 'A headwind that costs you speed for hours.' },
      { id: 'raven', name: 'Raven', line: 'Doubt on the edge. Watch the path, not the drop.' },
      { id: 'snow_hare', name: 'Snow Hare', line: 'Cold numbs you. Keep moving and keep eating.' },
      { id: 'golden_eagle', name: 'The Golden Eagle', line: 'The exposed edge. Stay steady.', boss: true },
    ],
  },
  {
    n: 5,
    name: 'The Summit',
    page: 'Cold, thin air. Eat, drink, keep moving.',
    ahead: 'The grey shape from the ridge waits at the top.',
    sky: '#000040',
    hill: '#404080',
    ground: '#c0c0c0',
    path: '#8080c0',
    spirits: [
      { id: 'ghost_goat', name: 'Ghost Goat', line: 'Thin air. Every breath gives less.' },
      { id: 'snow_fox', name: 'Snow Fox', line: 'Cold hands. Keep them moving.' },
      { id: 'summit_wolf', name: 'The Summit Wolf', line: 'Kept pace since the valley.', boss: true },
    ],
  },
];

export const SPIRIT_COUNT = STAGES.reduce((n, s) => n + s.spirits.length, 0);

export const sprite = (id: string, frame: 0 | 1 = 0) => `/trail-quest/sprites/${id}-${frame}.png`;
