<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import lawIcon from './assets/law.png'
import pokerCardsIcon from './assets/poker-cards.png'

const storageKey = 'nomination-whist-game'

const players = ref(['Craig', 'Gary', 'Kev'])
const rounds = ref([])
const roundNumber = ref(1)
const draft = ref(createDraft(players.value))
const isPlayerEditorOpen = ref(false)
const editedPlayers = ref([])
const playerError = ref('')
const playerInputs = ref([])
const dealer = ref('')
const selectedDealer = ref('')
const isDealerDialogOpen = ref(false)
const roundBids = ref({})
const biddingRound = ref(null)
const biddingPlayers = ref([])
const biddingError = ref('')
const roundSuits = ref({})
const roundTricks = ref({})
const tricksRound = ref(null)
const tricksPlayers = ref([])
const gridStyle = computed(() => ({ '--player-count': players.value.length }))
const trickSchedule = [7, 6, 5, 4, 3, 2, 1, 'NT', 1, 2, 3, 4, 5, 6, 7]
const suits = [
	{ name: 'Spades', icon: '♠' },
	{ name: 'Clubs', icon: '♣' },
	{ name: 'Diamonds', icon: '♦' },
	{ name: 'Hearts', icon: '♥' },
]

function saveGameState() {
	localStorage.setItem(storageKey, JSON.stringify({
		players: players.value,
		rounds: rounds.value,
		roundNumber: roundNumber.value,
		draft: draft.value,
		dealer: dealer.value,
		roundBids: roundBids.value,
		roundSuits: roundSuits.value,
		roundTricks: roundTricks.value,
	}))
}

function restoreGameState() {
	const savedState = localStorage.getItem(storageKey)
	if (!savedState) {
		return
	}

	try {
		const state = JSON.parse(savedState)
		if (!Array.isArray(state.players) || state.players.length < 2 || state.players.length > 7) {
			return
		}
		players.value = state.players
		rounds.value = Array.isArray(state.rounds) ? state.rounds : []
		roundNumber.value = Number.isInteger(state.roundNumber) ? state.roundNumber : 1
		draft.value = Array.isArray(state.draft) ? state.draft : createDraft(state.players)
		dealer.value = typeof state.dealer === 'string' ? state.dealer : ''
		roundBids.value = state.roundBids && typeof state.roundBids === 'object' ? state.roundBids : {}
		roundSuits.value = state.roundSuits && typeof state.roundSuits === 'object' ? state.roundSuits : {}
		roundTricks.value = state.roundTricks && typeof state.roundTricks === 'object' ? state.roundTricks : {}
	} catch {
		localStorage.removeItem(storageKey)
	}
}

function createDraft(names) {
	return names.map((name) => ({ name, bid: 0, tricks: 0 }))
}

function playerInitial(name) {
	return name.trim().charAt(0).toUpperCase()
}

function suitForRound(number) {
	return suits.find((suit) => suit.name === roundSuits.value[number])
}

function bidDifference(number, tricks) {
	if (tricks === 'NT') {
		return ''
	}
	const bids = roundBids.value[number]
	if (!Array.isArray(bids) || bids.length !== players.value.length || bids.some((bid) => typeof bid !== 'number')) {
		return ''
	}
	return bids.reduce((total, bid) => total + bid, 0) - tricks
}

const totals = computed(() => players.value.map((name, playerIndex) => ({
	name,
	score: trickSchedule.reduce((total, _, roundIndex) => {
		const score = scoreForRound(roundIndex + 1, playerIndex)
		return total + (typeof score === 'number' ? score : 0)
	}, 0),
})).sort((first, second) => second.score - first.score))

const leader = computed(() => [...totals.value].sort((first, second) => second.score - first.score)[0])

function scoreRound(player) {
	return player.tricks + (player.tricks === player.bid ? 10 : 0)
}

function scoreNoTricksRound(tricks, playerIndex) {
	if (tricks.includes(7)) {
		return tricks[playerIndex] === 7 ? 10 : 0
	}
	const tricksWon = tricks[playerIndex]
	return tricksWon + (tricksWon === 0 ? 10 : 0)
}

