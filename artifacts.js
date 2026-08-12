// ============================================
// ARTIFACT CRAFTING CONFIG
// Static structural data (tiers, artifact list, token costs, the 6
// crafting chains) — not admin-editable, per the source spec (only
// season path content is called out as admin-overridable). Icons
// live in assets/artifacts/{id}.png, copied from the provided pack.
//
// Academic integrity: Tier 3-5 "effects" are cosmetic/lore flavor
// only (badge titles + card text). Nothing here alters grades, exam
// results, or another student's record. Tier 2's shared bonus is a
// small formation-activity nicety the teacher configures manually —
// it's flavor text here, not an automated grade change.
// ============================================

export const TOKEN_COST_BY_TIER = { 1: 1, 2: 2, 3: 3, 4: 4 };

export const TIERS = [
  { tier: 1, name: 'Common Artifacts', accent: '#9CA9C4' },
  { tier: 2, name: 'Rare Artifacts', accent: '#4ADE80' },
  { tier: 3, name: 'Epic Artifacts', accent: '#56B2BB' },
  { tier: 4, name: 'Mythical Artifacts', accent: '#B084F0' },
  { tier: 5, name: 'Legendary Artifacts', accent: '#FBBF24' }
];

export const ARTIFACTS = {
  1: [
    { id: 'sisters_shroud', name: "Sister's Shroud" },
    { id: 'spark_of_courage', name: 'Spark of Courage' },
    { id: 'occult_bracelet', name: 'Occult Bracelet' },
    { id: 'kobold_cup', name: 'Kobold Cup' },
    { id: 'orb_of_destruction', name: 'Orb of Destruction' },
    { id: 'dormant_curio', name: 'Dormant Curio' }
  ],
  2: [
    { id: 'mana_draught', name: 'Mana Draught' },
    { id: 'brigands_blade', name: "Brigand's Blade" },
    { id: 'essence_ring', name: 'Essence Ring' },
    { id: 'gossamer_cape', name: 'Gossamer Cape' },
    { id: 'iron_talon', name: 'Iron Talon' },
    { id: 'searing_signet', name: 'Searing Signet' }
  ],
  3: [
    { id: 'gale_guard', name: 'Gale Guard' },
    { id: 'serrated_shiv', name: 'Serrated Shiv' },
    { id: 'psychic_headband', name: 'Psychic Headband' },
    { id: 'jidi_pollen_bag', name: 'Jidi Pollen Bag' },
    { id: 'ceremonial_robe', name: 'Ceremonial Robe' },
    { id: 'whisper_of_the_dread', name: 'Whisper of the Dread' }
  ],
  4: [
    { id: 'outworld_staff', name: 'Outworld Staff' },
    { id: 'giants_maul', name: "Giant's Maul" },
    { id: 'magnifying_monocle', name: 'Magnifying Monocle' },
    { id: 'dezun_bloodrite', name: 'Dezun Bloodrite' },
    { id: 'crippling_crossbow', name: 'Crippling Crossbow' },
    { id: 'pyrrhic_cloak', name: 'Pyrrhic Cloak' }
  ],
  5: [
    { id: 'fallen_sky', name: 'Fallen Sky' },
    { id: 'unrelenting_eye', name: 'Unrelenting Eye' },
    { id: 'book_of_the_dead', name: 'Book of the Dead' },
    { id: 'helm_of_the_undying', name: 'Helm of the Undying' },
    { id: 'stygian_desolator', name: 'Stygian Desolator' },
    { id: 'divine_regalia', name: 'Divine Regalia' }
  ]
};

// tier1 -> tier2 -> tier3 -> tier4 -> tier5, in purchase order
export const CRAFTING_CHAINS = [
  { tier5Id: 'helm_of_the_undying', tier5Name: 'Helm of the Undying', chain: ['dormant_curio', 'searing_signet', 'whisper_of_the_dread', 'pyrrhic_cloak'] },
  { tier5Id: 'stygian_desolator', tier5Name: 'Stygian Desolator', chain: ['spark_of_courage', 'brigands_blade', 'serrated_shiv', 'giants_maul'] },
  { tier5Id: 'divine_regalia', tier5Name: 'Divine Regalia', chain: ['orb_of_destruction', 'iron_talon', 'ceremonial_robe', 'crippling_crossbow'] },
  { tier5Id: 'fallen_sky', tier5Name: 'Fallen Sky', chain: ['sisters_shroud', 'mana_draught', 'gale_guard', 'outworld_staff'] },
  { tier5Id: 'unrelenting_eye', tier5Name: 'Unrelenting Eye', chain: ['occult_bracelet', 'essence_ring', 'psychic_headband', 'magnifying_monocle'] },
  { tier5Id: 'book_of_the_dead', tier5Name: 'Book of the Dead', chain: ['kobold_cup', 'gossamer_cape', 'jidi_pollen_bag', 'dezun_bloodrite'] }
];

export function artifactIconPath(id) {
  return `assets/artifacts/${id}.png`;
}

export function findArtifact(id) {
  for (const tierArtifacts of Object.values(ARTIFACTS)) {
    const match = tierArtifacts.find((a) => a.id === id);
    if (match) return match;
  }
  return null;
}

export function tierOfArtifact(id) {
  for (const [tier, tierArtifacts] of Object.entries(ARTIFACTS)) {
    if (tierArtifacts.some((a) => a.id === id)) return parseInt(tier);
  }
  return null;
}

export function chainForTier5(tier5Id) {
  return CRAFTING_CHAINS.find((c) => c.tier5Id === tier5Id) || null;
}
