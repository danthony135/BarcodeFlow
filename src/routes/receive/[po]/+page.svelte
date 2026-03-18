<script lang="ts">
	import { page } from '$app/stores';
	import ScannerCamera from '$lib/components/ScannerCamera.svelte';
	import ScanFlash from '$lib/components/ScanFlash.svelte';

	let poNumber = $derived($page.params.po);

	// Sample PO data lookup
	const poData: Record<string, { vendor: string; totalItems: number }> = {
		'4521': { vendor: 'Ashley Furniture', totalItems: 15 },
		'4518': { vendor: 'Serta Simmons', totalItems: 8 },
		'4515': { vendor: 'La-Z-Boy', totalItems: 22 }
	};

	let po = $derived(poData[poNumber] ?? { vendor: 'Unknown Vendor', totalItems: 0 });

	interface ScannedItem {
		barcode: string;
		time: string;
		qty: number;
	}

	let scannedItems = $state<ScannedItem[]>([]);
	let flash = $state<{ type: 'success' | 'error'; message: string; detail: string } | null>(null);

	function handleScan(barcode: string) {
		// Check if already scanned
		const existing = scannedItems.find((s) => s.barcode === barcode);
		if (existing) {
			existing.qty += 1;
			// Trigger reactivity
			scannedItems = [...scannedItems];
			flash = { type: 'success', message: '+1 Qty', detail: barcode };
		} else {
			scannedItems = [
				{
					barcode,
					time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
					qty: 1
				},
				...scannedItems
			];
			flash = { type: 'success', message: 'Scanned', detail: barcode };
		}

		// Clear flash after animation
		setTimeout(() => {
			flash = null;
		}, 700);
	}

	function addQty(index: number) {
		scannedItems[index].qty += 1;
		scannedItems = [...scannedItems];
	}

	let totalScanned = $derived(scannedItems.reduce((sum, s) => sum + s.qty, 0));
</script>

<div class="page-enter p-4 space-y-4">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<a
			href="/receive"
			class="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200 transition-colors flex-shrink-0"
			aria-label="Back"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</a>
		<div class="min-w-0">
			<h1 class="text-lg font-bold text-gray-900 truncate">PO #{poNumber}</h1>
			<p class="text-sm text-gray-500">{po.vendor}</p>
		</div>
	</div>

	<!-- Scanner -->
	<ScannerCamera onScan={handleScan} />

	<!-- Running count -->
	<div class="flex items-center justify-between bg-primary/5 rounded-xl px-4 py-3">
		<span class="text-sm font-medium text-gray-700">Items scanned</span>
		<span class="text-lg font-bold text-primary">{totalScanned} <span class="text-sm font-normal text-gray-400">of {po.totalItems}</span></span>
	</div>

	<!-- Scanned items list -->
	{#if scannedItems.length > 0}
		<div class="space-y-2">
			{#each scannedItems as item, i}
				<div class="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3">
					<!-- Checkmark -->
					<div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
						<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
						</svg>
					</div>

					<!-- Info -->
					<div class="flex-1 min-w-0">
						<p class="text-sm font-mono font-medium text-gray-900 truncate">{item.barcode}</p>
						<p class="text-xs text-gray-400">{item.time} &middot; Qty: {item.qty}</p>
					</div>

					<!-- Actions -->
					<button
						type="button"
						onclick={() => addQty(i)}
						class="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg active:bg-gray-200 transition-colors"
					>
						+Qty
					</button>
					<button
						type="button"
						class="px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg active:bg-primary/20 transition-colors"
					>
						Print
					</button>
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-center py-8">
			<p class="text-sm text-gray-400">Scan barcodes to start receiving</p>
		</div>
	{/if}

	<!-- Finish button -->
	<button
		type="button"
		class="w-full h-14 bg-primary text-white font-semibold text-base rounded-xl shadow-sm active:bg-primary-dark transition-colors"
	>
		Finish Receiving
	</button>
</div>

<!-- Scan Flash -->
{#if flash}
	<ScanFlash type={flash.type} message={flash.message} detail={flash.detail} />
{/if}