function dealerForRound(number) {
	const startingIndex = players.value.indexOf(dealer.value)
	if (startingIndex < 0) {
		return ''
	}
	return players.value[(startingIndex + number - 1) % players.value.length]
}

function scoreForRound(number, playerIndex) {
	const savedScore = rounds.value.find((round) => round.number === number)?.scores[playerIndex]
	if (savedScore !== undefined) {
		return savedScore
	}
	const roundType = trickSchedule[number - 1]
	const tricks = players.value.map((_, index) => roundValue(number, index, 'tricks'))
	if (roundType === 'NT') {
		return tricks.every((tricksWon) => typeof tricksWon === 'number') ? scoreNoTricksRound(tricks, playerIndex) : ''
	}
	const bid = bidForRound(number, playerIndex)
	return typeof bid === 'number' && typeof tricks[playerIndex] === 'number' ? scoreRound({ bid, tricks: tricks[playerIndex] }) : ''
}

function cumulativeScoreForRound(number, playerIndex) {
	const roundHasStarted = rounds.value.some((round) => round.number === number) || roundTricks.value[number]
	if (!roundHasStarted) {
		return ''
	}

	let cumulativeScore = 0
	let hasScore = false
	for (let round = 1; round <= number; round += 1) {
		const score = scoreForRound(round, playerIndex)
		if (typeof score === 'number') {
			cumulativeScore += score
			hasScore = true
		}
	}
	return hasScore ? cumulativeScore : ''
}

function isRoundTotalLeader(number, playerIndex) {
	const totals = players.value.map((_, index) => cumulativeScoreForRound(number, index))
	if (totals.some((total) => typeof total !== 'number')) {
		return false
	}
	return totals[playerIndex] === Math.max(...totals)
}

function isTricksLeader(number, playerIndex) {
	const tricks = players.value.map((_, index) => roundValue(number, index, 'tricks'))
	if (tricks.some((tricksWon) => typeof tricksWon !== 'number')) {
		return false
	}
	return tricks[playerIndex] === Math.max(...tricks)
}

function roundValue(number, playerIndex, property) {
	if (property === 'tricks' && roundTricks.value[number]) {
		return roundTricks.value[number][playerIndex] ?? ''
	}
	return rounds.value.find((round) => round.number === number)?.[property]?.[playerIndex] ?? ''
}

function bidForRound(number, playerIndex) {
	if (trickSchedule[number - 1] === 'NT') {
		return 0
	}
	return rounds.value.find((round) => round.number === number)?.bids[playerIndex] ?? roundBids.value[number]?.[playerIndex] ?? ''
}

function startBidding(number, tricks) {
	if (players.value.length < 2 || !dealer.value) {
		return
	}
	const dealerIndex = players.value.indexOf(dealerForRound(number))
	const order = players.value.slice(dealerIndex + 1).concat(players.value.slice(0, dealerIndex + 1))
	biddingRound.value = { number, tricks, trickLimit: tricks === 'NT' ? 0 : tricks }
	biddingRound.value.suit = roundSuits.value[number] ?? null
	biddingPlayers.value = order.map((name) => ({ name, playerIndex: players.value.indexOf(name), bid: roundBids.value[number]?.[players.value.indexOf(name)] ?? null }))
	biddingError.value = ''
}

function canStartBidding(number) {
	return trickSchedule[number - 1] !== 'NT' && (number === 1 || tricksStatus(number - 1, trickSchedule[number - 2]) === true)
}

function hasAllBids(number) {
	if (trickSchedule[number - 1] === 'NT') {
		return true
	}
	const bids = roundBids.value[number]
	return Array.isArray(bids) && bids.length === players.value.length && bids.every((bid) => typeof bid === 'number')
}

function canStartTricksEntry(number) {
	return hasAllBids(number) && (number === 1 || tricksStatus(number - 1, trickSchedule[number - 2]) === true)
}

function closeBidding() {
	biddingRound.value = null
}

