<script setup>
import { computed } from "vue";
import { useGameStore } from "../stores/game";
import lawIcon from "../assets/law.png";
import pokerCardsIcon from "../assets/poker-cards.png";

const game = useGameStore();
const gridStyle = computed(() => ({ "--player-count": game.players.length }));

defineEmits(["start-bidding", "start-tricks"]);
</script>

<template>
  <section class="trick-schedule" aria-labelledby="trick-schedule-title">
    <div class="schedule-table">
      <div class="schedule-header" :style="gridStyle">
        <span v-for="index in 6" :key="index" aria-hidden="true"></span>
        <span
          v-for="player in game.players"
          :key="player"
          class="player-column-header"
          :title="player"
          >{{ game.playerInitial(player) }}</span
        >
      </div>
      <div
        v-for="(tricks, index) in game.trickSchedule"
        :key="index"
        class="schedule-row"
        :style="gridStyle"
        :class="{
          'status-good': game.tricksStatus(index + 1, tricks) === true,
          'status-bad': game.tricksStatus(index + 1, tricks) === false,
        }"
      >
        <span class="round-label"
          ><span class="tricks-count">{{ tricks }}</span></span
        >
        <span class="round-dealer" :title="game.dealerForRound(index + 1)">{{
          game.playerInitial(game.dealerForRound(index + 1))
        }}</span>
        <span
          class="bid-difference"
          :class="{
            'difference-positive': game.bidDifference(index + 1, tricks) > 0,
            'difference-negative': game.bidDifference(index + 1, tricks) < 0,
          }"
          :aria-label="`Bid difference ${game.bidDifference(index + 1, tricks)}`"
          >{{ game.bidDifference(index + 1, tricks) > 0 ? "+" : ""
          }}{{ game.bidDifference(index + 1, tricks) }}</span
        >
        <span
          v-if="game.suitForRound(index + 1)"
          class="round-suit"
          :class="{
            'black-suit': ['Spades', 'Clubs'].includes(
              game.suitForRound(index + 1).name,
            ),
            'red-suit': ['Diamonds', 'Hearts'].includes(
              game.suitForRound(index + 1).name,
            ),
          }"
          :title="game.suitForRound(index + 1).name"
          :aria-label="game.suitForRound(index + 1).name"
          >{{ game.suitForRound(index + 1).icon }}</span
        ><span v-else aria-hidden="true"></span>
        <button
          v-if="game.canStartBidding(index + 1)"
          class="bid-start-button"
          type="button"
          :title="game.roundBids[index + 1] ? 'Edit bids' : 'Start bidding'"
          :aria-label="
            game.roundBids[index + 1] ? 'Edit bids' : 'Start bidding'
          "
          :disabled="!game.dealer || game.players.length < 2"
          @click="$emit('start-bidding', index + 1, tricks)"
        >
          <img :src="lawIcon" alt="" /></button
        ><span v-else aria-hidden="true"></span>
        <button
          v-if="game.canStartTricksEntry(index + 1)"
          class="tricks-start-button"
          type="button"
          :title="game.roundTricks[index + 1] ? 'Edit tricks' : 'Enter tricks'"
          :aria-label="
            game.roundTricks[index + 1] ? 'Edit tricks' : 'Enter tricks'
          "
          @click="$emit('start-tricks', index + 1, tricks)"
        >
          <img :src="pokerCardsIcon" alt="" /></button
        ><span v-else aria-hidden="true"></span>
        <div
          v-for="(player, playerIndex) in game.players"
          :key="player"
          class="round-player-cell"
          :class="{
            'round-total-leader': game.isRoundTotalLeader(
              index + 1,
              playerIndex,
            ),
          }"
          :title="player"
          :aria-label="`${player}: bid ${game.bidForRound(index + 1, playerIndex)}, tricks ${game.roundValue(index + 1, playerIndex, 'tricks')}, cumulative score ${game.cumulativeScoreForRound(index + 1, playerIndex) ?? ''}`"
        >
          <span class="cell-bid">{{
            game.bidForRound(index + 1, playerIndex)
          }}</span>
          <span
            class="cell-tricks"
            :class="{
              'tricks-leader': game.isTricksLeader(index + 1, playerIndex),
            }"
            >{{ game.roundValue(index + 1, playerIndex, "tricks") }}</span
          >
          <strong>{{
            game.cumulativeScoreForRound(index + 1, playerIndex) ?? ""
          }}</strong>
        </div>
      </div>
    </div>
  </section>
</template>
