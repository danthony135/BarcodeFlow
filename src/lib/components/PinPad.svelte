<script lang="ts">
	let {
		pinLength = 4,
		error = '',
		loading = false,
		onSubmit
	}: {
		pinLength?: number;
		error?: string;
		loading?: boolean;
		onSubmit: (pin: string) => void;
	} = $props();

	let pin = $state('');

	$effect(() => {
		if (error) {
			setTimeout(() => { pin = ''; }, 300);
		}
	});

	function handleKey(digit: string) {
		if (loading) return;
		if (pin.length >= pinLength) {
			pin = digit;
			return;
		}
		pin += digit;
		if (pin.length === pinLength) {
			onSubmit(pin);
		}
	}

	function handleClear() {
		pin = '';
	}

	function handleBackspace() {
		pin = pin.slice(0, -1);
	}

	const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
</script>

<div class="flex flex-col items-center gap-8 w-full max-w-xs mx-auto">
	<!-- PIN dots -->
	<div class="flex gap-3">
		{#each Array(pinLength) as _, i}
			<div
				class="w-4 h-4 rounded-full transition-all duration-150 {i < pin.length
					? 'bg-primary scale-110'
					: 'bg-gray-200 border-2 border-gray-300'}"
			></div>
		{/each}
	</div>

	<!-- Error message -->
	{#if error}
		<p class="text-danger text-sm font-medium -mt-4 text-center">{error}</p>
	{/if}

	<!-- Number grid -->
	<div class="grid grid-cols-3 gap-4">
		{#each keys as key}
			<button
				type="button"
				class="w-16 h-16 rounded-full bg-gray-100 text-xl font-semibold text-gray-800 flex items-center justify-center active:bg-primary active:text-white transition-colors select-none"
				onclick={() => handleKey(key)}
				disabled={loading}
			>
				{key}
			</button>
		{/each}

		<!-- Bottom row: clear / 0 / backspace -->
		<button
			type="button"
			class="w-16 h-16 rounded-full flex items-center justify-center text-sm font-medium text-gray-500 active:bg-gray-200 transition-colors select-none"
			onclick={handleClear}
			disabled={loading}
		>
			Clear
		</button>
		<button
			type="button"
			class="w-16 h-16 rounded-full bg-gray-100 text-xl font-semibold text-gray-800 flex items-center justify-center active:bg-primary active:text-white transition-colors select-none"
			onclick={() => handleKey('0')}
			disabled={loading}
		>
			0
		</button>
		<button
			type="button"
			class="w-16 h-16 rounded-full flex items-center justify-center text-gray-500 active:bg-gray-200 transition-colors select-none"
			onclick={handleBackspace}
			disabled={loading}
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l7-7h11a1 1 0 011 1v12a1 1 0 01-1 1H10l-7-7z" />
			</svg>
		</button>
	</div>

	<!-- Loading state -->
	{#if loading}
		<div class="flex items-center gap-2 text-gray-500 text-sm">
			<svg class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
			</svg>
			Verifying...
		</div>
	{/if}
</div>