function dealerBidIsForbidden(bid) {
	if (!biddingRound.value || biddingPlayers.value.length === 0) {
		return false
	}
	const totalBeforeDealer = biddingPlayers.value.slice(0, -1).reduce((total, player) => total + (player.bid ?? 0), 0)
	return totalBeforeDealer + bid === biddingRound.value.trickLimit
}

function chooseBid(player, bid) {
	const isDealer = player === biddingPlayers.value.at(-1)
	if (isDealer && dealerBidIsForbidden(bid)) {
		return
	}
	player.bid = bid
}

function chooseSuit(suit) {
	if (biddingRound.value) {
		biddingRound.value.suit = suit
	}
}

function bidOptions(tricks) {
	return Array.from({ length: (tricks === 'NT' ? 0 : tricks) + 1 }, (_, index) => index)
}

function saveBids() {
	const total = biddingPlayers.value.reduce((sum, player) => sum + (player.bid ?? 0), 0)
	if (!biddingRound.value.suit) {
		biddingError.value = 'Choose a suit for the round.'
		return
	}
	if (biddingPlayers.value.some((player) => player.bid === null)) {
		biddingError.value = 'Choose a bid for every player.'
		return
	}
	if (total === biddingRound.value.trickLimit) {
		biddingError.value = `The total bid cannot equal ${biddingRound.value.trickLimit} tricks.`
		return
	}
	roundBids.value[biddingRound.value.number] = biddingPlayers.value.reduce((bids, player) => {
		bids[player.playerIndex] = player.bid
		return bids
	}, [])
	roundSuits.value[biddingRound.value.number] = biddingRound.value.suit
	closeBidding()
}

function startTricksEntry(number, tricks) {
	if (players.value.length < 2 || (!roundBids.value[number] && trickSchedule[number - 1] !== 'NT')) {
		return
	}
	if (trickSchedule[number - 1] === 'NT') {
		roundBids.value[number] = players.value.map(() => 0)
	}
	tricksRound.value = { number, tricks, trickLimit: tricks === 'NT' ? 7 : tricks }
	tricksPlayers.value = players.value.map((name, playerIndex) => ({
		name,
		playerIndex,
		tricks: roundTricks.value[number]?.[playerIndex] ?? 0,
	}))
}

function closeTricksEntry() {
	tricksRound.value = null
}

function tricksOptions(tricks) {
	return Array.from({ length: (tricks === 'NT' ? 7 : tricks) + 1 }, (_, index) => index)
}

function tricksStatus(number, tricks) {
	const values = roundTricks.value[number]
	if (!values || values.length !== players.value.length || values.some((value) => value === null || value === undefined)) {
		return null
	}
	const total = values.reduce((sum, value) => sum + value, 0)
	return total === (tricks === 'NT' ? 7 : tricks)
}

function saveTricks() {
	if (tricksPlayers.value.some((player) => player.tricks === null)) {
		return
	}
	roundTricks.value[tricksRound.value.number] = tricksPlayers.value.reduce((values, player) => {
		values[player.playerIndex] = player.tricks
		return values
	}, [])
	closeTricksEntry()
}

function addRound() {
	if (players.value.length < 2) {
		return
	}
	rounds.value.push({
		number: roundNumber.value,
		dealer: dealerForRound(roundNumber.value),
		bids: draft.value.map((player) => player.bid),
		tricks: draft.value.map((player) => player.tricks),
		scores: draft.value.map((player, playerIndex) => trickSchedule[roundNumber.value - 1] === 'NT'
			? scoreNoTricksRound(draft.value.map((entry) => entry.tricks), playerIndex)
			: scoreRound(player)),
	})
	roundNumber.value += 1
	draft.value = createDraft(players.value)
}

function openPlayerEditor() {
	editedPlayers.value = [...players.value]
	playerError.value = ''
	isPlayerEditorOpen.value = true
}

function closePlayerEditor() {
	isPlayerEditorOpen.value = false
}

async function addPlayer() {
	if (editedPlayers.value.length < 7) {
		editedPlayers.value.push(``)
		playerError.value = ''
		await nextTick()
		playerInputs.value.at(-1)?.focus()
	}
}

function removePlayer(index) {
	if (editedPlayers.value.length > 2) {
		editedPlayers.value.splice(index, 1)
		playerError.value = ''
	}
}

