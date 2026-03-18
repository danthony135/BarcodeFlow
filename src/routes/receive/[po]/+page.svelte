<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import ScannerCamera from '$lib/components/ScannerCamera.svelte';
	import ScanFlash from '$lib/components/ScanFlash.svelte';

	let poNumber = $derived($page.params.po ?? '');

	let po = $state<{ vendor: string; totalItems: number }>({ vendor: '', totalItems: 0 });
	let flash = $state<{ type: 'success' | 'error'; message: string; detail: string } | null>(null);

	// PO line items
	interface PoLine {
		id: string;
		sku: string;
		description: string | null;
		qtyOrdered: number;
		qtyReceived: number;
		barcode: string | null;
		scannedQty: number; // local scan count this session
	}

	let poLines = $state<PoLine[]>([]);
	let linesLoading = $state(true);

	// Label printing
	let selectedLineIds = $state<Set<string>>(new Set());
	let labelQtys = $state<Record<string, number>>({});

	const sampleLines: Record<string, { vendor: string; lines: Omit<PoLine, 'scannedQty'>[] }> = {
		'PO-4521': {
			vendor: 'Ashley Furniture',
			lines: [
				{ id: '1', sku: '8721338', description: 'Altari Sofa - Slate', qtyOrdered: 2, qtyReceived: 0, barcode: '8721338' },
				{ id: '2', sku: '8721335', description: 'Altari Loveseat - Slate', qtyOrdered: 2, qtyReceived: 0, barcode: '8721335' },
				{ id: '3', sku: '8721320', description: 'Altari Ottoman - Slate', qtyOrdered: 3, qtyReceived: 0, barcode: '8721320' },
				{ id: '4', sku: '8721317', description: 'Altari Chair - Slate', qtyOrdered: 4, qtyReceived: 0, barcode: '8721317' },
				{ id: '5', sku: '8721355', description: 'Altari Sleeper - Slate', qtyOrdered: 4, qtyReceived: 0, barcode: '8721355' }
			]
		},
		'PO-4518': {
			vendor: 'Serta Simmons',
			lines: [
				{ id: '6', sku: 'SRT-500QN', description: 'iComfort Queen Mattress', qtyOrdered: 3, qtyReceived: 2, barcode: 'SRT500QN' },
				{ id: '7', sku: 'SRT-500KG', description: 'iComfort King Mattress', qtyOrdered: 3, qtyReceived: 2, barcode: 'SRT500KG' },
				{ id: '8', sku: 'SRT-FNDQN', description: 'Foundation Queen', qtyOrdered: 1, qtyReceived: 1, barcode: 'SRTFNDQN' }
			]
		},
		'PO-4515': {
			vendor: 'La-Z-Boy',
			lines: [
				{ id: '9', sku: 'LZB-330', description: 'Greyson Recliner - Charcoal', qtyOrdered: 6, qtyReceived: 5, barcode: 'LZB330' },
				{ id: '10', sku: 'LZB-440', description: 'Trouper Reclining Sofa', qtyOrdered: 4, qtyReceived: 4, barcode: 'LZB440' },
				{ id: '11', sku: 'LZB-550', description: 'Pinnacle Recliner', qtyOrdered: 6, qtyReceived: 6, barcode: 'LZB550' },
				{ id: '12', sku: 'LZB-660', description: 'Morrison Reclining Loveseat', qtyOrdered: 6, qtyReceived: 5, barcode: 'LZB660' }
			]
		}
	};

	onMount(() => {
		fetchPoLines();
	});

	async function fetchPoLines() {
		linesLoading = true;
		try {
			const res = await fetch(`/api/pos/${encodeURIComponent(poNumber)}/lines`);
			if (res.ok) {
				const data = await res.json();
				if (data.lines && data.lines.length > 0) {
					poLines = data.lines.map((l: any) => ({ ...l, scannedQty: 0 }));
					po = { vendor: data.vendor ?? '', totalItems: data.lines.length };
					initLabelQtys();
					linesLoading = false;
					return;
				}
			}
		} catch {}

		// Fallback sample data
		const sample = sampleLines[poNumber];
		if (sample) {
			poLines = sample.lines.map((l) => ({ ...l, scannedQty: 0 }));
			po = { vendor: sample.vendor, totalItems: sample.lines.length };
		} else {
			poLines = [];
			po = { vendor: 'Unknown', totalItems: 0 };
		}
		initLabelQtys();
		linesLoading = false;
	}

	function initLabelQtys() {
		for (const line of poLines) {
			labelQtys[line.id] = 1;
		}
	}

	// Scanning
	function handleScan(barcode: string) {
		// Try to match barcode to a line item
		const matchedLine = poLines.find(
			(l) => l.barcode === barcode || l.sku === barcode || l.sku.replace(/-/g, '') === barcode
		);

		if (matchedLine) {
			matchedLine.scannedQty += 1;
			poLines = [...poLines];
			flash = { type: 'success', message: 'Scanned', detail: `${matchedLine.sku} — ${matchedLine.description ?? ''}` };
		} else {
			flash = { type: 'error', message: 'Not on PO', detail: barcode };
		}

		setTimeout(() => { flash = null; }, 700);
	}

	let totalScanned = $derived(poLines.reduce((sum, l) => sum + l.scannedQty, 0));
	let totalOrdered = $derived(poLines.reduce((sum, l) => sum + l.qtyOrdered, 0));

	// Label selection
	function toggleLine(id: string) {
		const next = new Set(selectedLineIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedLineIds = next;
	}

	function selectAll() {
		selectedLineIds = new Set(poLines.map((l) => l.id));
	}

	function deselectAll() {
		selectedLineIds = new Set();
	}

	let selectedCount = $derived(selectedLineIds.size);
	let totalLabelCount = $derived(
		poLines
			.filter((l) => selectedLineIds.has(l.id))
			.reduce((sum, l) => sum + (labelQtys[l.id] ?? 1), 0)
	);

	function printLabels() {
		const selected = poLines.filter((l) => selectedLineIds.has(l.id));
		if (selected.length === 0) return;

		const today = new Date().toLocaleDateString();
		let labelsHtml = '';

		for (const line of selected) {
			const qty = labelQtys[line.id] ?? 1;
			const barcodeVal = line.barcode ?? line.sku;
			for (let i = 0; i < qty; i++) {
				labelsHtml += `
					<div style="width:4in; height:2in; border:1px dashed #ccc; padding:0.15in; box-sizing:border-box; page-break-inside:avoid; display:flex; flex-direction:column; justify-content:space-between; margin:0.05in;">
						<div style="display:flex; justify-content:space-between; align-items:flex-start;">
							<div>
								<div style="font-weight:bold; font-size:14px;">${line.sku}</div>
								<div style="font-size:11px; color:#444; max-width:2.4in; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${line.description ?? ''}</div>
							</div>
							<div style="text-align:right; font-size:9px; color:#888;">
								<div>PO #${poNumber}</div>
								<div>${today}</div>
							</div>
						</div>
						<div style="text-align:center; margin:0.05in 0;">
							<img src="/api/barcode/${encodeURIComponent(barcodeVal)}.svg" style="height:0.6in; max-width:100%;" alt="${barcodeVal}" />
						</div>
						<div style="text-align:center; font-family:monospace; font-size:12px; letter-spacing:1px;">${barcodeVal}</div>
					</div>`;
			}
		}

		const printWindow = window.open('', '_blank', 'width=800,height=600');
		if (!printWindow) return;
		printWindow.document.write(`<!DOCTYPE html><html><head><title>Labels - PO #${poNumber}</title>
			<style>@page{margin:0.25in}body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.labels-grid{display:flex;flex-wrap:wrap;align-items:flex-start}@media print{.label{border-color:transparent!important}}</style>
			</head><body><div class="labels-grid">${labelsHtml}</div>
			<script>const imgs=document.querySelectorAll('img');let loaded=0;const total=imgs.length;if(!total){window.print()}else{imgs.forEach(img=>{img.onload=img.onerror=()=>{loaded++;if(loaded>=total)window.print()};if(img.complete){loaded++;if(loaded>=total)window.print()}})}<\/script></body></html>`);
		printWindow.document.close();
	}
</script>

<div class="page-enter p-4 space-y-4">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<a
			href="/receive"
			class="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200 transition-colors flex-shrink-0"
			aria-label="Back"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</a>
		<div class="flex-1 min-w-0">
			<h1 class="text-lg font-bold text-gray-900 truncate">PO #{poNumber}</h1>
			<p class="text-sm text-gray-500">{po.vendor}</p>
		</div>
		<!-- Print selected button (top right) -->
		{#if selectedCount > 0}
			<button
				type="button"
				onclick={printLabels}
				class="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm font-semibold rounded-lg active:opacity-80 transition-opacity"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
				</svg>
				Print ({totalLabelCount})
			</button>
		{/if}
	</div>

	<!-- Scanner -->
	<ScannerCamera onScan={handleScan} />

	<!-- Running count -->
	<div class="flex items-center justify-between bg-primary/5 rounded-xl px-4 py-3">
		<span class="text-sm font-medium text-gray-700">Scanned this session</span>
		<span class="text-lg font-bold text-primary">{totalScanned} <span class="text-sm font-normal text-gray-400">of {totalOrdered}</span></span>
	</div>

	<!-- Select / Deselect controls for printing -->
	<div class="flex items-center justify-between">
		<span class="text-xs text-gray-400">{selectedCount} selected for printing</span>
		<div class="flex gap-2">
			<button
				type="button"
				onclick={selectAll}
				class="px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-lg active:bg-primary/20 transition-colors"
			>
				Select All
			</button>
			{#if selectedCount > 0}
				<button
					type="button"
					onclick={deselectAll}
					class="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-lg active:bg-gray-200 transition-colors"
				>
					Clear
				</button>
			{/if}
		</div>
	</div>

	<!-- Line items list -->
	{#if linesLoading}
		<div class="space-y-2">
			{#each [1, 2, 3] as _}
				<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
					<div class="h-4 w-24 bg-gray-100 rounded animate-pulse"></div>
					<div class="h-3 w-48 bg-gray-50 rounded animate-pulse mt-2"></div>
				</div>
			{/each}
		</div>
	{:else if poLines.length === 0}
		<div class="text-center py-12">
			<p class="text-sm text-gray-400">No line items found for this PO</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each poLines as line}
				{@const isSelected = selectedLineIds.has(line.id)}
				{@const isFullyReceived = (line.qtyReceived + line.scannedQty) >= line.qtyOrdered}
				<div
					class="bg-white rounded-xl shadow-sm border px-4 py-3 transition-colors
						{isFullyReceived ? 'border-primary/30 bg-primary/5' : isSelected ? 'border-blue-300 bg-blue-50/30' : 'border-gray-100'}"
				>
					<div class="flex items-center gap-3">
						<!-- Print checkbox -->
						<button
							type="button"
							onclick={() => toggleLine(line.id)}
							class="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
								{isSelected ? 'bg-primary border-primary' : 'border-gray-300 bg-white'}"
							aria-label="Select for printing"
						>
							{#if isSelected}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
								</svg>
							{/if}
						</button>

						<!-- Item info -->
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<p class="text-sm font-mono font-bold text-gray-900">{line.sku}</p>
								{#if isFullyReceived}
									<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">Complete</span>
								{/if}
							</div>
							<p class="text-sm text-gray-500 truncate">{line.description ?? 'No description'}</p>
							<div class="flex items-center gap-3 mt-1">
								<span class="text-xs text-gray-400">Ordered: <span class="font-medium text-gray-600">{line.qtyOrdered}</span></span>
								<span class="text-xs text-gray-400">Received: <span class="font-medium text-gray-600">{line.qtyReceived}</span></span>
								{#if line.scannedQty > 0}
									<span class="text-xs font-medium text-primary">+{line.scannedQty} scanned</span>
								{/if}
							</div>
						</div>

						<!-- Label qty (when selected) -->
						{#if isSelected}
							<div class="flex flex-col items-center gap-0.5 flex-shrink-0">
								<span class="text-[10px] text-gray-400">Qty</span>
								<input
									type="number"
									min="1"
									max="99"
									bind:value={labelQtys[line.id]}
									class="w-12 h-7 text-center text-xs font-medium border border-gray-200 rounded-lg outline-none focus:border-primary"
								/>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Finish Receiving -->
	{#if totalScanned > 0}
		<button
			type="button"
			class="w-full h-14 bg-primary text-white font-semibold text-base rounded-xl shadow-sm active:bg-primary-dark transition-colors"
		>
			Finish Receiving ({totalScanned} items)
		</button>
	{/if}
</div>

<!-- Scan Flash -->
{#if flash}
	<ScanFlash type={flash.type} message={flash.message} detail={flash.detail} />
{/if}
