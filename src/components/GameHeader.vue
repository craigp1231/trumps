<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const game = useGameStore()
const gridStyle = computed(() => ({ '--player-count': game.players.length }))

defineEmits(['edit-players', 'new-game'])
</script>

<template>
	<header class="topbar">
		<div class="totals-grid" :style="gridStyle">
			<article v-for="player in game.totals" :key="player.name" class="total-card">
				<span class="player-name">{{ player.name }}</span>
				<strong>{{ player.score }}</strong>
			</article>
		</div>
		<div class="topbar-actions">
			<button class="edit-button" type="button" @click="$emit('edit-players')">Edit players</button>
			<button class="reset-button" type="button" @click="$emit('new-game')">New game</button>
		</div>
	</header>
</template>
