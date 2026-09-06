<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const game = useGameStore()
const gridStyle = computed(() => ({ '--player-count': game.players.length }))
</script>

<template>
	<section v-if="game.rounds.length" class="history" aria-labelledby="history-title">
		<div class="section-heading"><div><p class="eyebrow">Game log</p><h2 id="history-title">Round history</h2></div></div>
		<div class="history-table">
			<div class="history-header" :style="gridStyle"><span>Round</span><span>Dealer</span><span v-for="player in game.players" :key="player" class="player-column-header" :title="player">{{ game.playerInitial(player) }}</span></div>
			<div v-for="round in [...game.rounds].reverse()" :key="round.number" class="history-row" :style="gridStyle"><strong>{{ round.number }}</strong><span class="round-dealer" :title="round.dealer">{{ game.playerInitial(round.dealer) }}</span><span v-for="(score, index) in round.scores" :key="index" :title="game.players[index]" :aria-label="`${game.players[index]}'s score`">{{ score > 0 ? '+' : '' }}{{ score }} <small>({{ round.bids[index] }}/{{ round.tricks[index] }})</small></span></div>
		</div>
	</section>
</template>
