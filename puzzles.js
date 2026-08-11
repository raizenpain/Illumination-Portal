// ============================================
// PUZZLE CONFIGURATION
// Add/edit entries here to change puzzle details.
// requiresGate: the Firestore field that must be true
// before a student can access this puzzle (null = no gate).
// ============================================

export const PUZZLE_CONFIG = {
  1: {
    totalPieces: 9,
    title: "Puzzle 1",
    subtitle: "The Cross",
    pieceImageExt: "jpg",
    pieceImageAspect: "3 / 4",
    piecesField: "puzzle1",
    completedField: "puzzle1Completed",
    requiresGate: null,
    completionAchievement: {
      id: "beatitudes_master", title: "Cross Master",
      text: "You completed Puzzle 1.", icon: "👑", rank: "Disciple"
    },
    milestoneAchievements: [
      { count: 1, id: "first_step", title: "First Step", text: "You collected your first puzzle piece.", icon: "🥉" },
      { count: 3, id: "faith_explorer", title: "Faith Explorer", text: "You collected 3 puzzle pieces.", icon: "🧭" },
      { count: 6, id: "mission_builder", title: "Mission Builder", text: "You collected 6 puzzle pieces.", icon: "🛠️" }
    ]
  },
  2: {
    totalPieces: 9,
    title: "Puzzle 2",
    subtitle: "The Spirituality",
    pieceImageExt: "jpg",
    pieceImageAspect: "326 / 341",
    piecesField: "puzzle2",
    completedField: "puzzle2Completed",
    requiresGate: "puzzle2Unlocked",
    completionAchievement: {
      id: "sacraments_master", title: "Spirituality Master",
      text: "You completed Puzzle 2.", icon: "👑", rank: "Missionary"
    },
    milestoneAchievements: []
  },
  3: {
    totalPieces: 9,
    title: "Puzzle 3",
    subtitle: "The Vocation",
    pieceImageExt: "jpg",
    pieceImageAspect: "380 / 254",
    piecesField: "puzzle3",
    completedField: "puzzle3Completed",
    requiresGate: "puzzle3Unlocked",
    completionAchievement: {
      id: "vocation_master", title: "Vocation Master",
      text: "You completed Puzzle 3.", icon: "👑", rank: "Apostle"
    },
    milestoneAchievements: []
  }
};