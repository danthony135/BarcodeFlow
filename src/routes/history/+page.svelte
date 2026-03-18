<script lang="ts">
	import { onMount } from 'svelte';

	let search = $state('');
	let searchDebounced = $state('');
	let searchTimer: ReturnType<typeof setTimeout> | null = null;
	let activeFilter = $state<'today' | 'week' | 'all'>('today');
	let syncFilter = $state<'ALL' | 'PENDING' | 'SENT' | 'CONFIRMED' | 'FAILED'>('ALL');
	let expandedId = $state<string | null>(null);

	interface ScanRecord {
		id: string;
		barcode: string;
		scanType: 'RECEIVE' | 'QUICK' | 'INVENTORY' | 'SALES';
		poNumber: string | null;
		sku: string | null;
		description: string | null;
		ticketNumber: string | null;
		quantity: number;
		deviceInfo: string | null;
		syncStatus: 'PENDING' | 'SENT' | 'CONFIRMED' | 'FAILED';
		syncedToRvAt: string | null;
		scannedAt: string;
		createdAt: string;
		user: { id: string; name: string } | null;
		building: { id: string; name: string; code: string } | null;
	}

	const sampleScans: ScanRecord[] = [
		{ id: '1', barcode: '8901234567890', scanType: 'RECEIVE', poNumber: 'PO-2024-001', sku: 'ASH-1001', description: 'Darcy Sofa - Blue', ticketNumber: 'TK-100', quantity: 1, deviceInfo: null, syncStatus: 'CONFIRMED', syncedToRvAt: new Date(Date.now() - 60000).toISOString(), scannedAt: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date(Date.now() - 3600000).toISOString(), user: { id: '1', name: 'Daniel' }, building: { id: '1', name: 'Warehouse', code: 'WH' } },
		{ id: '2', barcode: '8901234567891', scanType: 'RECEIVE', poNumber: 'PO-2024-001', sku: 'SRT-2001', description: 'Perfect Sleeper Queen', ticketNumber: null, quantity: 1, deviceInfo: null, syncStatus: 'SENT', syncedToRvAt: new Date(Date.now() - 120000).toISOString(), scannedAt: new Date(Date.now() - 7200000).toISOString(), createdAt: new Date(Date.now() - 7200000).toISOString(), user: { id: '1', name: 'Daniel' }, building: { id: '1', name: 'Warehouse', code: 'WH' } },
		{ id: '3', barcode: '8901234567892', scanType: 'QUICK', poNumber: null, sku: 'LZB-3001', description: 'Pinnacle Recliner', ticketNumber: null, quantity: 1, deviceInfo: null, syncStatus: 'PENDING', syncedToRvAt: null, scannedAt: new Date(Date.now() - 10800000).toISOString(), createdAt: new Date(Date.now() - 10800000).toISOString(), user: { id: '2', name: 'Mike' }, building: { id: '2', name: 'Showroom', code: 'SR' } },
		{ id: '4', barcode: '7654321098765', scanType: 'INVENTORY', poNumber: null, sku: 'ASH-4001', description: 'Woodanville Table', ticketNumber: null, quantity: 3, deviceInfo: 'Zebra TC21', syncStatus: 'CONFIRMED', syncedToRvAt: new Date(Date.now() - 180000).toISOString(), scannedAt: new Date(Date.now() - 14400000).toISOString(), createdAt: new Date(Date.now() - 14400000).toISOString(), user: { id: '1', name: 'Daniel' }, building: { id: '1', name: 'Warehouse', code: 'WH' } },
		{ id: '5', barcode: '5432109876543', scanType: 'SALES', poNumber: null, sku: 'ASH-5001', description: 'Calion Sectional', ticketNumber: 'TK-205', quantity: 1, deviceInfo: null, syncStatus: 'FAILED', syncedToRvAt: null, scannedAt: new Date(Date.now() - 18000000).toISOString(), createdAt: new Date(Date.now() - 18000000).toISOString(), user: { id: '3', name: 'Sarah' }, building: { id: '2', name: 'Showroom', code: 'SR' } },
	];

	let scans = $state<ScanRecord[]>([]);
	let total = $state(0);
	let loading = $state(false);
	let loadingMore = $state(false);
	let hasMore = $state(false);
	let usingSample = $state(false);
	let retrying = $state(false);
	let retryingScanId = $state<string | null>(null);

	// Stats derived from loaded data
	let syncedCount = $derived(scans.filter(s => s.syncStatus === 'CONFIRMED' || s.syncStatus === 'SENT').length);
	let pendingCount = $derived(scans.filter(s => s.syncStatus === 'PENDING').length);
	let failedCount = $derived(scans.filter(s => s.syncStatus === 'FAILED').length);

	// Debounced search
	function onSearchInput() {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			searchDebounced = search;
		}, 300);
	}

	// Build API URL with all params
	function buildApiUrl(offset = 0): string {
		const params = new URLSearchParams();
		params.set('limit', '50');
		params.set('offset', String(offset));

		if (searchDebounced) params.set('search', searchDebounced);
		if (syncFilter !== 'ALL') params.set('syncStatus', syncFilter);

		// Date filters
		const now = new Date();
		if (activeFilter === 'today') {
			const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			params.set('dateFrom', todayStart.toISOString());
		} else if (activeFilter === 'week') {
			const weekStart = new Date(now);
			weekStart.setDate(weekStart.getDate() - weekStart.getDay());
			weekStart.setHours(0, 0, 0, 0);
			params.set('dateFrom', weekStart.toISOString());
		}

		return `/api/scans?${params.toString()}`;
	}

	async function fetchScans(append = false) {
		if (append) {
			loadingMore = true;
		} else {
			loading = true;
		}

		try {
			const offset = append ? scans.length : 0;
			const res = await fetch(buildApiUrl(offset));
			if (!res.ok) throw new Error('API error');

			const data = await res.json();
			if (data.scans) {
				if (append) {
					scans = [...scans, ...data.scans];
				} else {
					scans = data.scans;
				}
				total = data.total;
				hasMore = scans.length < total;
				usingSample = false;
			} else {
				throw new Error('Invalid response');
			}
		} catch {
			if (!append) {
				scans = sampleScans;
				total = sampleScans.length;
				hasMore = false;
				usingSample = true;
			}
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	// Retry a single failed scan
	async function retryScan(scanId: string) {
		retryingScanId = scanId;
		try {
			const res = await fetch('/api/scans/retry', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ scanId })
			});
			if (res.ok) {
				// Update local state
				scans = scans.map(s => s.id === scanId ? { ...s, syncStatus: 'PENDING' as const, syncedToRvAt: null } : s);
			}
		} finally {
			retryingScanId = null;
		}
	}

	// Retry all failed scans
	async function retryAllFailed() {
		retrying = true;
		try {
			const res = await fetch('/api/scans/retry', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});
			if (res.ok) {
				scans = scans.map(s => s.syncStatus === 'FAILED' ? { ...s, syncStatus: 'PENDING' as const, syncedToRvAt: null } : s);
			}
		} finally {
			retrying = false;
		}
	}

	// Infinite scroll handler
	function handleScroll(e: Event) {
		const el = e.target as HTMLElement;
		if (!el) return;
		const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
		if (nearBottom && hasMore && !loadingMore) {
			fetchScans(true);
		}
	}

	function formatTime(dateStr: string): string {
		return new Date(dateStr).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	function formatDateTime(dateStr: string): string {
		return new Date(dateStr).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	function toggleExpand(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	// Scan type badge colors
	function scanTypeBadge(type: string): string {
		switch (type) {
			case 'RECEIVE': return 'bg-emerald-100 text-emerald-700';
			case 'QUICK': return 'bg-blue-100 text-blue-700';
			case 'INVENTORY': return 'bg-purple-100 text-purple-700';
			case 'SALES': return 'bg-amber-100 text-amber-700';
			default: return 'bg-gray-100 text-gray-700';
		}
	}

	// Re-fetch when filters change
	$effect(() => {
		// Track reactive dependencies
		activeFilter;
		syncFilter;
		searchDebounced;
		fetchScans();
	});

	onMount(() => {
		fetchScans();
	});
</script>

<div class="page-enter flex flex-col h-[calc(100dvh-var(--bottom-nav-height))]">
	<!-- Fixed header section -->
	<div class="p-4 space-y-3 flex-shrink-0">
		<!-- Header -->
		<div>
			<h1 class="text-xl font-bold text-gray-900">Scan History</h1>
			<p class="text-sm text-gray-500 mt-0.5">
				{#if loading}
					Loading...
				{:else}
					{total} scan{total !== 1 ? 's' : ''} {activeFilter === 'today' ? 'today' : activeFilter === 'week' ? 'this week' : 'total'}
					{#if usingSample}
						<span class="text-amber-500">(sample data)</span>
					{/if}
				{/if}
			</p>
		</div>

		<!-- Stats bar -->
		{#if !loading && scans.length > 0}
			<div class="flex items-center gap-3 text-xs">
				<span class="flex items-center gap-1 text-emerald-600">
					<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
					{syncedCount} synced
				</span>
				<span class="flex items-center gap-1 text-amber-600">
					<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
					{pendingCount} pending
				</span>
				{#if failedCount > 0}
					<span class="flex items-center gap-1 text-red-600">
						<span class="w-2 h-2 rounded-full bg-red-500"></span>
						{failedCount} failed
					</span>
				{/if}
			</div>

			<!-- Failed alert -->
			{#if failedCount > 0}
				<div class="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-3 py-2">
					<div class="flex items-center gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
						</svg>
						<span class="text-xs font-medium text-red-700">{failedCount} scan{failedCount !== 1 ? 's' : ''} failed to sync</span>
					</div>
					<button
						type="button"
						onclick={retryAllFailed}
						disabled={retrying}
						class="text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 active:bg-red-300 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
					>
						{retrying ? 'Retrying...' : 'Retry All'}
					</button>
				</div>
			{/if}
		{/if}

		<!-- Search -->
		<div class="relative">
			<svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			<input
				type="text"
				bind:value={search}
				oninput={onSearchInput}
				placeholder="Search barcode, SKU, PO, or description..."
				class="w-full h-11 pl-10 pr-4 text-sm border border-gray-200 rounded-xl bg-white placeholder-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
			/>
		</div>

		<!-- Date filter chips -->
		<div class="flex gap-2">
			{#each [{ key: 'today', label: 'Today' }, { key: 'week', label: 'This Week' }, { key: 'all', label: 'All Time' }] as filter}
				<button
					type="button"
					onclick={() => (activeFilter = filter.key as 'today' | 'week' | 'all')}
					class="px-3 py-1.5 text-xs font-medium rounded-full transition-colors
						{activeFilter === filter.key
							? 'bg-primary text-white'
							: 'bg-gray-100 text-gray-600 active:bg-gray-200'}"
				>
					{filter.label}
				</button>
			{/each}
			<span class="w-px h-6 bg-gray-200 self-center"></span>
			{#each [{ key: 'ALL', label: 'All' }, { key: 'PENDING', label: 'Pending' }, { key: 'CONFIRMED', label: 'Synced' }, { key: 'FAILED', label: 'Failed' }] as sf}
				<button
					type="button"
					onclick={() => (syncFilter = sf.key as typeof syncFilter)}
					class="px-3 py-1.5 text-xs font-medium rounded-full transition-colors
						{syncFilter === sf.key
							? sf.key === 'FAILED' ? 'bg-red-500 text-white' : sf.key === 'PENDING' ? 'bg-amber-500 text-white' : sf.key === 'CONFIRMED' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-white'
							: 'bg-gray-100 text-gray-600 active:bg-gray-200'}"
				>
					{sf.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Scrollable scan list -->
	<div class="flex-1 overflow-y-auto px-4 pb-4" onscroll={handleScroll}>
		{#if loading}
			<div class="space-y-2">
				{#each Array(5) as _}
					<div class="bg-white rounded-xl border border-gray-100 px-4 py-3 animate-pulse">
						<div class="flex items-center gap-2 mb-2">
							<div class="w-14 h-3 bg-gray-200 rounded"></div>
							<div class="w-16 h-4 bg-gray-200 rounded-full"></div>
							<div class="flex-1 h-3 bg-gray-200 rounded"></div>
						</div>
						<div class="flex items-center gap-2 pl-16">
							<div class="w-32 h-3 bg-gray-200 rounded"></div>
							<div class="w-20 h-3 bg-gray-200 rounded"></div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="space-y-2">
				{#each scans as scan (scan.id)}
					<!-- Scan card -->
					<button
						type="button"
						onclick={() => toggleExpand(scan.id)}
						class="w-full text-left bg-white rounded-xl shadow-sm border border-gray-100 transition-all
							{scan.syncStatus === 'FAILED' ? 'border-red-200 bg-red-50/30' : ''}
							{expandedId === scan.id ? 'ring-2 ring-primary/20 border-primary/30' : ''}"
					>
						<div class="px-4 py-3">
							<!-- Main row -->
							<div class="flex items-center gap-2 mb-1.5">
								<span class="text-xs text-gray-400 w-[4.5rem] flex-shrink-0">{formatTime(scan.scannedAt)}</span>
								<span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded {scanTypeBadge(scan.scanType)}">
									{scan.scanType}
								</span>
								<span class="text-sm font-mono text-gray-800 truncate flex-1">{scan.barcode}</span>
								<!-- Sync status indicator -->
								{#if scan.syncStatus === 'PENDING'}
									<span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" title="Pending sync"></span>
								{:else if scan.syncStatus === 'SENT'}
									<span class="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" title="Sent to ProfitSystems"></span>
								{:else if scan.syncStatus === 'CONFIRMED'}
									<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" title="Confirmed in ProfitSystems"></span>
								{:else if scan.syncStatus === 'FAILED'}
									<span class="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" title="Sync failed"></span>
								{/if}
							</div>

							<!-- Detail row -->
							<div class="flex items-center gap-2 pl-[4.5rem]">
								{#if scan.description}
									<span class="text-xs text-gray-500 truncate">{scan.description}</span>
									<span class="text-[10px] text-gray-300">&middot;</span>
								{/if}
								<span class="text-xs text-gray-400 flex-shrink-0">{scan.user?.name ?? 'Unknown'}</span>
								<span class="text-[10px] text-gray-300">&middot;</span>
								<span class="text-xs text-gray-400 flex-shrink-0">{scan.building?.name ?? 'N/A'}</span>
							</div>

							<!-- Sync status badge row -->
							<div class="flex items-center gap-2 mt-1.5 pl-[4.5rem]">
								{#if scan.syncStatus === 'PENDING'}
									<span class="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
										<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
										Waiting to sync
									</span>
								{:else if scan.syncStatus === 'SENT'}
									<span class="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
										<svg xmlns="http://www.w3.org/2000/svg" class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
											<path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" />
											<path stroke-linecap="round" stroke-linejoin="round" d="M12 5l7 7-7 7" />
										</svg>
										Sent to ProfitSystems
									</span>
									{#if scan.syncedToRvAt}
										<span class="text-[10px] text-gray-400">{formatDateTime(scan.syncedToRvAt)}</span>
									{/if}
								{:else if scan.syncStatus === 'CONFIRMED'}
									<span class="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
										<svg xmlns="http://www.w3.org/2000/svg" class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
											<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
										</svg>
										Confirmed in ProfitSystems
									</span>
									{#if scan.syncedToRvAt}
										<span class="text-[10px] text-gray-400">{formatDateTime(scan.syncedToRvAt)}</span>
									{/if}
								{:else if scan.syncStatus === 'FAILED'}
									<span class="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
										<svg xmlns="http://www.w3.org/2000/svg" class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
											<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
										</svg>
										Sync failed
									</span>
								{/if}
							</div>
						</div>

						<!-- Expanded details -->
						{#if expandedId === scan.id}
							<div class="border-t border-gray-100 px-4 py-3 space-y-3">
								<!-- All fields -->
								<div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
									<div>
										<span class="text-gray-400">Barcode</span>
										<p class="font-mono text-gray-800">{scan.barcode}</p>
									</div>
									{#if scan.sku}
										<div>
											<span class="text-gray-400">SKU</span>
											<p class="font-mono text-gray-800">{scan.sku}</p>
										</div>
									{/if}
									{#if scan.poNumber}
										<div>
											<span class="text-gray-400">PO Number</span>
											<p class="text-gray-800">{scan.poNumber}</p>
										</div>
									{/if}
									{#if scan.ticketNumber}
										<div>
											<span class="text-gray-400">Ticket #</span>
											<p class="text-gray-800">{scan.ticketNumber}</p>
										</div>
									{/if}
									<div>
										<span class="text-gray-400">Building</span>
										<p class="text-gray-800">{scan.building?.name ?? 'N/A'} {scan.building?.code ? `(${scan.building.code})` : ''}</p>
									</div>
									<div>
										<span class="text-gray-400">Quantity</span>
										<p class="text-gray-800">{scan.quantity}</p>
									</div>
									{#if scan.deviceInfo}
										<div class="col-span-2">
											<span class="text-gray-400">Device</span>
											<p class="text-gray-800">{scan.deviceInfo}</p>
										</div>
									{/if}
								</div>

								<!-- Sync timeline -->
								<div>
									<p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Sync Timeline</p>
									<div class="relative pl-4 space-y-2">
										<!-- Timeline line -->
										<div class="absolute left-[5px] top-1 bottom-1 w-px bg-gray-200"></div>

										<!-- Created -->
										<div class="relative flex items-center gap-2">
											<div class="absolute left-[-11px] w-2.5 h-2.5 rounded-full bg-gray-400 border-2 border-white"></div>
											<span class="text-[10px] text-gray-500">Created</span>
											<span class="text-[10px] text-gray-400">{formatDateTime(scan.createdAt)}</span>
										</div>

										<!-- Sent -->
										{#if scan.syncStatus === 'SENT' || scan.syncStatus === 'CONFIRMED'}
											<div class="relative flex items-center gap-2">
												<div class="absolute left-[-11px] w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white"></div>
												<span class="text-[10px] text-gray-500">Sent to ProfitSystems</span>
												{#if scan.syncedToRvAt}
													<span class="text-[10px] text-gray-400">{formatDateTime(scan.syncedToRvAt)}</span>
												{/if}
											</div>
										{/if}

										<!-- Confirmed -->
										{#if scan.syncStatus === 'CONFIRMED'}
											<div class="relative flex items-center gap-2">
												<div class="absolute left-[-11px] w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white"></div>
												<span class="text-[10px] text-emerald-600 font-medium">Confirmed in RETAILvantage</span>
												{#if scan.syncedToRvAt}
													<span class="text-[10px] text-gray-400">{formatDateTime(scan.syncedToRvAt)}</span>
												{/if}
											</div>
										{/if}

										<!-- Pending (waiting) -->
										{#if scan.syncStatus === 'PENDING'}
											<div class="relative flex items-center gap-2">
												<div class="absolute left-[-11px] w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse border-2 border-white"></div>
												<span class="text-[10px] text-amber-600">Waiting to sync...</span>
											</div>
										{/if}

										<!-- Failed -->
										{#if scan.syncStatus === 'FAILED'}
											<div class="relative flex items-center gap-2">
												<div class="absolute left-[-11px] w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white"></div>
												<span class="text-[10px] text-red-600 font-medium">Sync failed</span>
											</div>
										{/if}
									</div>
								</div>

								<!-- Retry button for failed -->
								{#if scan.syncStatus === 'FAILED'}
									<button
										type="button"
										onclick={(e) => { e.stopPropagation(); retryScan(scan.id); }}
										disabled={retryingScanId === scan.id}
										class="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 active:bg-red-700 rounded-xl py-2.5 transition-colors disabled:opacity-50"
									>
										{#if retryingScanId === scan.id}
											<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
												<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
												<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
											Retrying...
										{:else}
											<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
												<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
											</svg>
											Retry Sync
										{/if}
									</button>
								{/if}
							</div>
						{/if}
					</button>
				{/each}

				{#if loadingMore}
					<div class="flex justify-center py-4">
						<svg class="w-5 h-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
					</div>
				{/if}

				{#if scans.length === 0}
					<div class="text-center py-12">
						<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
						</svg>
						<p class="text-sm text-gray-400 font-medium">No scans found</p>
						<p class="text-xs text-gray-300 mt-1">Try changing your filters or search</p>
					</div>
				{/if}

				{#if !hasMore && scans.length > 0 && !loading}
					<p class="text-center text-xs text-gray-300 py-3">End of results</p>
				{/if}
			</div>
		{/if}
	</div>
</div>
