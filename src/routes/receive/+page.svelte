<script lang="ts">
	import { onMount } from 'svelte';

	let search = $state('');
	let loading = $state(true);

	interface POItem {
		number: string;
		vendor: string;
		totalItems: number;
		received: number;
	}

	const samplePOs: POItem[] = [
		{ number: '4521', vendor: 'Ashley Furniture', totalItems: 15, received: 0 },
		{ number: '4518', vendor: 'Serta Simmons', totalItems: 8, received: 5 },
		{ number: '4515', vendor: 'La-Z-Boy', totalItems: 22, received: 20 }
	];

	let pos = $state<POItem[]>(samplePOs);

	onMount(async () => {
		try {
			const res = await fetch('/api/pos');
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data) && data.length > 0) {
					pos = data.map((po: { poNumber: string; vendor: string | null; totalItems: number; receivedCount: number }) => ({
						number: po.poNumber,
						vendor: po.vendor ?? 'Unknown Vendor',
						totalItems: po.totalItems,
						received: po.receivedCount
					}));
				}
			}
		} catch {
			// API unavailable, keep sample data
		} finally {
			loading = false;
		}
	});

	let filteredPOs = $derived(
		pos.filter((po) => {
			const q = search.toLowerCase();
			if (!q) return true;
			return po.number.includes(q) || po.vendor.toLowerCase().includes(q);
		})
	);

	function progressPercent(received: number, total: number): number {
		if (total === 0) return 0;
		return Math.round((received / total) * 100);
	}
</script>

<div class="page-enter p-4 space-y-4">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-bold text-gray-900">Receive POs</h1>
	</div>

	<!-- Search -->
	<div class="relative">
		<svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
		</svg>
		<input
			type="text"
			bind:value={search}
			placeholder="Search PO# or vendor..."
			class="w-full h-11 pl-10 pr-4 text-sm border border-gray-200 rounded-xl bg-white placeholder-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
		/>
	</div>

	<!-- Loading -->
	{#if loading}
		<div class="text-center py-12">
			<div class="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
			<p class="text-sm text-gray-400 mt-2">Loading POs...</p>
		</div>
	{:else}
		<!-- PO List -->
		<div class="space-y-3">
			{#each filteredPOs as po}
				{@const pct = progressPercent(po.received, po.totalItems)}
				<div class="relative bg-white rounded-xl shadow-sm border border-gray-100 active:bg-gray-50 transition-colors">
					<a
						href="/receive/{po.number}"
						class="block p-4"
					>
						<div class="flex items-start justify-between mb-2">
							<div>
								<p class="text-base font-bold text-gray-900">PO #{po.number}</p>
								<p class="text-sm text-gray-500">{po.vendor}</p>
							</div>
							<span class="text-xs font-medium text-gray-400">{po.received}/{po.totalItems} items</span>
						</div>

						<!-- Progress bar -->
						<div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
							<div
								class="h-full bg-primary rounded-full transition-all"
								style="width: {pct}%"
							></div>
						</div>
						<p class="text-xs text-gray-400 mt-1 text-right">{pct}%</p>
					</a>

					<!-- Print icon button -->
					<a
						href="/receive/{po.number}?print=true"
						class="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-primary/10 hover:text-primary active:bg-primary/20 transition-colors z-10"
						title="Print labels for PO #{po.number}"
						onclick={(e: MouseEvent) => e.stopPropagation()}
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
						</svg>
					</a>
				</div>
			{/each}

			{#if filteredPOs.length === 0}
				<div class="text-center py-12">
					<p class="text-sm text-gray-400">No POs match your search</p>
				</div>
			{/if}
		</div>
	{/if}
</div>
