<script lang="ts">
	import { goto } from '$app/navigation';
	import PinPad from '$lib/components/PinPad.svelte';

	let error = $state('');
	let loading = $state(false);

	async function handlePinSubmit(pin: string) {
		error = '';
		loading = true;

		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ pin })
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
	<div class="flex flex-col items-center gap-2 mb-10">
		<div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-1">
			<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h1v16H3V4zm3 0h1v16H6V4zm3 0h2v16H9V4zm4 0h1v16h-1V4zm3 0h2v16h-2V4zm4 0h1v16h-1V4z" />
			</svg>
		</div>
		<h1 class="text-2xl font-bold text-gray-900">BarcodeFlow</h1>
		<p class="text-sm text-gray-500">Enter your PIN</p>
	</div>

	<!-- Pin pad -->
	<PinPad {error} {loading} onSubmit={handlePinSubmit} />
</div>
