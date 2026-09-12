<script setup>
import { ref, watch } from "vue";
import { useGameStore } from "../stores/game";

const game = useGameStore();
const props = defineProps({
  round: { type: Object, default: null },
  dealerBidIsForbidden: { type: Function, required: true },
});
const emit = defineEmits(["close", "choose-bid", "choose-suit"]);
const error = ref("");

watch(
  () => props.round,
  (round) => {
    if (round) error.value = "";
  },
);

function saveBids() {
  const total = props.round.players.reduce(
    (sum, player) => sum + (player.bid ?? 0),
    0,
  );
  const allowedTotal = props.round.tricks === "NT" ? 0 : props.round.trickLimit;
  if (!props.round.suit) {
    error.value = "Choose a suit for the round.";
    return;
  }
  if (props.round.players.some((player) => player.bid === null)) {
    error.value = "Choose a bid for every player.";
    return;
  }
  if (
    props.round.tricks === "NT" &&
    props.round.players.some((player) => player.bid !== 0)
  ) {
    error.value = "For the no tricks round, every player must bid 0.";
    return;
  }
  if (props.round.tricks !== "NT" && total === allowedTotal) {
    error.value = `The total bid cannot equal ${allowedTotal} tricks.`;
    return;
  }
  const bids = props.round.players.reduce((values, player) => {
    values[player.playerIndex] = player.bid;
    return values;
  }, []);
  game.saveBids(props.round.number, bids, props.round.suit);
  emit("close");
}
</script>

<template>
  <div v-if="round" class="modal-backdrop" @click.self="$emit('close')">
    <section
      class="player-modal bidding-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bidding-dialog-title"
    >
      <button
        class="close-button"
        type="button"
        aria-label="Close bidding dialog"
        @click="$emit('close')"
      >
        &#10005;
      </button>
      <p class="eyebrow">
        Round {{ round.number }} &middot; {{ round.tricks }} tricks
      </p>
      <h2 id="bidding-dialog-title">Place bids</h2>
      <p class="modal-copy">
        Bidding starts after the dealer and ends with the dealer. Total bids
        must not equal {{ round.trickLimit }}.
      </p>
      <div class="suit-choices">
        <span>Trump suit</span>
        <div class="suit-choice-list">
          <button
            v-for="suit in game.suits"
            :key="suit.name"
            class="suit-choice"
            :class="{
              selected: round.suit === suit.name,
              'black-suit': ['Spades', 'Clubs'].includes(suit.name),
              'red-suit': ['Diamonds', 'Hearts'].includes(suit.name),
            }"
            type="button"
            :aria-label="suit.name"
            :title="suit.name"
            :aria-pressed="round.suit === suit.name"
            @click="$emit('choose-suit', suit.name)"
          >
            {{ suit.icon }}
          </button>
        </div>
      </div>
      <div class="bid-fields">
        <div
          v-for="(player, index) in round.players"
          :key="player.name"
          class="bid-player"
        >
          <span class="bid-player-name"
            >{{ index + 1 }}. {{ player.name
            }}<small v-if="index === round.players.length - 1"
              >Dealer, bids last</small
            ></span
          >
          <div class="bid-options">
            <button
              v-for="bid in game.bidOptions(round.tricks)"
              :key="bid"
              type="button"
              class="bid-option"
              :class="{ selected: player.bid === bid }"
              :disabled="
                index === round.players.length - 1 && dealerBidIsForbidden(bid)
              "
              @click="$emit('choose-bid', player, bid)"
            >
              {{ bid }}
            </button>
          </div>
        </div>
      </div>
      <p v-if="error" class="player-error" role="alert">{{ error }}</p>
      <div class="modal-actions">
        <button class="cancel-button" type="button" @click="$emit('close')">
          Cancel</button
        ><button class="add-button" type="button" @click="saveBids">
          Save bids
        </button>
      </div>
    </section>
  </div>
</template>
