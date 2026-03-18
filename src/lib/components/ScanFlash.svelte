<script lang="ts">
	let {
		type,
		message,
		detail = ''
	}: {
		type: 'success' | 'error';
		message: string;
		detail?: string;
	} = $props();

	let visible = $state(true);

	$effect(() => {
		const timer = setTimeout(() => {
			visible = false;
		}, 600);
		return () => clearTimeout(timer);
	});
</script>

{#if visible}
	<div class="scan-flash {type}">
		<!-- Icon -->
		{#if type === 'success'}
			<svg xmlns="http://www.w3.org/2000/svg" class="w-24 h-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
			</svg>
		{:else}
			<svg xmlns="http://www.w3.org/2000/svg" class="w-24 h-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
			</svg>
		{/if}

		<!-- Message -->
		<p class="text-2xl font-bold">{message}</p>

		<!-- Detail -->
		{#if detail}
			<p class="text-lg opacity-80 mt-1">{detail}</p>
		{/if}
	</div>
{/if}
