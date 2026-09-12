import { defineStore } from "pinia";

const storageKey = "nomination-whist-game";

export const useGameStore = defineStore("game", {
  state: () => ({
    players: ["Craig", "Gary", "Kev"],
    rounds: [],
    roundNumber: 1,
    dealer: "",
    roundBids: {},
    roundSuits: {},
    roundTricks: {},
    trickSchedule: [7, 6, 5, 4, 3, 2, 1, "NT", 1, 2, 3, 4, 5, 6, 7],
    suits: [
      { name: "Spades", icon: "♠" },
      { name: "Clubs", icon: "♣" },
      { name: "Diamonds", icon: "♦" },
      { name: "Hearts", icon: "♥" },
    ],
  }),

  getters: {
    totals(state) {
      return state.players
        .map((name, playerIndex) => ({
          name,
          score: state.trickSchedule.reduce((total, _, roundIndex) => {
            const score = this.scoreForRound(roundIndex + 1, playerIndex);
            return total + (typeof score === "number" ? score : 0);
          }, 0),
        }))
        .sort((first, second) => second.score - first.score);
    },
    playerInitial: () => (name) => name.trim().charAt(0).toUpperCase(),
    roundValue: (state) => (number, playerIndex, property) => {
      if (property === "tricks" && state.roundTricks[number])
        return state.roundTricks[number][playerIndex] ?? "";
      return (
        state.rounds.find((round) => round.number === number)?.[property]?.[
          playerIndex
        ] ?? ""
      );
    },
    bidForRound: (state) => (number, playerIndex) => {
      if (state.trickSchedule[number - 1] === "NT") return 0;
      return (
        state.rounds.find((round) => round.number === number)?.bids[
          playerIndex
        ] ??
        state.roundBids[number]?.[playerIndex] ??
        ""
      );
    },
    tricksOptions: () => (tricks) =>
      Array.from(
        { length: (tricks === "NT" ? 7 : tricks) + 1 },
        (_, index) => index,
      ),
    bidOptions: () => (tricks) =>
      Array.from(
        { length: (tricks === "NT" ? 0 : tricks) + 1 },
        (_, index) => index,
      ),
    scoreForRound(state) {
      return (number, playerIndex) => {
        const savedScore = state.rounds.find((round) => round.number === number)
          ?.scores[playerIndex];
        if (savedScore !== undefined) return savedScore;
        const tricks = state.players.map((_, index) =>
          this.roundValue(number, index, "tricks"),
        );
        if (state.trickSchedule[number - 1] === "NT") {
          if (!tricks.every((tricksWon) => typeof tricksWon === "number"))
            return "";
          if (tricks.includes(7)) return tricks[playerIndex] === 7 ? 10 : 0;
          const tricksWon = tricks[playerIndex];
          return tricksWon + (tricksWon === 0 ? 10 : 0);
        }
        const bid = this.bidForRound(number, playerIndex);
        const tricksWon = tricks[playerIndex];
        return typeof bid === "number" && typeof tricksWon === "number"
          ? tricksWon + (tricksWon === bid ? 10 : 0)
          : "";
      };
    },
    dealerForRound: (state) => (number) => {
      const startingIndex = state.players.indexOf(state.dealer);
      if (startingIndex < 0) return "";
      return state.players[(startingIndex + number - 1) % state.players.length];
    },
    cumulativeScoreForRound(state) {
      return (number, playerIndex) => {
        if (
          !state.rounds.some((round) => round.number === number) &&
          !state.roundTricks[number]
        )
          return "";
        let cumulativeScore = 0;
        let hasScore = false;
        for (let round = 1; round <= number; round += 1) {
          const score = this.scoreForRound(round, playerIndex);
          if (typeof score === "number") {
            cumulativeScore += score;
            hasScore = true;
          }
        }
        return hasScore ? cumulativeScore : "";
      };
    },
    bidDifference: (state) => (number, tricks) => {
      if (tricks === "NT") return "";
      const bids = state.roundBids[number];
      if (
        !Array.isArray(bids) ||
        bids.length !== state.players.length ||
        bids.some((bid) => typeof bid !== "number")
      )
        return "";
      return bids.reduce((total, bid) => total + bid, 0) - tricks;
    },
    suitForRound: (state) => (number) =>
      state.suits.find((suit) => suit.name === state.roundSuits[number]),
    isRoundTotalLeader(state) {
      return (number, playerIndex) => {
        const scores = state.players.map((_, index) =>
          this.cumulativeScoreForRound(number, index),
        );
        return (
          !scores.some((score) => typeof score !== "number") &&
          scores[playerIndex] === Math.max(...scores)
        );
      };
    },
    isTricksLeader(state) {
      return (number, playerIndex) => {
        const tricks = state.players.map((_, index) =>
          this.roundValue(number, index, "tricks"),
        );
        return (
          !tricks.some((tricksWon) => typeof tricksWon !== "number") &&
          tricks[playerIndex] === Math.max(...tricks)
        );
      };
    },
    tricksStatus: (state) => (number, tricks) => {
      const values = state.roundTricks[number];
      if (
        !values ||
        values.length !== state.players.length ||
        values.some((value) => value === null || value === undefined)
      )
        return null;
      return (
        values.reduce((sum, value) => sum + value, 0) ===
        (tricks === "NT" ? 7 : tricks)
      );
    },
    canStartBidding(state) {
      return (number) =>
        number === 1 ||
        this.tricksStatus(number - 1, state.trickSchedule[number - 2]) === true;
    },
    canStartTricksEntry(state) {
      return (number) => {
        const hasAllBids =
          state.trickSchedule[number - 1] === "NT" ||
          (Array.isArray(state.roundBids[number]) &&
            state.roundBids[number].length === state.players.length &&
            state.roundBids[number].every((bid) => typeof bid === "number"));
        return (
          hasAllBids &&
          (number === 1 ||
            this.tricksStatus(number - 1, state.trickSchedule[number - 2]) ===
              true)
        );
      };
    },
  },

  actions: {
    initialize() {
      this.restoreGameState();
      this.$subscribe(
        (_mutation, state) => {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              players: state.players,
              rounds: state.rounds,
              roundNumber: state.roundNumber,
              dealer: state.dealer,
              roundBids: state.roundBids,
              roundSuits: state.roundSuits,
              roundTricks: state.roundTricks,
            }),
          );
        },
        { detached: true },
      );
    },
    restoreGameState() {
      const savedState = localStorage.getItem(storageKey);
      if (!savedState) return;
      try {
        const state = JSON.parse(savedState);
        if (
          !Array.isArray(state.players) ||
          state.players.length < 2 ||
          state.players.length > 7
        )
          return;
        this.players = state.players;
        this.rounds = Array.isArray(state.rounds) ? state.rounds : [];
        this.roundNumber = Number.isInteger(state.roundNumber)
          ? state.roundNumber
          : 1;
        this.dealer = typeof state.dealer === "string" ? state.dealer : "";
        this.roundBids =
          state.roundBids && typeof state.roundBids === "object"
            ? state.roundBids
            : {};
        this.roundSuits =
          state.roundSuits && typeof state.roundSuits === "object"
            ? state.roundSuits
            : {};
        this.roundTricks =
          state.roundTricks && typeof state.roundTricks === "object"
            ? state.roundTricks
            : {};
      } catch {
        localStorage.removeItem(storageKey);
      }
    },
    savePlayers(names) {
      this.players = names;
    },
    saveBids(number, bids, suit) {
      this.roundBids[number] = bids;
      this.roundSuits[number] = suit;
    },
    saveTricks(number, tricks) {
      this.roundTricks[number] = tricks;
    },
    startNewGame(selectedDealer) {
      this.dealer = selectedDealer;
      this.rounds = [];
      this.roundBids = {};
      this.roundSuits = {};
      this.roundTricks = {};
      this.roundNumber = 1;
    },
  },
});
