// ============================================
// CHALLENGE QUESTIONS (client display copy)
// This is what the browser uses to render the quiz UI.
// Correct answers are graded server-side in functions/questions.js —
// they are intentionally NOT included here so they can't be read via
// view-source or devtools.
// Edit the text inside the quotes to change questions, but keep this
// file and functions/questions.js in sync (same order, same options).
// ============================================

export const CHALLENGES = {

  puzzle2: [
    {
      question: "According to the Beatitudes, who will inherit the earth?",
      options: ["The rich", "The meek", "The proud", "The powerful"]
    },
    {
      question: '"Blessed are the poor in spirit, for theirs is..."',
      options: ["great wealth", "the kingdom of heaven", "long life", "many friends"]
    },
    {
      question: "How many Beatitudes are there in the Gospel of Matthew?",
      options: ["5", "7", "8", "10"]
    }
  ],

  puzzle3: [
    {
      question: "How many Sacraments are there in the Catholic Church?",
      options: ["5", "6", "7", "8"]
    },
    {
      question: "Which Sacrament can only be received once?",
      options: ["Confession", "Holy Communion", "Baptism", "Anointing of the Sick"]
    },
    {
      question: "What is the Sacrament of healing for the seriously ill called?",
      options: ["Confirmation", "Anointing of the Sick", "Holy Orders", "Matrimony"]
    }
  ]

};
