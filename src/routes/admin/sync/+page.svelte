<script lang="ts">
	import { onMount } from 'svelte';

	type SyncItem = {
		id: string;
		direction: 'TO_RV' | 'FROM_RV';
		entityType: string;
		status: 'PENDING' | 'SENT' | 'CONFIRMED' | 'FAILED';
		attempts: number;
		error: string | null;
		createdAt: string;
		processedAt: string | null;
	};

	let lastSyncTime = $state<string | null>(null);
	let pendingToRv = $state(0);
	let pendingFromRv = $state(0);
	let failedCount = $state(0);
	let connected = $state(false);
	let syncItems = $state<SyncItem[]>([]);
	let loading = $state(true);
	let retrying = $state(false);
	let forcing = $state(false);

	const statusBadge: Record<string, string> = {
		PENDING: 'bg-amber-100 text-amber-700',
		SENT: 'bg-blue-100 text-blue-700',
		CONFIRMED: 'bg-emerald-100 text-emerald-700',
		FAILED: 'bg-red-100 text-red-700'
	};

	const dirLabel: Record<string, string> = {
		TO_RV: 'To RV',
		FROM_RV: 'From RV'
	};

	onMount(() => {
		// Sample data — replace with API calls
		lastSyncTime = new Date(Date.now() - 12 * 60 * 1000).toLocaleString();
		pendingToRv = 3;
		pendingFromRv = 1;
		failedCount = 2;
		connected = false;

		syncItems = [
			{ id: '1', direction: 'TO_RV', entityType: 'Scan', status: 'CONFIRMED', attempts: 1, error: null, createdAt: new Date(Date.now() - 5 * 60000).toISOString(), processedAt: new Date(Date.now() - 4 * 60000).toISOString() },
			{ id: '2', direction: 'TO_RV', entityType: 'Scan', status: 'PENDING', attempts: 0, error: null, createdAt: new Date(Date.now() - 3 * 60000).toISOString(), processedAt: null },
			{ id: '3', direction: 'FROM_RV', entityType: 'PO', status: 'SENT', attempts: 1, error: null, createdAt: new Date(Date.now() - 10 * 60000).toISOString(), processedAt: null },
			{ id: '4', direction: 'TO_RV', entityType: 'Scan', status: 'FAILED', attempts: 3, error: 'Connection timeout to on-prem server', createdAt: new Date(Date.now() - 30 * 60000).toISOString(), processedAt: null },
			{ id: '5', direction: 'TO_RV', entityType: 'Label', status: 'FAILED', attempts: 2, error: 'RV API returned 500', createdAt: new Date(Date.now() - 45 * 60000).toISOString(), processedAt: null },
			{ id: '6', direction: 'FROM_RV', entityType: 'PO', status: 'CONFIRMED', attempts: 1, error: null, createdAt: new Date(Date.now() - 60 * 60000).toISOString(), processedAt: new Date(Date.now() - 58 * 60000).toISOString() },
			{ id: '7', direction: 'TO_RV', entityType: 'Scan', status: 'PENDING', attempts: 0, error: null, createdAt: new Date(Date.now() - 2 * 60000).toISOString(), processedAt: null },
			{ id: '8', direction: 'FROM_RV', entityType: 'Item', status: 'PENDING', attempts: 0, error: null, createdAt: new Date(Date.now() - 1 * 60000).toISOString(), processedAt: null }
		];

		loading = false;
	});

	function formatTime(iso: string) {
		const d = new Date(iso);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffMin = Math.floor(diffMs / 60000);
		if (diffMin < 1) return 'just now';
		if (diffMin < 60) return `${diffMin}m ago`;
		const diffHr = Math.floor(diffMin / 60);
		if (diffHr < 24) return `${diffHr}h ago`;
		return d.toLocaleDateString();
	}

	async function retryFailed() {
		retrying = true;
		// TODO: POST /api/admin/sync/retry
		await new Promise((r) => setTimeout(r, 1000));
		retrying = false;
	}

	async function forceSync() {
		forcing = true;
		// TODO: POST /api/admin/sync/force
		await new Promise((r) => setTimeout(r, 1500));
		forcing = false;
	}
</script>

<div class="page-enter p-4 space-y-4">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<a href="/admin" class="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 active:bg-gray-200 transition-colors">
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</a>
		<h1 class="text-xl font-bold text-gray-900">Sync Status</h1>
	</div>

	<!-- Connection Status -->
	<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<span class="relative flex h-3 w-3">
					{#if connected}
						<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
						<span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
					{:else}
						<span class="relative inline-flex rounded-full h-3 w-3 bg-red-400"></span>
					{/if}
				</span>
				<div>
					<p class="text-sm font-semibold text-gray-900">{connected ? 'Connected' : 'Disconnected'}</p>
					<p class="text-xs text-gray-500">On-prem RETAILvantage server</p>
				</div>
			</div>
			{#if lastSyncTime}
				<div class="text-right">
					<p class="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Last Sync</p>
					<p class="text-xs text-gray-600">{lastSyncTime}</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-3 gap-3">
		<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
			<p class="text-2xl font-bold text-amber-600">{pendingToRv}</p>
			<p class="text-[10px] text-gray-500 font-medium mt-0.5">Pending to RV</p>
		</div>
		<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
			<p class="text-2xl font-bold text-blue-600">{pendingFromRv}</p>
			<p class="text-[10px] text-gray-500 font-medium mt-0.5">Pending from RV</p>
		</div>
		<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
			<p class="text-2xl font-bold text-red-600">{failedCount}</p>
			<p class="text-[10px] text-gray-500 font-medium mt-0.5">Failed</p>
		</div>
	</div>

	<!-- Actions -->
	<div class="flex gap-3">
		<button
			type="button"
			onclick={retryFailed}
			disabled={retrying || failedCount === 0}
			class="flex-1 h-11 bg-red-50 text-red-600 text-sm font-semibold rounded-xl border border-red-100 active:bg-red-100 transition-colors disabled:opacity-50"
		>
			{retrying ? 'Retrying...' : 'Retry Failed'}
		</button>
		<button
			type="button"
			onclick={forceSync}
			disabled={forcing}
			class="flex-1 h-11 bg-primary text-white text-sm font-semibold rounded-xl active:opacity-80 transition-opacity disabled:opacity-50"
		>
			{forcing ? 'Syncing...' : 'Force Sync Now'}
		</button>
	</div>

	<!-- Queue Items -->
	<div>
		<h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Queue Items</h2>
		{#if loading}
			<div class="space-y-2">
				{#each [1, 2, 3] as _}
					<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
						<div class="h-4 w-48 bg-gray-100 rounded animate-pulse"></div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
				{#each syncItems as item (item.id)}
					<div class="px-4 py-3">
						<div class="flex items-center gap-2">
							<span class="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide {statusBadge[item.status]}">
								{item.status}
							</span>
							<span class="text-xs text-gray-400">{dirLabel[item.direction]}</span>
							<span class="text-xs font-medium text-gray-700">{item.entityType}</span>
							<span class="ml-auto text-xs text-gray-400">{formatTime(item.createdAt)}</span>
						</div>
						{#if item.error}
							<p class="text-xs text-red-500 mt-1 truncate">{item.error}</p>
						{/if}
						{#if item.attempts > 1}
							<p class="text-[10px] text-gray-400 mt-0.5">{item.attempts} attempts</p>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
