<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useGameStore } from "./stores/game";
import GameHeader from "./components/GameHeader.vue";
import TrickSchedule from "./components/TrickSchedule.vue";
import GameHistory from "./components/GameHistory.vue";
import PlayerEditorModal from "./components/PlayerEditorModal.vue";
import DealerModal from "./components/DealerModal.vue";
import BiddingModal from "./components/BiddingModal.vue";
import TricksModal from "./components/TricksModal.vue";

const game = useGameStore();
const {
  players,
  rounds,
  dealer,
  roundBids,
  roundTricks,
  trickSchedule,
  dealerForRound,
} = storeToRefs(game);

const isPlayerEditorOpen = ref(false);
const selectedDealer = ref("");
const isDealerDialogOpen = ref(false);
const biddingRound = ref(null);
const biddingPlayers = ref([]);
const tricksRound = ref(null);
const tricksPlayers = ref([]);

onMounted(() => game.initialize());

function openPlayerEditor() {
  isPlayerEditorOpen.value = true;
}

function closePlayerEditor() {
  isPlayerEditorOpen.value = false;
}

function openNewGameDialog() {
  selectedDealer.value = dealer.value || players.value[0] || "";
  isDealerDialogOpen.value = true;
}

function closeNewGameDialog() {
  isDealerDialogOpen.value = false;
}

function chooseDealer(player) {
  selectedDealer.value = player;
  game.startNewGame(player);
  closeNewGameDialog();
}

function startBidding(number, tricks) {
  if (players.value.length < 2 || !dealer.value) return;
  const dealerIndex = players.value.indexOf(dealerForRound.value(number));
  const order = players.value
    .slice(dealerIndex + 1)
    .concat(players.value.slice(0, dealerIndex + 1));
  biddingRound.value = {
    number,
    tricks,
    trickLimit: tricks === "NT" ? 0 : tricks,
    suit: game.roundSuits[number] ?? null,
  };
  biddingPlayers.value = order.map((name) => {
    const playerIndex = players.value.indexOf(name);
    return {
      name,
      playerIndex,
      bid:
        tricks === "NT" ? 0 : (roundBids.value[number]?.[playerIndex] ?? null),
    };
  });
}

function closeBidding() {
  biddingRound.value = null;
}

function dealerBidIsForbidden(bid) {
  if (!biddingRound.value || biddingPlayers.value.length === 0) return false;
  const totalBeforeDealer = biddingPlayers.value
    .slice(0, -1)
    .reduce((total, player) => total + (player.bid ?? 0), 0);
  return totalBeforeDealer + bid === biddingRound.value.trickLimit;
}

function chooseBid(player, bid) {
  if (player === biddingPlayers.value.at(-1) && dealerBidIsForbidden(bid))
    return;
  player.bid = bid;
}

function chooseSuit(suit) {
  if (biddingRound.value) biddingRound.value.suit = suit;
}

function startTricksEntry(number, tricks) {
  if (
    players.value.length < 2 ||
    (!roundBids.value[number] && trickSchedule.value[number - 1] !== "NT")
  )
    return;
  if (trickSchedule.value[number - 1] === "NT")
    game.saveBids(
      number,
      players.value.map(() => 0),
      game.roundSuits[number],
    );
  tricksRound.value = {
    number,
    tricks,
    trickLimit: tricks === "NT" ? 7 : tricks,
  };
  tricksPlayers.value = players.value.map((name, playerIndex) => ({
    name,
    playerIndex,
    tricks: roundTricks.value[number]?.[playerIndex] ?? 0,
  }));
}

function closeTricksEntry() {
  tricksRound.value = null;
}
</script>

<template>
  <main class="app-shell">
    <GameHeader
      @edit-players="openPlayerEditor"
      @new-game="openNewGameDialog"
    />
    <TrickSchedule
      @start-bidding="startBidding"
      @start-tricks="startTricksEntry"
    />
    <GameHistory />
    <PlayerEditorModal :open="isPlayerEditorOpen" @close="closePlayerEditor" />
    <DealerModal
      :open="isDealerDialogOpen"
      :selected-dealer="selectedDealer"
      @close="closeNewGameDialog"
      @choose="chooseDealer"
    />
    <BiddingModal
      :round="biddingRound && { ...biddingRound, players: biddingPlayers }"
      :dealer-bid-is-forbidden="dealerBidIsForbidden"
      @close="closeBidding"
      @choose-bid="chooseBid"
      @choose-suit="chooseSuit"
    />
    <TricksModal
      :round="tricksRound && { ...tricksRound, players: tricksPlayers }"
      @close="closeTricksEntry"
      @choose-tricks="(player, tricks) => (player.tricks = tricks)"
    />
  </main>
</template>
