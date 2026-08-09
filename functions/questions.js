// AUTHORITATIVE challenge answers — server-side only.
// Never import this from client code; the public copy the client renders
// (../questions.js) intentionally omits correctIndex.

const CHALLENGES = {

  puzzle2: [
    {
      question: "According to the Beatitudes, who will inherit the earth?",
      options: ["The rich", "The meek", "The proud", "The powerful"],
      correctIndex: 1
    },
    {
      question: '"Blessed are the poor in spirit, for theirs is..."',
      options: ["great wealth", "the kingdom of heaven", "long life", "many friends"],
      correctIndex: 1
    },
    {
      question: "How many Beatitudes are there in the Gospel of Matthew?",
      options: ["5", "7", "8", "10"],
      correctIndex: 2
    }
  ],

  puzzle3: [
    {
      question: "How many Sacraments are there in the Catholic Church?",
      options: ["5", "6", "7", "8"],
      correctIndex: 2
    },
    {
      question: "Which Sacrament can only be received once?",
      options: ["Confession", "Holy Communion", "Baptism", "Anointing of the Sick"],
      correctIndex: 2
    },
    {
      question: "What is the Sacrament of healing for the seriously ill called?",
      options: ["Confirmation", "Anointing of the Sick", "Holy Orders", "Matrimony"],
      correctIndex: 1
    }
  ]

};

module.exports = { CHALLENGES };
