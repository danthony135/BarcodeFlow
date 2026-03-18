<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import ScannerCamera from '$lib/components/ScannerCamera.svelte';
	import ScanFlash from '$lib/components/ScanFlash.svelte';

	let poNumber = $derived($page.params.po ?? '');

	// PO data
	const samplePoData: Record<string, { vendor: string; totalItems: number }> = {
		'4521': { vendor: 'Ashley Furniture', totalItems: 15 },
		'4518': { vendor: 'Serta Simmons', totalItems: 8 },
		'4515': { vendor: 'La-Z-Boy', totalItems: 22 }
	};

	let po = $state<{ vendor: string; totalItems: number }>({ vendor: 'Unknown Vendor', totalItems: 0 });

	// Tab state
	type TabMode = 'scan' | 'print';
	let activeTab = $state<TabMode>('scan');

	// Check URL for ?print=true on mount
	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get('print') === 'true') {
			activeTab = 'print';
		}

		// Set initial PO data from sample
		const pn = poNumber;
		po = (pn && samplePoData[pn]) ? samplePoData[pn] : { vendor: 'Unknown Vendor', totalItems: 0 };

		// Fetch PO lines
		fetchPoLines();
		fetchTemplates();
	});

	// --- Scan tab state ---
	interface ScannedItem {
		barcode: string;
		time: string;
		qty: number;
	}

	let scannedItems = $state<ScannedItem[]>([]);
	let flash = $state<{ type: 'success' | 'error'; message: string; detail: string } | null>(null);

	function handleScan(barcode: string) {
		const existing = scannedItems.find((s) => s.barcode === barcode);
		if (existing) {
			existing.qty += 1;
			scannedItems = [...scannedItems];
			flash = { type: 'success', message: '+1 Qty', detail: barcode };
		} else {
			scannedItems = [
				{
					barcode,
					time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
					qty: 1
				},
				...scannedItems
			];
			flash = { type: 'success', message: 'Scanned', detail: barcode };
		}

		setTimeout(() => {
			flash = null;
		}, 700);
	}

	function addQty(index: number) {
		scannedItems[index].qty += 1;
		scannedItems = [...scannedItems];
	}

	let totalScanned = $derived(scannedItems.reduce((sum, s) => sum + s.qty, 0));

	// --- Print Labels tab state ---
	interface PoLine {
		id: string;
		sku: string;
		description: string | null;
		qtyOrdered: number;
		qtyReceived: number;
		barcode: string | null;
	}

	interface LabelTemplate {
		id: string;
		name: string;
		width: number;
		height: number;
		elements: unknown[];
		isDefault: boolean;
	}

	let poLines = $state<PoLine[]>([]);
	let linesLoading = $state(true);
	let selectedLineIds = $state<Set<string>>(new Set());
	let labelQtys = $state<Record<string, number>>({});
	let templates = $state<LabelTemplate[]>([]);
	let selectedTemplateId = $state<string>('');
	let templatesLoading = $state(true);

	// Sample PO lines fallback
	const sampleLines: Record<string, PoLine[]> = {
		'4521': [
			{ id: '1', sku: 'ASH-1001', description: 'Darcy Sofa - Blue', qtyOrdered: 3, qtyReceived: 0, barcode: '7201001' },
			{ id: '2', sku: 'ASH-1002', description: 'Darcy Loveseat - Blue', qtyOrdered: 2, qtyReceived: 0, barcode: '7201002' },
			{ id: '3', sku: 'ASH-2010', description: 'Bladen Ottoman - Coffee', qtyOrdered: 4, qtyReceived: 0, barcode: '7202010' },
			{ id: '4', sku: 'ASH-3050', description: 'Alenya Chair - Charcoal', qtyOrdered: 3, qtyReceived: 0, barcode: '7203050' },
			{ id: '5', sku: 'ASH-4100', description: 'Calion Sectional - Gunmetal', qtyOrdered: 3, qtyReceived: 0, barcode: '7204100' }
		],
		'4518': [
			{ id: '6', sku: 'SRT-5001', description: 'iComfort CF1000 Queen', qtyOrdered: 2, qtyReceived: 1, barcode: '8105001' },
			{ id: '7', sku: 'SRT-5002', description: 'iComfort CF2000 King', qtyOrdered: 3, qtyReceived: 2, barcode: '8105002' },
			{ id: '8', sku: 'SRT-5010', description: 'Perfect Sleeper Twin', qtyOrdered: 3, qtyReceived: 2, barcode: '8105010' }
		],
		'4515': [
			{ id: '9', sku: 'LZB-7001', description: 'Pinnacle Recliner - Brown', qtyOrdered: 5, qtyReceived: 4, barcode: '9007001' },
			{ id: '10', sku: 'LZB-7002', description: 'Greyson Sofa - Navy', qtyOrdered: 4, qtyReceived: 3, barcode: '9007002' },
			{ id: '11', sku: 'LZB-7010', description: 'Trouper Reclining Sofa', qtyOrdered: 6, qtyReceived: 6, barcode: '9007010' },
			{ id: '12', sku: 'LZB-7015', description: 'James Recliner - Sable', qtyOrdered: 7, qtyReceived: 7, barcode: '9007015' }
		]
	};

	async function fetchPoLines() {
		linesLoading = true;
		try {
			const res = await fetch(`/api/pos/${poNumber}/lines`);
			if (res.ok) {
				const data = await res.json();
				if (data.lines && data.lines.length > 0) {
					poLines = data.lines;
					if (data.vendor) po.vendor = data.vendor;
					// Init label qtys
					for (const line of poLines) {
						labelQtys[line.id] = 1;
					}
					linesLoading = false;
					return;
				}
			}
		} catch {
			// fallback
		}

		// Fallback to sample data
		poLines = sampleLines[poNumber] ?? [];
		for (const line of poLines) {
			labelQtys[line.id] = 1;
		}
		linesLoading = false;
	}

	async function fetchTemplates() {
		templatesLoading = true;
		try {
			const res = await fetch('/api/labels/templates');
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data) && data.length > 0) {
					templates = data;
					const def = templates.find((t) => t.isDefault);
					selectedTemplateId = def ? def.id : templates[0].id;
					templatesLoading = false;
					return;
				}
			}
		} catch {
			// fallback
		}

		// Fallback default template
		templates = [
			{ id: 'default-4x2', name: 'Standard 4" x 2"', width: 4, height: 2, elements: [], isDefault: true },
			{ id: 'default-3x1', name: 'Small 3" x 1"', width: 3, height: 1, elements: [], isDefault: false },
			{ id: 'default-4x3', name: 'Large 4" x 3"', width: 4, height: 3, elements: [], isDefault: false }
		];
		selectedTemplateId = 'default-4x2';
		templatesLoading = false;
	}

	let selectedTemplate = $derived(templates.find((t) => t.id === selectedTemplateId));

	function toggleLine(id: string) {
		const next = new Set(selectedLineIds);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		selectedLineIds = next;
	}

	function selectAll() {
		selectedLineIds = new Set(poLines.map((l) => l.id));
	}

	function deselectAll() {
		selectedLineIds = new Set();
	}

	let previewLine = $derived(poLines.find((l) => selectedLineIds.has(l.id)) ?? null);
	let selectedCount = $derived(selectedLineIds.size);
	let totalLabelCount = $derived(
		poLines
			.filter((l) => selectedLineIds.has(l.id))
			.reduce((sum, l) => sum + (labelQtys[l.id] ?? 1), 0)
	);

	// --- Print functionality ---
	function printLabels() {
		const selected = poLines.filter((l) => selectedLineIds.has(l.id));
		if (selected.length === 0) return;

		const tmpl = selectedTemplate;
		const widthIn = tmpl?.width ?? 4;
		const heightIn = tmpl?.height ?? 2;
		const today = new Date().toLocaleDateString();

		// Build label HTML
		let labelsHtml = '';
		for (const line of selected) {
			const qty = labelQtys[line.id] ?? 1;
			const barcodeVal = line.barcode ?? line.sku;
			for (let i = 0; i < qty; i++) {
				labelsHtml += `
					<div class="label" style="width:${widthIn}in; height:${heightIn}in; border:1px dashed #ccc; padding:0.15in; box-sizing:border-box; page-break-inside:avoid; display:flex; flex-direction:column; justify-content:space-between; margin:0.05in;">
						<div style="display:flex; justify-content:space-between; align-items:flex-start;">
							<div>
								<div style="font-weight:bold; font-size:14px;">${line.sku}</div>
								<div style="font-size:11px; color:#444; max-width:${widthIn * 0.6}in; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${line.description ?? ''}</div>
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
					</div>
				`;
			}
		}

		// Open print window
		const printWindow = window.open('', '_blank', 'width=800,height=600');
		if (!printWindow) return;

		printWindow.document.write(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Labels - PO #${poNumber}</title>
				<style>
					@page { margin: 0.25in; }
					body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
					.labels-grid {
						display: flex;
						flex-wrap: wrap;
						align-items: flex-start;
					}
					@media print {
						body { margin: 0; }
						.label { border-color: transparent !important; }
					}
				</style>
			</head>
			<body>
				<div class="labels-grid">${labelsHtml}</div>
				<script>
					// Wait for barcode images to load, then print
					const imgs = document.querySelectorAll('img');
					let loaded = 0;
					const total = imgs.length;
					if (total === 0) { window.print(); } else {
						imgs.forEach(img => {
							img.onload = img.onerror = () => {
								loaded++;
								if (loaded >= total) window.print();
							};
							if (img.complete) { loaded++; if (loaded >= total) window.print(); }
						});
					}
				<\/script>
			</body>
			</html>
		`);
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
		<div class="min-w-0">
			<h1 class="text-lg font-bold text-gray-900 truncate">PO #{poNumber}</h1>
			<p class="text-sm text-gray-500">{po.vendor}</p>
		</div>
	</div>

	<!-- Tab switcher -->
	<div class="flex gap-1 bg-gray-100 rounded-xl p-1">
		<button
			type="button"
			onclick={() => (activeTab = 'scan')}
			class="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors {activeTab === 'scan'
				? 'bg-white text-gray-900 shadow-sm'
				: 'text-gray-500 hover:text-gray-700'}"
		>
			<span class="flex items-center justify-center gap-1.5">
				<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
				</svg>
				Scan
			</span>
		</button>
		<button
			type="button"
			onclick={() => (activeTab = 'print')}
			class="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors {activeTab === 'print'
				? 'bg-white text-gray-900 shadow-sm'
				: 'text-gray-500 hover:text-gray-700'}"
		>
			<span class="flex items-center justify-center gap-1.5">
				<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
				</svg>
				Print Labels
			</span>
		</button>
	</div>

	<!-- ==================== SCAN TAB ==================== -->
	{#if activeTab === 'scan'}
		<!-- Scanner -->
		<ScannerCamera onScan={handleScan} />

		<!-- Running count -->
		<div class="flex items-center justify-between bg-primary/5 rounded-xl px-4 py-3">
			<span class="text-sm font-medium text-gray-700">Items scanned</span>
			<span class="text-lg font-bold text-primary">{totalScanned} <span class="text-sm font-normal text-gray-400">of {po.totalItems}</span></span>
		</div>

		<!-- Scanned items list -->
		{#if scannedItems.length > 0}
			<div class="space-y-2">
				{#each scannedItems as item, i}
					<div class="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3">
						<!-- Checkmark -->
						<div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
							</svg>
						</div>

						<!-- Info -->
						<div class="flex-1 min-w-0">
							<p class="text-sm font-mono font-medium text-gray-900 truncate">{item.barcode}</p>
							<p class="text-xs text-gray-400">{item.time} &middot; Qty: {item.qty}</p>
						</div>

						<!-- Actions -->
						<button
							type="button"
							onclick={() => addQty(i)}
							class="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg active:bg-gray-200 transition-colors"
						>
							+Qty
						</button>
						<button
							type="button"
							class="px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg active:bg-primary/20 transition-colors"
						>
							Print
						</button>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-center py-8">
				<p class="text-sm text-gray-400">Scan barcodes to start receiving</p>
			</div>
		{/if}

		<!-- Finish button -->
		<button
			type="button"
			class="w-full h-14 bg-primary text-white font-semibold text-base rounded-xl shadow-sm active:bg-primary-dark transition-colors"
		>
			Finish Receiving
		</button>

	<!-- ==================== PRINT LABELS TAB ==================== -->
	{:else}
		{#if linesLoading}
			<div class="text-center py-12">
				<div class="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
				<p class="text-sm text-gray-400 mt-2">Loading PO lines...</p>
			</div>
		{:else if poLines.length === 0}
			<div class="text-center py-12">
				<svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
				</svg>
				<p class="text-sm text-gray-400">No line items found for this PO</p>
			</div>
		{:else}
			<!-- Template selector -->
			<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
				<label for="template-select" class="block text-sm font-medium text-gray-700">Label Template</label>
				{#if templatesLoading}
					<div class="h-10 bg-gray-100 rounded-lg animate-pulse"></div>
				{:else}
					<select
						id="template-select"
						bind:value={selectedTemplateId}
						class="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
					>
						{#each templates as tmpl}
							<option value={tmpl.id}>{tmpl.name} ({tmpl.width}" x {tmpl.height}")</option>
						{/each}
					</select>
				{/if}
			</div>

			<!-- Select all / deselect all -->
			<div class="flex items-center justify-between">
				<span class="text-sm text-gray-500">{selectedCount} of {poLines.length} items selected</span>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={selectAll}
						class="px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg active:bg-primary/20 transition-colors"
					>
						Select All
					</button>
					<button
						type="button"
						onclick={deselectAll}
						class="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg active:bg-gray-200 transition-colors"
					>
						Deselect All
					</button>
				</div>
			</div>

			<!-- Line items list -->
			<div class="space-y-2">
				{#each poLines as line}
					{@const isSelected = selectedLineIds.has(line.id)}
					<div
						class="bg-white rounded-xl shadow-sm border px-4 py-3 transition-colors {isSelected ? 'border-primary/40 bg-primary/5' : 'border-gray-100'}"
					>
						<div class="flex items-start gap-3">
							<!-- Checkbox -->
							<button
								type="button"
								onclick={() => toggleLine(line.id)}
								class="mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors {isSelected
									? 'bg-primary border-primary'
									: 'border-gray-300 bg-white'}"
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
									{#if line.barcode}
										<span class="text-xs text-gray-400 font-mono">{line.barcode}</span>
									{/if}
								</div>
								<p class="text-sm text-gray-500 truncate">{line.description ?? 'No description'}</p>
								<div class="flex items-center gap-3 mt-1">
									<span class="text-xs text-gray-400">Ordered: <span class="font-medium text-gray-600">{line.qtyOrdered}</span></span>
									<span class="text-xs text-gray-400">Received: <span class="font-medium {line.qtyReceived >= line.qtyOrdered ? 'text-primary' : 'text-amber-600'}">{line.qtyReceived}</span></span>
								</div>
							</div>

							<!-- Label qty input -->
							{#if isSelected}
								<div class="flex flex-col items-center gap-0.5 flex-shrink-0">
									<span class="text-[10px] text-gray-400 uppercase tracking-wide">Labels</span>
									<input
										type="number"
										min="1"
										max="99"
										bind:value={labelQtys[line.id]}
										class="w-14 h-8 text-center text-sm font-medium border border-gray-200 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
									/>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<!-- Label preview -->
			{#if selectedCount > 0 && selectedTemplate}
				<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
					<h3 class="text-sm font-medium text-gray-700">Label Preview</h3>
					<div class="flex justify-center">
						{#if previewLine}
							<div
								class="border border-dashed border-gray-300 rounded bg-white flex flex-col justify-between overflow-hidden"
								style="width: {Math.min(selectedTemplate.width * 80, 320)}px; height: {selectedTemplate.height * 80}px; padding: 8px;"
							>
								<div class="flex justify-between items-start">
									<div class="min-w-0">
										<p class="text-xs font-bold text-gray-900 truncate">{previewLine.sku}</p>
										<p class="text-[10px] text-gray-500 truncate">{previewLine.description ?? ''}</p>
									</div>
									<div class="text-right flex-shrink-0 ml-2">
										<p class="text-[9px] text-gray-400">PO #{poNumber}</p>
										<p class="text-[9px] text-gray-400">{new Date().toLocaleDateString()}</p>
									</div>
								</div>
								<div class="text-center">
									<img
										src="/api/barcode/{encodeURIComponent(previewLine.barcode ?? previewLine.sku)}.svg"
										alt="barcode preview"
										class="h-8 mx-auto"
									/>
								</div>
								<p class="text-center font-mono text-[11px] tracking-wider text-gray-700">{previewLine.barcode ?? previewLine.sku}</p>
							</div>
						{/if}
					</div>
					<p class="text-xs text-gray-400 text-center">
						Showing first selected item. {selectedTemplate.width}" x {selectedTemplate.height}" template.
					</p>
				</div>
			{/if}

			<!-- Print summary + button -->
			<div class="bg-primary/5 rounded-xl px-4 py-3 flex items-center justify-between">
				<div>
					<span class="text-sm font-medium text-gray-700">Total labels to print</span>
					<p class="text-xs text-gray-400">{selectedCount} items, {totalLabelCount} labels</p>
				</div>
				<span class="text-lg font-bold text-primary">{totalLabelCount}</span>
			</div>

			<button
				type="button"
				onclick={printLabels}
				disabled={selectedCount === 0}
				class="w-full h-14 bg-primary text-white font-semibold text-base rounded-xl shadow-sm active:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
				</svg>
				Print {totalLabelCount} Label{totalLabelCount !== 1 ? 's' : ''}
			</button>
		{/if}
	{/if}
</div>

<!-- Scan Flash -->
{#if flash}
	<ScanFlash type={flash.type} message={flash.message} detail={flash.detail} />
{/if}
