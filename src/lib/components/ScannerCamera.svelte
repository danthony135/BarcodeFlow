<script lang="ts">
	let {
		onScan
	}: {
		onScan: (barcode: string) => void;
	} = $props();

	let inputEl: HTMLInputElement | undefined = $state();
	let value = $state('');
	let scanTimeout: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		// Auto-focus on mount
		inputEl?.focus();
	});

	function handleInput() {
		// Clear any existing timeout
		if (scanTimeout) clearTimeout(scanTimeout);

		// Scanner devices type rapidly - fire after 50ms of no input
		scanTimeout = setTimeout(() => {
			if (value.trim()) {
				onScan(value.trim());
				value = '';
			}
		}, 50);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (scanTimeout) clearTimeout(scanTimeout);
			if (value.trim()) {
				onScan(value.trim());
				value = '';
			}
		}
	}

	function refocus() {
		inputEl?.focus();
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="flex gap-2 items-center w-full" onclick={refocus}>
	<div class="relative flex-1">
		<input
			bind:this={inputEl}
			bind:value
			oninput={handleInput}
			onkeydown={handleKeydown}
			onblur={() => setTimeout(refocus, 100)}
			type="text"
			inputmode="none"
			autocomplete="off"
			autocorrect="off"
			autocapitalize="off"
			spellcheck="false"
			placeholder="Scan or type barcode..."
			class="w-full h-14 px-4 pr-12 text-lg border-2 border-primary rounded-xl bg-white text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
		/>
		<!-- Barcode icon inside input -->
		<svg xmlns="http://www.w3.org/2000/svg" class="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M3 17v2a2 2 0 002 2h2M17 21h2a2 2 0 002-2v-2M7 12h10" />
		</svg>
	</div>

	<!-- Camera button (placeholder for future camera scanning) -->
	<button
		type="button"
		class="flex-shrink-0 w-14 h-14 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center active:bg-gray-200 transition-colors"
		aria-label="Open camera scanner"
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
		</svg>
	</button>
</div>