function savePlayers() {
	const names = editedPlayers.value.map((name) => name.trim())
	const hasDuplicate = new Set(names.map((name) => name.toLowerCase())).size !== names.length

	if (names.length < 2) {
		playerError.value = 'Add at least two players.'
		return
	}
	if (names.some((name) => !name)) {
		playerError.value = 'Every player needs a name.'
		return
	}
	if (hasDuplicate) {
		playerError.value = 'Player names must be unique.'
		return
	}
	if (rounds.value.length && names.length !== players.value.length) {
		playerError.value = 'Start a new game before changing the number of players.'
		return
	}

	players.value = names
	draft.value = names.map((name, index) => ({
		...(draft.value[index] || { bid: 0, tricks: 0 }),
		name,
	}))
	closePlayerEditor()
}

function openNewGameDialog() {
	selectedDealer.value = dealer.value || players.value[0] || ''
	isDealerDialogOpen.value = true
}

function closeNewGameDialog() {
	isDealerDialogOpen.value = false
}

function chooseDealer(player) {
	selectedDealer.value = player
	startNewGame()
}

function startNewGame() {
	if (!selectedDealer.value) {
		return
	}
	dealer.value = selectedDealer.value
	rounds.value = []
	roundBids.value = {}
	roundSuits.value = {}
	roundTricks.value = {}
	roundNumber.value = 1
	draft.value = createDraft(players.value)
	closeNewGameDialog()
}

onMounted(restoreGameState)
watch([players, rounds, roundNumber, draft, dealer, roundBids, roundSuits, roundTricks], saveGameState, { deep: true })
</script>

