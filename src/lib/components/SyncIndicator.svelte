<script lang="ts">
	let { pendingCount }: { pendingCount: number } = $props();
</script>

<div class="inline-flex items-center gap-1.5 text-xs font-medium">
	{#if pendingCount === 0}
		<span class="w-2 h-2 rounded-full bg-primary"></span>
		<span class="text-gray-500">Synced</span>
	{:else}
		<span class="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
		<span class="text-warning">{pendingCount} pending</span>
	{/if}
</div>
