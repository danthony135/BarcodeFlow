<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import SyncIndicator from '$lib/components/SyncIndicator.svelte';

	let { data } = $props();

	let greeting = $derived((() => {
		const hour = new Date().getHours();
		if (hour < 12) return 'Good morning';
		if (hour < 17) return 'Good afternoon';
		return 'Good evening';
	})());

	// Placeholder stats
	let stats = $state({
		todayScans: 23,
		pendingSync: 2,
		openPOs: 5,
		labelsPrinted: 14
	});

	let recentActivity = $state<any[]>([]);
	let loadingStats = $state(true);

	onMount(async () => {
		// TODO: fetch from /api/stats and /api/scans?limit=10 when endpoints exist
		// For now, simulate a brief load with placeholder data
		setTimeout(() => {
			loadingStats = false;
		}, 300);
	});

	const statCards = $derived([
		{ label: "Today's Scans", value: stats.todayScans, color: 'border-l-emerald-500', textColor: 'text-emerald-600' },
		{ label: 'Pending Sync', value: stats.pendingSync, color: 'border-l-amber-500', textColor: 'text-amber-600' },
		{ label: 'Open POs', value: stats.openPOs, color: 'border-l-blue-500', textColor: 'text-blue-600' },
		{ label: 'Labels Printed', value: stats.labelsPrinted, color: 'border-l-purple-500', textColor: 'text-purple-600' }
	]);
</script>

<div class="page-enter p-4 space-y-6">
	<!-- Header -->
	<div class="flex items-start justify-between">
		<div>
			<h1 class="text-xl font-bold text-gray-900">
				{greeting}, {data.user?.name ?? 'User'}
			</h1>
			{#if data.user?.building}
				<p class="text-sm text-gray-500 mt-0.5">{data.user.building.name}</p>
			{/if}
		</div>
		<SyncIndicator pendingCount={stats.pendingSync} />
	</div>

	<!-- Stat Cards -->
	<div class="grid grid-cols-2 gap-3">
		{#each statCards as card}
			<div class="bg-white rounded-xl shadow-sm border border-gray-100 {card.color} border-l-4 p-4">
				<p class="text-3xl font-bold {card.textColor}">
					{#if loadingStats}
						<span class="inline-block w-10 h-8 bg-gray-100 rounded animate-pulse"></span>
					{:else}
						{card.value}
					{/if}
				</p>
				<p class="text-xs text-gray-500 mt-1 font-medium">{card.label}</p>
			</div>
		{/each}
	</div>

	<!-- Recent Activity -->
	<div>
		<h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Recent Activity</h2>
		{#if recentActivity.length === 0}
			<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
				<svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
				</svg>
				<p class="text-sm text-gray-400">No recent activity</p>
				<p class="text-xs text-gray-300 mt-1">Scans will appear here</p>
			</div>
		{:else}
			<div class="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
				{#each recentActivity as scan}
					<div class="flex items-center gap-3 px-4 py-3">
						<span class="text-xs text-gray-400 w-14 flex-shrink-0">{scan.time}</span>
						<span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded
							{scan.type === 'RECEIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}">
							{scan.type}
						</span>
						<span class="text-sm font-mono text-gray-700 truncate">{scan.barcode}</span>
						<span class="text-xs text-gray-400 truncate ml-auto">{scan.description}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
