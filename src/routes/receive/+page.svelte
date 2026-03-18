<script lang="ts">
	let search = $state('');

	const samplePOs = [
		{ number: '4521', vendor: 'Ashley Furniture', totalItems: 15, received: 0 },
		{ number: '4518', vendor: 'Serta Simmons', totalItems: 8, received: 5 },
		{ number: '4515', vendor: 'La-Z-Boy', totalItems: 22, received: 20 }
	];

	let filteredPOs = $derived(
		samplePOs.filter((po) => {
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

	<!-- PO List -->
	<div class="space-y-3">
		{#each filteredPOs as po}
			{@const pct = progressPercent(po.received, po.totalItems)}
			<a
				href="/receive/{po.number}"
				class="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 active:bg-gray-50 transition-colors"
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
		{/each}

		{#if filteredPOs.length === 0}
			<div class="text-center py-12">
				<p class="text-sm text-gray-400">No POs match your search</p>
			</div>
		{/if}
	</div>
</div>
