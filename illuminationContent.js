// ============================================
// ILLUMINATION (Vault Game) — content and rewards.
//
// This is the Sanctuarium's own copy of the "Illumination" 2D climb, kept
// completely separate from the Side Quest version in sideQuests.js /
// sidequest-illumination.html. Same canvas game, same six lantern-shard
// reflections and the same closing reflection on reaching the Beacon
// (reused near-verbatim below — they're solid, checkable content and
// there's no reason to rewrite good scripture citations twice) — but its
// own Firestore record (vaultGames.illumination.*, not sideQuests.*) and
// its own, uniquely-named reward: The Lumiere. A student can play the
// Side Quest run (when it's released) and this Vault Game run and earn
// both rewards independently; neither one knows the other exists.
// ============================================

import { TICKETS } from './vaultTickets.js';

// THE LUMIERE — two separate one-time grants, additive, same as the Side
// Quest's own two-stage structure: gathering all six shards pays out
// SHARDS_REWARD once; reaching the Beacon (regardless of shard count)
// pays out BEACON_REWARD once. A full run nets both.
//
// Every other Vault Game hands out one flat reward per finish (10 of each
// ticket, 25 Ember Shards, 4 Artifact Unlock Tokens). This climb pays out
// more than that on top -- it's the hardest game in the Sanctuarium (a
// full platformer level, not a quiz), so the full-run total here is
// 22/22/22/22/37 tickets + 14 tokens. Split unevenly across the two
// stages on purpose (the shards milestone pays a bit less than the
// Beacon, tokens held entirely for the Beacon) since reaching the Beacon
// is the harder, longer half of the climb.
export const SHARDS_REWARD = {
  tickets: [
    { key: "sigil", count: 10 },
    { key: "seal", count: 10 },
    { key: "scroll", count: 10 },
    { key: "herald", count: 10 },
    { key: "shard", count: 16 },
  ],
  unlockTokens: 0,
};

export const BEACON_REWARD = {
  tickets: [
    { key: "sigil", count: 12 },
    { key: "seal", count: 12 },
    { key: "scroll", count: 12 },
    { key: "herald", count: 12 },
    { key: "shard", count: 21 },
  ],
  unlockTokens: 14,
};

export const TREASURE_ICON = 'assets/the-lumiere.jpg';

// Short reflections shown the moment each shard is picked up. Own
// phrasing, plus a short attributed Bible verse each -- copied verbatim
// from the Side Quest's shardReflections, since the theme (light found
// one step at a time) fits this game exactly the same way here.
export const SHARD_REFLECTIONS = [
  { verse: '"The people who walked in darkness have seen a great light." — Isaiah 9:2',
    note: 'Every act of faith starts as a small flame — small enough to fit in one hand, but strong enough to take the first step.' },
  { verse: '"Your word is a lamp for my feet and a light for my path." — Psalm 119:105',
    note: "God rarely shows the whole road at once. He shows enough of it for the next step — and then the next." },
  { verse: '"The light shines in the darkness, and the darkness has not overcome it." — John 1:5',
    note: 'The dark parts of life — grief, doubt, a hard season — were never stronger than the light. They only look that way up close.' },
  { verse: '"Even the darkness is not dark to you; the night is as bright as the day." — Psalm 139:12',
    note: "God isn't waiting on the other side of your darkest season for you to arrive. He's already walking through it with you." },
  { verse: '"You, Lord, keep my lamp burning; my God turns my darkness into light." — Psalm 18:28',
    note: "The oil runs low because the walk is hard, not because you're doing it wrong. It gets refilled — that's the whole point of the lamps along the way." },
  { verse: '"I am the light of the world. Whoever follows me will never walk in darkness." — John 8:12',
    note: "Six shards in, the lantern reaches further — not because the dark got smaller, but because you're carrying more of the light now." }
];

// The longer reflection shown once the Beacon is reached, tying the
// game's light/dark theme to the Church's own old name for Baptism:
// "Illumination." Copied verbatim from the Side Quest's beaconReflection.
export const BEACON_REFLECTION = {
  heading: 'The Beacon Is Lit',
  text: "You crossed the whole valley in the dark, one small circle of lantern-light at a time — and the tower was there waiting the entire way.\n\nThat isn't only how this game works. From the earliest days of the Church, the moment a person is baptized has been called \"Illumination\" — the point where someone stops merely holding on to a light from the outside, and starts being lit up by one from within.\n\nThe darkness doesn't fully disappear — not in this game, and not in life. Grief still comes. Doubt still comes. Seasons still come that make no sense while you're inside them. But none of it gets the last word: \"The light shines in the darkness, and the darkness has not overcome it.\" (John 1:5)\n\nWhatever quagmire you're walking through right now, you are not walking through it alone, and you are not walking toward nothing. There is a light on the other side of it — and it was never one you had to make yourself."
};

export { TICKETS };
