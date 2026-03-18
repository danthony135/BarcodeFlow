<script lang="ts">
	let { currentPath = '/' }: { currentPath: string } = $props();

	const tabs = [
		{
			label: 'Receive',
			href: '/receive',
			icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>`
		},
		{
			label: 'Labels',
			href: '/labels',
			icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/>`
		},
		{ label: '', href: '', icon: '' }, // placeholder for center scan button
		{
			label: 'History',
			href: '/history',
			icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>`
		},
		{
			label: 'More',
			href: '/admin',
			icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>`
		}
	];

	function isActive(href: string): boolean {
		if (href === '/') return currentPath === '/';
		return currentPath.startsWith(href);
	}
</script>

<nav class="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]" style="padding-bottom: env(safe-area-inset-bottom, 0px);">
	<div class="relative flex items-end justify-around px-2 h-16">
		{#each tabs as tab, i}
			{#if i === 2}
				<!-- Center scan button -->
				<div class="flex flex-col items-center" style="width: 4rem;">
					<a
						href="/scan"
						class="absolute -top-7 flex items-center justify-center w-16 h-16 rounded-full bg-primary text-white shadow-lg active:scale-95 transition-transform"
						aria-label="Scan"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M3 17v2a2 2 0 002 2h2M17 21h2a2 2 0 002-2v-2M7 12h10" />
						</svg>
					</a>
					<span class="text-[10px] text-primary font-semibold mt-1 pb-2">SCAN</span>
				</div>
			{:else}
				<a
					href={tab.href}
					class="flex flex-col items-center justify-center gap-0.5 pt-2 pb-2 px-3 min-w-[4rem] transition-colors {isActive(tab.href) ? 'text-primary' : 'text-gray-400'}"
					aria-label={tab.label}
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						{@html tab.icon}
					</svg>
					<span class="text-[10px] font-medium">{tab.label}</span>
				</a>
			{/if}
		{/each}
	</div>
</nav>

<!-- Spacer to prevent content from being hidden behind nav -->
<div class="h-[var(--bottom-nav-height)]"></div>
