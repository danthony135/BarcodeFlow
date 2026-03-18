<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let { data } = $props();
	let user = $derived(data.user);
	let isAdmin = $derived(user?.role === 'ADMIN' || user?.role === 'MANAGER');
	let darkMode = $state(false);
	let loggingOut = $state(false);

	onMount(() => {
		darkMode = document.body.classList.contains('dark');
	});

	function toggleDarkMode() {
		darkMode = !darkMode;
		document.body.classList.toggle('dark', darkMode);
		localStorage.setItem('barcodeflow-dark', darkMode ? '1' : '0');
	}

	async function logout() {
		loggingOut = true;
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			await goto('/login');
		} catch {
			loggingOut = false;
		}
	}

	const adminCards = [
		{
			label: 'Buildings',
			href: '/admin/buildings',
			icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />`,
			color: 'bg-blue-50 text-blue-600'
		},
		{
			label: 'Users',
			href: '/admin/users',
			icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />`,
			color: 'bg-purple-50 text-purple-600'
		},
		{
			label: 'Printers',
			href: '/admin/printers',
			icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />`,
			color: 'bg-amber-50 text-amber-600'
		},
		{
			label: 'Sync Status',
			href: '/admin/sync',
			icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />`,
			color: 'bg-emerald-50 text-emerald-600'
		}
	];
</script>

<div class="page-enter p-4 space-y-6">
	<h1 class="text-xl font-bold text-gray-900">Settings</h1>

	<!-- Admin section -->
	{#if isAdmin}
		<div>
			<h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Administration</h2>
			<div class="grid grid-cols-2 gap-3">
				{#each adminCards as card}
					<a
						href={card.href}
						class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center gap-2 active:bg-gray-50 transition-colors"
					>
						<div class="w-12 h-12 rounded-xl {card.color} flex items-center justify-center">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								{@html card.icon}
							</svg>
						</div>
						<span class="text-sm font-medium text-gray-700">{card.label}</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Account section -->
	<div>
		<h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Account</h2>
		<div class="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
			<!-- User info -->
			<div class="px-4 py-4 flex items-center gap-3">
				<div class="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
					<span class="text-lg font-bold text-primary">{user?.name?.charAt(0).toUpperCase() ?? '?'}</span>
				</div>
				<div class="flex-1 min-w-0">
					<p class="text-sm font-medium text-gray-900">{user?.name ?? 'Unknown'}</p>
					<p class="text-xs text-gray-500">
						{user?.building?.name ?? 'No building'}
						<span class="text-gray-300 mx-1">&middot;</span>
						{user?.role ?? 'WORKER'}
					</p>
				</div>
			</div>

			<!-- Dark mode toggle -->
			<div class="px-4 py-3 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
					</svg>
					<span class="text-sm text-gray-700">Dark Mode</span>
				</div>
				<button
					type="button"
					onclick={toggleDarkMode}
					class="relative w-11 h-6 rounded-full transition-colors {darkMode ? 'bg-primary' : 'bg-gray-200'}"
					role="switch"
					aria-checked={darkMode}
				>
					<span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform {darkMode ? 'translate-x-5' : ''}"></span>
				</button>
			</div>
		</div>
	</div>

	<!-- Logout -->
	<button
		type="button"
		onclick={logout}
		disabled={loggingOut}
		class="w-full h-12 bg-red-50 text-red-600 font-semibold text-sm rounded-xl border border-red-100 active:bg-red-100 transition-colors disabled:opacity-50"
	>
		{loggingOut ? 'Logging out...' : 'Log Out'}
	</button>

	<!-- Version -->
	<p class="text-center text-xs text-gray-300">BarcodeFlow v0.1.0</p>
</div>
