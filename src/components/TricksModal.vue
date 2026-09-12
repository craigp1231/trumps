<script setup>
import { useGameStore } from "../stores/game";

const props = defineProps({ round: { type: Object, default: null } });
const game = useGameStore();
const emit = defineEmits(["close", "choose-tricks"]);

function saveTricks() {
  if (props.round.players.some((player) => player.tricks === null)) return;
  const tricks = props.round.players.reduce((values, player) => {
    values[player.playerIndex] = player.tricks;
    return values;
  }, []);
  game.saveTricks(props.round.number, tricks);
  emit("close");
}
</script>

<template>
  <div v-if="round" class="modal-backdrop" @click.self="$emit('close')">
    <section
      class="player-modal bidding-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tricks-dialog-title"
    >
      <button
        class="close-button"
        type="button"
        aria-label="Close tricks dialog"
        @click="$emit('close')"
      >
        &#10005;
      </button>
      <p class="eyebrow">
        Round {{ round.number }} &middot; {{ round.tricks }} tricks
      </p>
      <h2 id="tricks-dialog-title">Enter tricks won</h2>
      <p class="modal-copy">Choose how many tricks each player actually won.</p>
      <div class="bid-fields">
        <div
          v-for="player in round.players"
          :key="player.name"
          class="bid-player"
        >
          <span class="bid-player-name tricks-player-name"
            >{{ player.name
            }}<small
              >Bid
              {{ game.bidForRound(round.number, player.playerIndex) }}</small
            ></span
          >
          <div class="bid-options">
            <button
              v-for="tricksWon in game.tricksOptions(round.tricks)"
              :key="tricksWon"
              type="button"
              class="bid-option"
              :class="{ selected: player.tricks === tricksWon }"
              @click="$emit('choose-tricks', player, tricksWon)"
            >
              {{ tricksWon }}
            </button>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="cancel-button" type="button" @click="$emit('close')">
          Cancel
        </button>
        <button class="add-button" type="button" @click="saveTricks">
          Save tricks
        </button>
      </div>
    </section>
  </div>
</template>
