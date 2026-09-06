<script setup>
import { nextTick, ref, watch } from 'vue'
import { useGameStore } from '../stores/game'

const props = defineProps({
	open: { type: Boolean, required: true },
})
const game = useGameStore()
const emit = defineEmits(['close'])
const editedPlayers = ref([])
const playerInputs = ref([])
const error = ref('')

watch(() => props.open, (open) => {
	if (open) {
		editedPlayers.value = [...game.players]
		error.value = ''
	}
})

async function addPlayer() {
	if (editedPlayers.value.length < 7) {
		editedPlayers.value.push('')
		error.value = ''
		await nextTick()
		playerInputs.value.at(-1)?.focus()
	}
}

function removePlayer(index) {
	if (editedPlayers.value.length > 2) {
		editedPlayers.value.splice(index, 1)
		error.value = ''
	}
}

function savePlayers() {
	const names = editedPlayers.value.map((name) => name.trim())
	const hasDuplicate = new Set(names.map((name) => name.toLowerCase())).size !== names.length
	if (names.length < 2) {
		error.value = 'Add at least two players.'
		return
	}
	if (names.some((name) => !name)) {
		error.value = 'Every player needs a name.'
		return
	}
	if (hasDuplicate) {
		error.value = 'Player names must be unique.'
		return
	}
	if (game.rounds.length && names.length !== game.players.length) {
		error.value = 'Start a new game before changing the number of players.'
		return
	}
	game.savePlayers(names)
	emit('close')
}
</script>

<template>
	<div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
		<section class="player-modal" role="dialog" aria-modal="true" aria-labelledby="player-dialog-title">
			<button class="close-button" type="button" aria-label="Close player editor" @click="$emit('close')">&#10005;</button>
			<p class="eyebrow">Game setup</p><h2 id="player-dialog-title">Edit players</h2><p class="modal-copy">Update the names at your table. Existing scores stay with their player position.</p>
			<div class="player-fields"><label v-for="(name, index) in editedPlayers" :key="index">Player {{ index + 1 }}<span class="player-input-row"><input ref="playerInputs" v-model="editedPlayers[index]" type="text" maxlength="24"><button class="remove-player" type="button" :disabled="editedPlayers.length <= 2" :aria-label="`Remove player ${index + 1}`" @click="removePlayer(index)">&#10005;</button></span></label></div>
			<button v-if="editedPlayers.length < 7" class="add-player" type="button" @click="addPlayer">+ Add player</button>
			<p v-if="error" class="player-error" role="alert">{{ error }}</p>
			<div class="modal-actions"><button class="cancel-button" type="button" @click="$emit('close')">Cancel</button><button class="add-button" type="button" @click="savePlayers">Save players</button></div>
		</section>
	</div>
</template>
