<script lang="ts">
	import ScannerCamera from '$lib/components/ScannerCamera.svelte';
	import ScanFlash from '$lib/components/ScanFlash.svelte';

	interface QuickScan {
		barcode: string;
		location: string | null;
		time: string;
		synced: boolean;
		isLocation: boolean;
	}

	let scans = $state<QuickScan[]>([]);
	let currentLocation = $state<string | null>(null);
	let flash = $state<{ type: 'success' | 'error'; message: string; detail: string } | null>(null);
	let nextScanIsLocation = $state(false);

	// Auto-detect: if barcode contains any letters, it's a location
	function isLocationBarcode(barcode: string): boolean {
		return /[a-zA-Z]/.test(barcode);
	}

	function handleScan(barcode: string) {
		const forceLocation = nextScanIsLocation;
		nextScanIsLocation = false;

		// Determine if this is a location scan
		const isLoc = forceLocation || isLocationBarcode(barcode);

		if (isLoc) {
			// Set as current location
			currentLocation = barcode;
			scans = [
				{
					barcode,
					location: null,
					time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
					synced: true,
					isLocation: true
				},
				...scans
			];
			flash = { type: 'success', message: 'Location Set', detail: barcode };
		} else {
			// Item scan — tagged to current location
			scans = [
				{
					barcode,
					location: currentLocation,
					time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
					synced: false,
					isLocation: false
				},
				...scans
			];
			flash = {
				type: 'success',
				message: 'Scanned',
				detail: currentLocation ? `${barcode} → ${currentLocation}` : barcode
			};

			// Simulate sync
			const bc = barcode;
			setTimeout(() => {
				const scan = scans.find((s) => s.barcode === bc && !s.synced && !s.isLocation);
				if (scan) {
					scan.synced = true;
					scans = [...scans];
				}
			}, 1500);
		}

		setTimeout(() => { flash = null; }, 700);
	}

	function clearSession() {
		scans = [];
		currentLocation = null;
	}

	function clearLocation() {
		currentLocation = null;
	}

	let itemScans = $derived(scans.filter((s) => !s.isLocation));
	let itemCount = $derived(itemScans.length);
</script>

<div class="page-enter p-4 space-y-4">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-bold text-gray-900">Quick Scan</h1>
		{#if scans.length > 0}
			<button
				type="button"
				onclick={clearSession}
				class="text-sm font-medium text-red-500 active:text-red-700 transition-colors"
			>
				Clear Session
			</button>
		{/if}
	</div>

	<!-- Current Location Banner -->
	<div class="rounded-xl px-4 py-3 flex items-center gap-3
		{currentLocation ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}">
		<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
			{currentLocation ? 'bg-blue-100' : 'bg-gray-200'}">
			<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 {currentLocation ? 'text-blue-600' : 'text-gray-400'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
		</div>
		<div class="flex-1 min-w-0">
			<p class="text-xs font-medium uppercase tracking-wide {currentLocation ? 'text-blue-600' : 'text-gray-400'}">Current Location</p>
			{#if currentLocation}
				<p class="text-sm font-bold text-gray-900 font-mono truncate">{currentLocation}</p>
			{:else}
				<p class="text-sm text-gray-400">No location set — scan a location barcode</p>
			{/if}
		</div>
		{#if currentLocation}
			<button
				type="button"
				onclick={clearLocation}
				class="text-xs text-blue-500 font-medium active:text-blue-700 px-2 py-1"
			>
				Clear
			</button>
		{/if}
	</div>

	<!-- Scanner -->
	<ScannerCamera onScan={handleScan} />

	<!-- Set Location toggle button -->
	<button
		type="button"
		onclick={() => nextScanIsLocation = !nextScanIsLocation}
		class="w-full flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-colors
			{nextScanIsLocation ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600 border border-blue-200'}"
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
		</svg>
		{#if nextScanIsLocation}
			Next scan sets location — scan now...
		{:else}
			Set Location (next scan)
		{/if}
	</button>

	<!-- Scan count -->
	{#if itemCount > 0}
		<p class="text-sm text-gray-500 font-medium">{itemCount} item{itemCount !== 1 ? 's' : ''} scanned</p>
	{/if}

	<!-- Scans list -->
	<div class="space-y-2">
		{#each scans as scan}
			{#if scan.isLocation}
				<!-- Location marker -->
				<div class="flex items-center gap-2 py-1">
					<div class="flex-1 h-px bg-blue-200"></div>
					<div class="flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-full border border-blue-200">
						<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
						<span class="text-xs font-bold text-blue-700 font-mono">{scan.barcode}</span>
						<span class="text-xs text-blue-400">{scan.time}</span>
					</div>
					<div class="flex-1 h-px bg-blue-200"></div>
				</div>
			{:else}
				<!-- Item scan -->
				<div class="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3">
					<!-- Sync status dot -->
					<span class="w-2.5 h-2.5 rounded-full flex-shrink-0 {scan.synced ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}"></span>

					<!-- Barcode + location -->
					<div class="flex-1 min-w-0">
						<p class="text-sm font-mono font-medium text-gray-900 truncate">{scan.barcode}</p>
						{#if scan.location}
							<p class="text-xs text-blue-500 truncate flex items-center gap-1">
								<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 inline flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
								</svg>
								{scan.location}
							</p>
						{:else}
							<p class="text-xs text-gray-300">No location</p>
						{/if}
					</div>

					<!-- Time -->
					<span class="text-xs text-gray-400 flex-shrink-0">{scan.time}</span>
				</div>
			{/if}
		{/each}
	</div>

	{#if scans.length === 0}
		<div class="text-center py-12">
			<div class="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
				<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M3 17v2a2 2 0 002 2h2M17 21h2a2 2 0 002-2v-2M7 12h10" />
				</svg>
			</div>
			<p class="text-sm text-gray-500 font-medium">Ready to scan</p>
			<p class="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
				Scan a location barcode first (contains letters), then scan items. Items are tagged to that location until you scan a new one.
			</p>
		</div>
	{/if}
</div>

<!-- Scan Flash -->
{#if flash}
	<ScanFlash type={flash.type} message={flash.message} detail={flash.detail} />
{/if}
