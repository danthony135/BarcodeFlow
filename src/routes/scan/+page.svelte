<script lang="ts">
	import ScannerCamera from '$lib/components/ScannerCamera.svelte';
	import ScanFlash from '$lib/components/ScanFlash.svelte';

	interface QuickScan {
		barcode: string;
		time: string;
		synced: boolean;
	}

	let scans = $state<QuickScan[]>([]);
	let flash = $state<{ type: 'success' | 'error'; message: string; detail: string } | null>(null);

	function handleScan(barcode: string) {
		scans = [
			{
				barcode,
				time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
				synced: false
			},
			...scans
		];

		flash = { type: 'success', message: 'Scanned', detail: barcode };

		// Simulate sync after a moment
		setTimeout(() => {
			const scan = scans.find((s) => s.barcode === barcode && !s.synced);
			if (scan) {
				scan.synced = true;
				scans = [...scans];
			}
		}, 1500);

		setTimeout(() => {
			flash = null;
		}, 700);
	}

	function clearSession() {
		scans = [];
	}
</script>

<div class="page-enter p-4 space-y-5">
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

	<!-- Scanner (large, centered) -->
	<div class="pt-2">
		<ScannerCamera onScan={handleScan} />
	</div>

	<!-- Scan count -->
	{#if scans.length > 0}
		<p class="text-sm text-gray-500 font-medium">{scans.length} scan{scans.length !== 1 ? 's' : ''} this session</p>
	{/if}

	<!-- Scans list -->
	<div class="space-y-2">
		{#each scans as scan}
			<div class="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3">
				<!-- Sync status dot -->
				<span class="w-2.5 h-2.5 rounded-full flex-shrink-0 {scan.synced ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}"></span>

				<!-- Barcode -->
				<p class="text-sm font-mono font-medium text-gray-900 flex-1 truncate">{scan.barcode}</p>

				<!-- Time -->
				<span class="text-xs text-gray-400 flex-shrink-0">{scan.time}</span>
			</div>
		{/each}
	</div>

	{#if scans.length === 0}
		<div class="text-center py-16">
			<div class="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
				<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M3 17v2a2 2 0 002 2h2M17 21h2a2 2 0 002-2v-2M7 12h10" />
				</svg>
			</div>
			<p class="text-sm text-gray-500 font-medium">Ready to scan</p>
			<p class="text-xs text-gray-400 mt-1">Scan a barcode or type one above</p>
		</div>
	{/if}
</div>

<!-- Scan Flash -->
{#if flash}
	<ScanFlash type={flash.type} message={flash.message} detail={flash.detail} />
{/if}
