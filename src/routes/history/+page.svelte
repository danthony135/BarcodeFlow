<script lang="ts">
	let search = $state('');
	let activeFilter = $state<'today' | 'week' | 'all'>('today');

	interface ScanRecord {
		id: string;
		time: string;
		barcode: string;
		type: 'RECEIVE' | 'QUICK';
		description: string;
		userName: string;
		building: string;
		synced: boolean;
	}

	const sampleScans: ScanRecord[] = [
		{ id: '1', time: '2:34 PM', barcode: '8901234567890', type: 'RECEIVE', description: 'Darcy Sofa - Blue', userName: 'Daniel', building: 'Warehouse', synced: true },
		{ id: '2', time: '2:28 PM', barcode: '8901234567891', type: 'RECEIVE', description: 'Perfect Sleeper Queen', userName: 'Daniel', building: 'Warehouse', synced: true },
		{ id: '3', time: '1:52 PM', barcode: '8901234567892', type: 'QUICK', description: 'Pinnacle Recliner', userName: 'Mike', building: 'Showroom', synced: true },
		{ id: '4', time: '1:15 PM', barcode: '7654321098765', type: 'RECEIVE', description: 'Woodanville Table', userName: 'Daniel', building: 'Warehouse', synced: true },
		{ id: '5', time: '12:48 PM', barcode: '5432109876543', type: 'QUICK', description: 'Calion Sectional', userName: 'Sarah', building: 'Showroom', synced: false },
		{ id: '6', time: '11:30 AM', barcode: '1234567890123', type: 'RECEIVE', description: 'Bladen Loveseat', userName: 'Daniel', building: 'Warehouse', synced: true },
		{ id: '7', time: '11:02 AM', barcode: '9876543210987', type: 'RECEIVE', description: 'Accrington Chair', userName: 'Mike', building: 'Warehouse', synced: true },
		{ id: '8', time: '10:45 AM', barcode: '4567890123456', type: 'QUICK', description: 'Alliston Ottoman', userName: 'Sarah', building: 'Outlet', synced: true },
		{ id: '9', time: '10:12 AM', barcode: '3210987654321', type: 'RECEIVE', description: 'Brinxton Dresser', userName: 'Daniel', building: 'Warehouse', synced: true },
		{ id: '10', time: '9:30 AM', barcode: '6543210987654', type: 'RECEIVE', description: 'Trinell Nightstand', userName: 'Mike', building: 'Warehouse', synced: true }
	];

	let filteredScans = $derived(
		sampleScans.filter((s) => {
			if (!search) return true;
			const q = search.toLowerCase();
			return s.barcode.includes(q) || s.description.toLowerCase().includes(q) || s.userName.toLowerCase().includes(q);
		})
	);

	const todayCount = sampleScans.length;
</script>

<div class="page-enter p-4 space-y-4">
	<!-- Header -->
	<div>
		<h1 class="text-xl font-bold text-gray-900">Scan History</h1>
		<p class="text-sm text-gray-500 mt-0.5">{todayCount} scans today</p>
	</div>

	<!-- Search -->
	<div class="relative">
		<svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
		</svg>
		<input
			type="text"
			bind:value={search}
			placeholder="Search barcode, item, or user..."
			class="w-full h-11 pl-10 pr-4 text-sm border border-gray-200 rounded-xl bg-white placeholder-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
		/>
	</div>

	<!-- Date filter chips -->
	<div class="flex gap-2">
		{#each [{ key: 'today', label: 'Today' }, { key: 'week', label: 'This Week' }, { key: 'all', label: 'All Time' }] as filter}
			<button
				type="button"
				onclick={() => (activeFilter = filter.key as 'today' | 'week' | 'all')}
				class="px-4 py-1.5 text-sm font-medium rounded-full transition-colors
					{activeFilter === filter.key
						? 'bg-primary text-white'
						: 'bg-gray-100 text-gray-600 active:bg-gray-200'}"
			>
				{filter.label}
			</button>
		{/each}
	</div>

	<!-- Scan list -->
	<div class="space-y-2">
		{#each filteredScans as scan}
			<div class="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3">
				<div class="flex items-center gap-2 mb-1">
					<span class="text-xs text-gray-400 w-16 flex-shrink-0">{scan.time}</span>
					<span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded
						{scan.type === 'RECEIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}">
						{scan.type}
					</span>
					<span class="text-sm font-mono text-gray-800 truncate flex-1">{scan.barcode}</span>
					<!-- Sync dot -->
					<span class="w-2 h-2 rounded-full flex-shrink-0 {scan.synced ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}"></span>
				</div>
				<div class="flex items-center gap-2 pl-16">
					<span class="text-xs text-gray-500 truncate">{scan.description}</span>
					<span class="text-[10px] text-gray-300">&middot;</span>
					<span class="text-xs text-gray-400 flex-shrink-0">{scan.userName}</span>
					<span class="text-[10px] text-gray-300">&middot;</span>
					<span class="text-xs text-gray-400 flex-shrink-0">{scan.building}</span>
				</div>
			</div>
		{/each}

		{#if filteredScans.length === 0}
			<div class="text-center py-12">
				<p class="text-sm text-gray-400">No scans match your search</p>
			</div>
		{/if}
	</div>
</div>
