<script lang="ts">
	import { goto } from '$app/navigation';
	import PinPad from '$lib/components/PinPad.svelte';
	import { onMount } from 'svelte';

	interface LoginUser {
		id: string;
		name: string;
		role: string;
		building: { name: string } | null;
	}

	let users = $state<LoginUser[]>([]);
	let selectedUserId = $state<string | null>(null);
	let error = $state('');
	let loading = $state(false);

	onMount(async () => {
		try {
			const res = await fetch('/api/auth/users');
			if (res.ok) {
				users = await res.json();
			}
		} catch {
			// Silently fail — user can still type ID
		}
	});

	async function handlePinSubmit(pin: string) {
		if (!selectedUserId) {
			error = 'Select your name first';
			return;
		}

		error = '';
		loading = true;

		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: selectedUserId, pin })
			});

			const data = await res.json();

			if (res.ok && data.success) {
				await goto('/');
			} else {
				error = data.message || 'Invalid PIN';
				loading = false;
			}
		} catch {
			error = 'Connection error';
			loading = false;
		}
	}
</script>

<div class="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-gray-50">
	<!-- Header -->
	<div class="flex flex-col items-center gap-2 mb-8">
		<!-- Barcode icon -->
		<div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-1">
			<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h1v16H3V4zm3 0h1v16H6V4zm3 0h2v16H9V4zm4 0h1v16h-1V4zm3 0h2v16h-2V4zm4 0h1v16h-1V4z" />
			</svg>
		</div>
		<h1 class="text-2xl font-bold text-gray-900">BarcodeFlow</h1>
		<p class="text-sm text-gray-500">Scan to start your day</p>
	</div>

	<!-- User selector -->
	{#if users.length > 0}
		<div class="w-full max-w-xs mb-6">
			<p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 text-center">Who are you?</p>
			<div class="flex flex-col gap-2">
				{#each users as user}
					<button
						type="button"
						class="flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 transition-all text-left
							{selectedUserId === user.id
								? 'border-primary bg-primary/5 shadow-sm'
								: 'border-gray-200 bg-white hover:border-gray-300'}"
						onclick={() => { selectedUserId = user.id; error = ''; }}
					>
						<div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
							{selectedUserId === user.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}">
							{user.name.charAt(0).toUpperCase()}
						</div>
						<div class="flex-1 min-w-0">
							<div class="font-medium text-gray-900 text-sm">{user.name}</div>
							{#if user.building}
								<div class="text-xs text-gray-400">{user.building.name}</div>
							{/if}
						</div>
						{#if selectedUserId === user.id}
							<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
							</svg>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Pin pad -->
	{#if selectedUserId}
		<div class="w-full max-w-xs">
			<p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4 text-center">Enter your PIN</p>
			<PinPad {error} {loading} onSubmit={handlePinSubmit} />
		</div>
	{:else if users.length > 0}
		<p class="text-sm text-gray-400 mt-2">Select your name above to continue</p>
	{/if}
</div>
