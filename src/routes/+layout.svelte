<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { data, children } = $props();
	let currentPath = $derived($page.url.pathname);
	let isLoginPage = $derived(currentPath === '/login');

	$effect(() => {
		if (!data.user && !isLoginPage) {
			goto('/login');
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if isLoginPage}
	{@render children()}
{:else if data.user}
	<main class="pb-32">
		{@render children()}
	</main>
	<BottomNav {currentPath} />
{/if}
