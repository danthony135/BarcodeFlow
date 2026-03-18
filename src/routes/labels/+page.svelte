<script lang="ts">
	let activeTab = $state<'recent' | 'search'>('recent');
	let searchQuery = $state('');
	let showCreateModal = $state(false);

	// Create form state
	let newLabel = $state({
		sku: '',
		description: '',
		poNumber: '',
		building: '',
		labelType: 'receiving' as 'receiving' | 'sales'
	});

	interface Label {
		id: string;
		barcode: string;
		sku: string;
		description: string;
		printCount: number;
		createdAt: string;
	}

	const sampleLabels: Label[] = [
		{ id: '1', barcode: '8901234567890', sku: 'ASH-SOF-1234', description: 'Darcy Sofa - Blue', printCount: 3, createdAt: '10:42 AM' },
		{ id: '2', barcode: '8901234567891', sku: 'SRT-MAT-5678', description: 'Perfect Sleeper Queen', printCount: 1, createdAt: '9:15 AM' },
		{ id: '3', barcode: '8901234567892', sku: 'LZB-REC-9012', description: 'Pinnacle Recliner - Brown', printCount: 2, createdAt: 'Yesterday' },
		{ id: '4', barcode: '8901234567893', sku: 'ASH-TBL-3456', description: 'Woodanville Dining Table', printCount: 1, createdAt: 'Yesterday' }
	];

	let filteredLabels = $derived(
		activeTab === 'search' && searchQuery
			? sampleLabels.filter((l) => {
					const q = searchQuery.toLowerCase();
					return l.sku.toLowerCase().includes(q) || l.description.toLowerCase().includes(q) || l.barcode.includes(q);
				})
			: sampleLabels
	);

	function handleCreate() {
		// TODO: POST to /api/labels
		showCreateModal = false;
		newLabel = { sku: '', description: '', poNumber: '', building: '', labelType: 'receiving' };
	}
</script>

<div class="page-enter p-4 space-y-4">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-bold text-gray-900">Labels</h1>
		<button
			type="button"
			onclick={() => (showCreateModal = true)}
			class="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl active:bg-primary-dark transition-colors"
		>
			Create Label
		</button>
	</div>

	<!-- Tabs -->
	<div class="flex bg-gray-100 rounded-xl p-1">
		<button
			type="button"
			onclick={() => (activeTab = 'recent')}
			class="flex-1 py-2 text-sm font-medium rounded-lg transition-colors
				{activeTab === 'recent' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}"
		>
			Recent
		</button>
		<button
			type="button"
			onclick={() => (activeTab = 'search')}
			class="flex-1 py-2 text-sm font-medium rounded-lg transition-colors
				{activeTab === 'search' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}"
		>
			Search
		</button>
	</div>

	<!-- Search bar (only on search tab) -->
	{#if activeTab === 'search'}
		<div class="relative">
			<svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search SKU, description, or barcode..."
				class="w-full h-11 pl-10 pr-4 text-sm border border-gray-200 rounded-xl bg-white placeholder-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
			/>
		</div>
	{/if}

	<!-- Label cards -->
	<div class="space-y-3">
		{#each filteredLabels as label}
			<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
				<!-- Barcode image -->
				<div class="bg-gray-50 rounded-lg p-3 mb-3 flex items-center justify-center">
					<img
						src="/api/barcode/{label.barcode}.svg"
						alt="Barcode {label.barcode}"
						class="h-12 w-full object-contain"
						onerror={(e: Event) => { const img = e.currentTarget as HTMLImageElement; img.style.display = 'none'; const next = img.nextElementSibling as HTMLElement; if (next) next.style.display = 'block'; }}
					/>
					<p class="text-xs font-mono text-gray-400 hidden text-center">{label.barcode}</p>
				</div>

				<div class="flex items-start justify-between">
					<div class="min-w-0 flex-1">
						<p class="text-sm font-bold text-gray-900">{label.sku}</p>
						<p class="text-xs text-gray-500 mt-0.5 truncate">{label.description}</p>
						<p class="text-[10px] text-gray-400 mt-1">Printed {label.printCount}x &middot; {label.createdAt}</p>
					</div>
					<button
						type="button"
						class="ml-3 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg active:bg-primary/20 transition-colors flex-shrink-0"
					>
						Reprint
					</button>
				</div>
			</div>
		{/each}

		{#if filteredLabels.length === 0}
			<div class="text-center py-12">
				<p class="text-sm text-gray-400">No labels found</p>
			</div>
		{/if}
	</div>
</div>

<!-- Create Label Modal -->
{#if showCreateModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
		onclick={(e: MouseEvent) => { if (e.target === e.currentTarget) showCreateModal = false; }}
	>
		<div class="w-full max-w-lg bg-white rounded-t-2xl shadow-xl p-5 pb-8 space-y-4 animate-slide-up">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-bold text-gray-900">Create Label</h2>
				<button
					type="button"
					onclick={() => (showCreateModal = false)}
					class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
					aria-label="Close"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="space-y-3">
				<div>
					<label for="label-sku" class="block text-xs font-medium text-gray-600 mb-1">SKU *</label>
					<input
						id="label-sku"
						type="text"
						bind:value={newLabel.sku}
						placeholder="e.g. ASH-SOF-1234"
						class="w-full h-11 px-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
					/>
				</div>

				<div>
					<label for="label-desc" class="block text-xs font-medium text-gray-600 mb-1">Description *</label>
					<input
						id="label-desc"
						type="text"
						bind:value={newLabel.description}
						placeholder="e.g. Darcy Sofa - Blue"
						class="w-full h-11 px-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
					/>
				</div>

				<div>
					<label for="label-po" class="block text-xs font-medium text-gray-600 mb-1">PO Number <span class="text-gray-400">(optional)</span></label>
					<input
						id="label-po"
						type="text"
						bind:value={newLabel.poNumber}
						placeholder="e.g. 4521"
						class="w-full h-11 px-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
					/>
				</div>

				<div>
					<label for="label-building" class="block text-xs font-medium text-gray-600 mb-1">Building</label>
					<select
						id="label-building"
						bind:value={newLabel.building}
						class="w-full h-11 px-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition bg-white"
					>
						<option value="">Select building...</option>
						<option value="warehouse">Warehouse</option>
						<option value="showroom">Showroom</option>
						<option value="outlet">Outlet</option>
					</select>
				</div>

				<!-- Label type toggle -->
				<div>
					<p class="text-xs font-medium text-gray-600 mb-2">Label Type</p>
					<div class="flex bg-gray-100 rounded-xl p-1">
						<button
							type="button"
							onclick={() => (newLabel.labelType = 'receiving')}
							class="flex-1 py-2 text-sm font-medium rounded-lg transition-colors
								{newLabel.labelType === 'receiving' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}"
						>
							Receiving
						</button>
						<button
							type="button"
							onclick={() => (newLabel.labelType = 'sales')}
							class="flex-1 py-2 text-sm font-medium rounded-lg transition-colors
								{newLabel.labelType === 'sales' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}"
						>
							Sales
						</button>
					</div>
				</div>
			</div>

			<button
				type="button"
				onclick={handleCreate}
				disabled={!newLabel.sku || !newLabel.description}
				class="w-full h-12 bg-primary text-white font-semibold rounded-xl active:bg-primary-dark transition-colors disabled:opacity-40 disabled:pointer-events-none"
			>
				Create &amp; Print
			</button>
		</div>
	</div>
{/if}

<style>
	@keyframes slide-up {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	}
	.animate-slide-up {
		animation: slide-up 0.25s ease-out;
	}
</style>
