<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';

	let { data, children } = $props();
	let currentPath = $derived($page.url.pathname);
	let isLoginPage = $derived(currentPath === '/login');
	let isMobile = $state(true);

	onMount(() => {
		function checkMobile() {
			isMobile = window.innerWidth < 1024;
		}
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	});

	$effect(() => {
		if (!data.user && !isLoginPage) {
			goto('/login');
		}
	});

	const navItems = [
		{ label: 'Dashboard', href: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
		{ label: 'Receive', href: '/receive', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
		{ label: 'Scan', href: '/scan', icon: 'M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M3 17v2a2 2 0 002 2h2M17 21h2a2 2 0 002-2v-2M7 12h10' },
		{ label: 'Labels', href: '/labels', icon: 'M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z' },
		{ label: 'History', href: '/history', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
		{ label: 'Admin', href: '/admin', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
	];

	function isActive(href: string): boolean {
		if (href === '/') return currentPath === '/';
		return currentPath.startsWith(href);
	}
</script>

<svelte:head>
	<title>BarcodeFlow</title>
</svelte:head>

{#if isLoginPage}
	{@render children()}
{:else if data.user}
	{#if isMobile}
		<!-- Mobile: bottom nav -->
		<main class="pb-32">
			{@render children()}
		</main>
		<BottomNav {currentPath} />
	{:else}
		<!-- Desktop: sidebar + main area -->
		<div class="flex min-h-dvh">
			<!-- Sidebar -->
			<aside class="w-60 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
				<!-- Logo -->
				<div class="h-16 px-5 flex items-center gap-3 border-b border-gray-100">
					<div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h1v16H3V4zm3 0h1v16H6V4zm3 0h2v16H9V4zm4 0h1v16h-1V4zm3 0h2v16h-2V4zm4 0h1v16h-1V4z" />
						</svg>
					</div>
					<span class="font-bold text-gray-900">BarcodeFlow</span>
				</div>

				<!-- Nav links -->
				<nav class="flex-1 py-3 px-3 space-y-1">
					{#each navItems as item}
						<a
							href={item.href}
							class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
								{isActive(item.href)
									? 'bg-primary/10 text-primary'
									: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
							</svg>
							{item.label}
						</a>
					{/each}
				</nav>

				<!-- User info -->
				<div class="border-t border-gray-100 px-4 py-3">
					<div class="flex items-center gap-3">
						<div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
							{data.user.name.charAt(0).toUpperCase()}
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-gray-900 truncate">{data.user.name}</p>
							<p class="text-xs text-gray-400 truncate">{data.user.building?.name ?? 'No building'}</p>
						</div>
					</div>
				</div>
			</aside>

			<!-- Main content -->
			<main class="flex-1 overflow-y-auto bg-gray-50">
				<div class="max-w-5xl mx-auto">
					{@render children()}
				</div>
			</main>
		</div>
	{/if}
{/if}