<template>
	<main class="app-shell">
		<header class="topbar">
			<div class="totals-grid" :style="gridStyle"><article v-for="player in totals" :key="player.name" class="total-card"><span class="player-name">{{ player.name }}</span><strong>{{ player.score }}</strong></article></div>
			<div class="topbar-actions">
				<button class="edit-button" type="button" @click="openPlayerEditor">Edit players</button>
				<button class="reset-button" type="button" @click="openNewGameDialog">New game</button>
			</div>
		</header>

		<section class="trick-schedule" aria-labelledby="trick-schedule-title">
			<div class="schedule-table">
				<div class="schedule-header" :style="gridStyle"><span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span><span v-for="player in players" :key="player" class="player-column-header" :title="player">{{ playerInitial(player) }}</span></div>
				<div v-for="(tricks, index) in trickSchedule" :key="index" class="schedule-row" :style="gridStyle" :class="{ 'status-good': tricksStatus(index + 1, tricks) === true, 'status-bad': tricksStatus(index + 1, tricks) === false }">
					<span class="round-label"><span class="tricks-count">{{ tricks }}</span></span><span class="round-dealer" :title="dealerForRound(index + 1)">{{ playerInitial(dealerForRound(index + 1)) }}</span><span class="bid-difference" :class="{ 'difference-positive': bidDifference(index + 1, tricks) > 0, 'difference-negative': bidDifference(index + 1, tricks) < 0 }" :aria-label="`Bid difference ${bidDifference(index + 1, tricks)}`">{{ bidDifference(index + 1, tricks) > 0 ? '+' : '' }}{{ bidDifference(index + 1, tricks) }}</span><span v-if="suitForRound(index + 1)" class="round-suit" :class="{ 'black-suit': suitForRound(index + 1).name === 'Spades' || suitForRound(index + 1).name === 'Clubs', 'red-suit': suitForRound(index + 1).name === 'Diamonds' || suitForRound(index + 1).name === 'Hearts' }" :title="suitForRound(index + 1).name" :aria-label="suitForRound(index + 1).name">{{ suitForRound(index + 1).icon }}</span><span v-else aria-hidden="true"></span><button v-if="canStartBidding(index + 1)" class="bid-start-button" type="button" :title="roundBids[index + 1] ? 'Edit bids' : 'Start bidding'" :aria-label="roundBids[index + 1] ? 'Edit bids' : 'Start bidding'" :disabled="!dealer || players.length < 2" @click="startBidding(index + 1, tricks)"><img :src="lawIcon" alt=""></button><span v-else aria-hidden="true"></span><button v-if="canStartTricksEntry(index + 1)" class="tricks-start-button" type="button" :title="roundTricks[index + 1] ? 'Edit tricks' : 'Enter tricks'" :aria-label="roundTricks[index + 1] ? 'Edit tricks' : 'Enter tricks'" @click="startTricksEntry(index + 1, tricks)"><img :src="pokerCardsIcon" alt=""></button><span v-else aria-hidden="true"></span><div v-for="(player, playerIndex) in players" :key="player" class="round-player-cell" :class="{ 'round-total-leader': isRoundTotalLeader(index + 1, playerIndex) }" :title="player" :aria-label="`${player}: bid ${bidForRound(index + 1, playerIndex)}, tricks ${roundValue(index + 1, playerIndex, 'tricks')}, cumulative score ${cumulativeScoreForRound(index + 1, playerIndex) ?? ''}`"><span class="cell-bid">{{ bidForRound(index + 1, playerIndex) }}</span><span class="cell-tricks" :class="{ 'tricks-leader': isTricksLeader(index + 1, playerIndex) }">{{ roundValue(index + 1, playerIndex, 'tricks') }}</span><strong>{{ cumulativeScoreForRound(index + 1, playerIndex) ?? '' }}</strong></div>
				</div>
			</div>
		</section>

		<section v-if="rounds.length" class="history" aria-labelledby="history-title"><div class="section-heading"><div><p class="eyebrow">Game log</p><h2 id="history-title">Round history</h2></div></div><div class="history-table"><div class="history-header" :style="gridStyle"><span>Round</span><span>Dealer</span><span v-for="player in players" :key="player" class="player-column-header" :title="player">{{ playerInitial(player) }}</span></div><div v-for="round in [...rounds].reverse()" :key="round.number" class="history-row" :style="gridStyle"><strong>{{ round.number }}</strong><span class="round-dealer" :title="round.dealer">{{ playerInitial(round.dealer) }}</span><span v-for="(score, index) in round.scores" :key="index" :title="players[index]" :aria-label="`${players[index]}'s score`">{{ score > 0 ? '+' : '' }}{{ score }} <small>({{ round.bids[index] }}/{{ round.tricks[index] }})</small></span></div></div></section>

		<div v-if="isPlayerEditorOpen" class="modal-backdrop" @click.self="closePlayerEditor">
			<section class="player-modal" role="dialog" aria-modal="true" aria-labelledby="player-dialog-title">
				<button class="close-button" type="button" aria-label="Close player editor" @click="closePlayerEditor">&#10005;</button>
				<p class="eyebrow">Game setup</p><h2 id="player-dialog-title">Edit players</h2><p class="modal-copy">Update the names at your table. Existing scores stay with their player position.</p>
				<div class="player-fields"><label v-for="(name, index) in editedPlayers" :key="index">Player {{ index + 1 }}<span class="player-input-row"><input ref="playerInputs" v-model="editedPlayers[index]" type="text" maxlength="24"><button class="remove-player" type="button" :disabled="editedPlayers.length <= 2" :aria-label="`Remove player ${index + 1}`" @click="removePlayer(index)">&#10005;</button></span></label></div>
				<button v-if="editedPlayers.length < 7" class="add-player" type="button" @click="addPlayer">+ Add player</button>
				<p v-if="playerError" class="player-error" role="alert">{{ playerError }}</p>
				<div class="modal-actions"><button class="cancel-button" type="button" @click="closePlayerEditor">Cancel</button><button class="add-button" type="button" @click="savePlayers">Save players</button></div>
			</section>
		</div>

		<div v-if="isDealerDialogOpen" class="modal-backdrop" @click.self="closeNewGameDialog">
			<section class="player-modal dealer-modal" role="dialog" aria-modal="true" aria-labelledby="dealer-dialog-title">
				<button class="close-button" type="button" aria-label="Close new game dialog" @click="closeNewGameDialog">&#10005;</button>
				<p class="eyebrow">New game</p><h2 id="dealer-dialog-title">Choose the dealer</h2>
				<p v-if="players.length < 2" class="modal-copy">Add at least two players before starting a game.</p>
				<div v-else class="dealer-choices"><span>Dealer</span><div class="dealer-choice-list"><button v-for="player in players" :key="player" class="dealer-choice" :class="{ selected: selectedDealer === player }" type="button" :aria-pressed="selectedDealer === player" @click="chooseDealer(player)">{{ player }}</button></div></div>
				<div class="modal-actions"><button class="cancel-button" type="button" @click="closeNewGameDialog">Cancel</button></div>
			</section>
		</div>

		<div v-if="biddingRound" class="modal-backdrop" @click.self="closeBidding">
			<section class="player-modal bidding-modal" role="dialog" aria-modal="true" aria-labelledby="bidding-dialog-title">
				<button class="close-button" type="button" aria-label="Close bidding dialog" @click="closeBidding">&#10005;</button>
				<p class="eyebrow">Round {{ biddingRound.number }} &middot; {{ biddingRound.tricks }} tricks</p><h2 id="bidding-dialog-title">Place bids</h2>
				<p class="modal-copy">Bidding starts after the dealer and ends with the dealer. Total bids must not equal {{ biddingRound.trickLimit }}.</p>
				<div class="suit-choices"><span>Trump suit</span><div class="suit-choice-list"><button v-for="suit in suits" :key="suit.name" class="suit-choice" :class="{ selected: biddingRound.suit === suit.name, 'black-suit': suit.name === 'Spades' || suit.name === 'Clubs', 'red-suit': suit.name === 'Diamonds' || suit.name === 'Hearts' }" type="button" :aria-label="suit.name" :title="suit.name" :aria-pressed="biddingRound.suit === suit.name" @click="chooseSuit(suit.name)">{{ suit.icon }}</button></div></div>
				<div class="bid-fields"><div v-for="(player, index) in biddingPlayers" :key="player.name" class="bid-player"><span class="bid-player-name">{{ index + 1 }}. {{ player.name }}<small v-if="index === biddingPlayers.length - 1">Dealer, bids last</small></span><div class="bid-options"><button v-for="bid in bidOptions(biddingRound.tricks)" :key="bid" type="button" class="bid-option" :class="{ selected: player.bid === bid }" :disabled="index === biddingPlayers.length - 1 && dealerBidIsForbidden(bid)" @click="chooseBid(player, bid)">{{ bid }}</button></div></div></div>
				<p v-if="biddingError" class="player-error" role="alert">{{ biddingError }}</p>
				<div class="modal-actions"><button class="cancel-button" type="button" @click="closeBidding">Cancel</button><button class="add-button" type="button" @click="saveBids">Save bids</button></div>
			</section>
		</div>

		<div v-if="tricksRound" class="modal-backdrop" @click.self="closeTricksEntry">
			<section class="player-modal bidding-modal" role="dialog" aria-modal="true" aria-labelledby="tricks-dialog-title">
				<button class="close-button" type="button" aria-label="Close tricks dialog" @click="closeTricksEntry">&#10005;</button>
				<p class="eyebrow">Round {{ tricksRound.number }} &middot; {{ tricksRound.tricks }} tricks</p><h2 id="tricks-dialog-title">Enter tricks won</h2>
				<p class="modal-copy">Choose how many tricks each player actually won.</p>
				<div class="bid-fields"><div v-for="player in tricksPlayers" :key="player.name" class="bid-player"><span class="bid-player-name tricks-player-name">{{ player.name }}<small>Bid {{ bidForRound(tricksRound.number, player.playerIndex) }}</small></span><div class="bid-options"><button v-for="tricksWon in tricksOptions(tricksRound.tricks)" :key="tricksWon" type="button" class="bid-option" :class="{ selected: player.tricks === tricksWon }" @click="player.tricks = tricksWon">{{ tricksWon }}</button></div></div></div>
				<div class="modal-actions"><button class="cancel-button" type="button" @click="closeTricksEntry">Cancel</button><button class="add-button" type="button" @click="saveTricks">Save tricks</button></div>
			</section>
		</div>
	</main>
</template>
