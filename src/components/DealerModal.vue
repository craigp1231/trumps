<script setup>
import { useGameStore } from "../stores/game";

const game = useGameStore();
defineProps({
  open: { type: Boolean, required: true },
  selectedDealer: { type: String, default: "" },
});
defineEmits(["close", "choose"]);
</script>

<template>
  <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
    <section
      class="player-modal dealer-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dealer-dialog-title"
    >
      <button
        class="close-button"
        type="button"
        aria-label="Close new game dialog"
        @click="$emit('close')"
      >
        &#10005;
      </button>
      <p class="eyebrow">New game</p>
      <h2 id="dealer-dialog-title">Choose the dealer</h2>
      <p v-if="game.players.length < 2" class="modal-copy">
        Add at least two players before starting a game.
      </p>
      <div v-else class="dealer-choices">
        <span>Dealer</span>
        <div class="dealer-choice-list">
          <button
            v-for="player in game.players"
            :key="player"
            class="dealer-choice"
            :class="{ selected: selectedDealer === player }"
            type="button"
            :aria-pressed="selectedDealer === player"
            @click="$emit('choose', player)"
          >
            {{ player }}
          </button>
        </div>
      </div>
      <div class="modal-actions">
        <button class="cancel-button" type="button" @click="$emit('close')">
          Cancel
        </button>
      </div>
    </section>
  </div>
</template>
