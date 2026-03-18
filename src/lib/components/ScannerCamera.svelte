<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { isMobileDevice } from '$lib/stores/device';

	let {
		onScan,
		autoStart = true
	}: {
		onScan: (barcode: string) => void;
		autoStart?: boolean;
	} = $props();

	let scannerEl: HTMLDivElement | undefined = $state();
	let scanner: any = $state(null);
	let cameraActive = $state(false);
	let cameraError = $state('');
	let isMobile = $state(false);
	let manualValue = $state('');
	let manualInput: HTMLInputElement | undefined = $state();
	let lastScan = $state('');
	let cooldown = $state(false);
	let showCamera = $state(false);
	let scanTimeout: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		isMobile = isMobileDevice();

		if (isMobile && autoStart) {
			showCamera = true;
			startCamera();
		} else {
			// Desktop: auto-focus the input for HID scanner
			setTimeout(() => manualInput?.focus(), 100);
		}

		return () => {
			stopCamera();
		};
	});

	async function startCamera() {
		if (!browser || !scannerEl) return;
		cameraError = '';

		try {
			const { Html5Qrcode } = await import('html5-qrcode');
			scanner = new Html5Qrcode(scannerEl.id);

			await scanner.start(
				{ facingMode: 'environment' },
				{
					fps: 15,
					qrbox: { width: 280, height: 120 },
					aspectRatio: 1.5,
					disableFlip: false
				},
				(decodedText: string) => {
					handleDecode(decodedText);
				},
				() => {}
			);
			cameraActive = true;
		} catch (err: any) {
			console.error('Camera error:', err);
			cameraError = err?.message || 'Could not access camera';
			showCamera = false;
			setTimeout(() => manualInput?.focus(), 100);
		}
	}

	async function stopCamera() {
		if (scanner && cameraActive) {
			try {
				await scanner.stop();
				scanner.clear();
			} catch {}
			cameraActive = false;
		}
	}

	function handleDecode(barcode: string) {
		if (cooldown || barcode === lastScan) return;
		lastScan = barcode;
		cooldown = true;
		onScan(barcode);
		if (navigator.vibrate) navigator.vibrate(100);
		setTimeout(() => { cooldown = false; lastScan = ''; }, 1500);
	}

	function toggleCamera() {
		if (showCamera) {
			stopCamera();
			showCamera = false;
			setTimeout(() => manualInput?.focus(), 100);
		} else {
			showCamera = true;
			// Wait for DOM to render the scanner div
			setTimeout(() => startCamera(), 50);
		}
	}

	// Desktop HID scanner handler - scanners type fast then hit Enter
	function handleInput() {
		if (scanTimeout) clearTimeout(scanTimeout);
		scanTimeout = setTimeout(() => {
			if (manualValue.trim()) {
				onScan(manualValue.trim());
				manualValue = '';
				manualInput?.focus();
			}
		}, 80);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (scanTimeout) clearTimeout(scanTimeout);
			if (manualValue.trim()) {
				onScan(manualValue.trim());
				manualValue = '';
			}
		}
	}

	function refocus() {
		if (!showCamera) {
			manualInput?.focus();
		}
	}
</script>

<div class="w-full space-y-3">
	{#if showCamera}
		<!-- Camera viewfinder (mobile) -->
		<div class="relative w-full rounded-2xl overflow-hidden bg-black aspect-[3/2]">
			<div id="scanner-region" bind:this={scannerEl} class="w-full h-full"></div>

			{#if !cameraActive && !cameraError}
				<div class="absolute inset-0 flex items-center justify-center bg-gray-900">
					<div class="flex flex-col items-center gap-2">
						<svg class="w-8 h-8 text-white/50 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
						</svg>
						<p class="text-white/50 text-sm">Starting camera...</p>
					</div>
				</div>
			{/if}

			{#if cooldown}
				<div class="absolute inset-0 bg-primary/20 pointer-events-none transition-opacity"></div>
			{/if}

			{#if cameraError}
				<div class="absolute inset-0 flex items-center justify-center bg-gray-900 p-4">
					<div class="text-center">
						<svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-red-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
						</svg>
						<p class="text-white/80 text-sm mb-1">Camera unavailable</p>
						<p class="text-white/40 text-xs">{cameraError}</p>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Text input mode (desktop default / mobile fallback) -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="flex gap-2" onclick={refocus}>
			<div class="relative flex-1">
				<input
					bind:this={manualInput}
					bind:value={manualValue}
					oninput={handleInput}
					onkeydown={handleKeydown}
					onblur={() => setTimeout(refocus, 200)}
					type="text"
					inputmode={isMobile ? 'text' : 'none'}
					autocomplete="off"
					autocorrect="off"
					autocapitalize="off"
					spellcheck="false"
					placeholder={isMobile ? 'Type barcode...' : 'Scan barcode with scanner...'}
					class="w-full h-14 px-4 pr-12 text-lg border-2 border-primary rounded-xl bg-white text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
				/>
				<!-- Scanner icon -->
				<svg xmlns="http://www.w3.org/2000/svg" class="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M3 17v2a2 2 0 002 2h2M17 21h2a2 2 0 002-2v-2M7 12h10" />
				</svg>
			</div>
		</div>

		{#if !isMobile}
			<p class="text-xs text-gray-400 text-center">
				Scan a barcode with your USB/Bluetooth scanner — it will be captured automatically
			</p>
		{/if}
	{/if}

	<!-- Mode toggle: only show on mobile, or on desktop if they want to try camera -->
	{#if isMobile}
		<button
			type="button"
			onclick={toggleCamera}
			class="w-full flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-colors
				{showCamera ? 'bg-gray-100 text-gray-600' : 'bg-primary/10 text-primary'}"
		>
			{#if showCamera}
				<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
				</svg>
				Type Manually
			{:else}
				<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
				Switch to Camera
			{/if}
		</button>
	{/if}
</div>

<style>
	:global(#scanner-region video) {
		width: 100% !important;
		height: 100% !important;
		object-fit: cover !important;
		border-radius: 0 !important;
	}
	:global(#scanner-region img[alt="Info icon"]) {
		display: none !important;
	}
	:global(#scanner-region > div) {
		border: none !important;
	}
	:global(#qr-shaded-region) {
		border-color: #10b981 !important;
	}
</style>
