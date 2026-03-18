<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	// --- Types ---
	interface LabelElement {
		id: string;
		type: 'barcode' | 'field' | 'static' | 'line';
		x: number;
		y: number;
		width: number;
		height: number;
		props: {
			field?: string;
			text?: string;
			fontSize?: number;
			fontWeight?: string;
			barcodeField?: string;
			strokeWidth?: number;
		};
	}

	// --- Label sizes ---
	const LABEL_SIZES = [
		{ label: '2" x 1"', width: 2, height: 1 },
		{ label: '4" x 2"', width: 4, height: 2 },
		{ label: '4" x 3"', width: 4, height: 3 },
		{ label: '4" x 6"', width: 4, height: 6 },
		{ label: 'Custom', width: 0, height: 0 }
	];

	const DATA_FIELDS = [
		{ value: 'barcode', label: 'Barcode Number' },
		{ value: 'sku', label: 'SKU' },
		{ value: 'description', label: 'Description' },
		{ value: 'poNumber', label: 'PO Number' },
		{ value: 'receivedDate', label: 'Received Date' },
		{ value: 'building', label: 'Building' },
		{ value: 'ticketNumber', label: 'Ticket Number' }
	];

	const SAMPLE_DATA: Record<string, string> = {
		barcode: '8901234567890',
		sku: 'ASH-SOF-1234',
		description: 'Darcy Sofa - Blue',
		poNumber: 'PO-4521',
		receivedDate: '03/18/2026',
		building: 'Warehouse',
		ticketNumber: 'TKT-001'
	};

	// --- State ---
	let templateName = $state('Untitled Template');
	let labelWidth = $state(4);
	let labelHeight = $state(2);
	let selectedSizeIdx = $state(1); // 4x2 default
	let customWidth = $state(4);
	let customHeight = $state(2);
	let elements = $state<LabelElement[]>([]);
	let selectedId = $state<string | null>(null);
	let saving = $state(false);
	let showPreview = $state(false);
	let editingTemplateId = $state<string | null>(null);
	let showMobileProps = $state(false);

	// Drag state
	let dragging = $state(false);
	let dragOffsetX = $state(0);
	let dragOffsetY = $state(0);

	// Canvas ref
	let canvasEl: HTMLDivElement | undefined = $state();

	// Load template from URL params
	$effect(() => {
		const id = $page.url.searchParams.get('id');
		if (id) {
			editingTemplateId = id;
			loadTemplate(id);
		} else {
			loadDefaultLayout();
		}
	});

	let selectedElement = $derived(elements.find((e) => e.id === selectedId) ?? null);

	// --- Helpers ---
	function genId() {
		return 'el_' + Math.random().toString(36).slice(2, 9);
	}

	function loadDefaultLayout() {
		elements = [
			{
				id: genId(),
				type: 'barcode',
				x: 20,
				y: 8,
				width: 60,
				height: 30,
				props: { barcodeField: 'barcode' }
			},
			{
				id: genId(),
				type: 'field',
				x: 5,
				y: 45,
				width: 50,
				height: 12,
				props: { field: 'sku', fontSize: 14, fontWeight: 'bold' }
			},
			{
				id: genId(),
				type: 'field',
				x: 5,
				y: 57,
				width: 90,
				height: 10,
				props: { field: 'description', fontSize: 12, fontWeight: 'normal' }
			},
			{
				id: genId(),
				type: 'field',
				x: 5,
				y: 72,
				width: 40,
				height: 10,
				props: { field: 'poNumber', fontSize: 11, fontWeight: 'normal' }
			},
			{
				id: genId(),
				type: 'field',
				x: 55,
				y: 72,
				width: 40,
				height: 10,
				props: { field: 'receivedDate', fontSize: 11, fontWeight: 'normal' }
			},
			{
				id: genId(),
				type: 'field',
				x: 55,
				y: 85,
				width: 40,
				height: 10,
				props: { field: 'building', fontSize: 11, fontWeight: 'normal' }
			}
		];
	}

	async function loadTemplate(id: string) {
		try {
			const res = await fetch(`/api/labels/templates/${id}`);
			if (!res.ok) return;
			const data = await res.json();
			templateName = data.name;
			labelWidth = data.width;
			labelHeight = data.height;
			elements = data.elements;
			// Match size dropdown
			const idx = LABEL_SIZES.findIndex(
				(s) => s.width === data.width && s.height === data.height
			);
			selectedSizeIdx = idx >= 0 ? idx : LABEL_SIZES.length - 1;
			if (idx < 0) {
				customWidth = data.width;
				customHeight = data.height;
			}
		} catch {
			// ignore
		}
	}

	function handleSizeChange() {
		const s = LABEL_SIZES[selectedSizeIdx];
		if (s.width > 0) {
			labelWidth = s.width;
			labelHeight = s.height;
		} else {
			labelWidth = customWidth;
			labelHeight = customHeight;
		}
	}

	function handleCustomSizeChange() {
		if (LABEL_SIZES[selectedSizeIdx].width === 0) {
			labelWidth = customWidth;
			labelHeight = customHeight;
		}
	}

	// --- Add elements ---
	function addBarcode() {
		const el: LabelElement = {
			id: genId(),
			type: 'barcode',
			x: 20,
			y: 10,
			width: 60,
			height: 25,
			props: { barcodeField: 'barcode' }
		};
		elements = [...elements, el];
		selectedId = el.id;
		showMobileProps = true;
	}

	function addField() {
		const el: LabelElement = {
			id: genId(),
			type: 'field',
			x: 10,
			y: 50,
			width: 40,
			height: 10,
			props: { field: 'sku', fontSize: 12, fontWeight: 'normal' }
		};
		elements = [...elements, el];
		selectedId = el.id;
		showMobileProps = true;
	}

	function addStatic() {
		const el: LabelElement = {
			id: genId(),
			type: 'static',
			x: 10,
			y: 50,
			width: 30,
			height: 10,
			props: { text: 'Label Text', fontSize: 12, fontWeight: 'normal' }
		};
		elements = [...elements, el];
		selectedId = el.id;
		showMobileProps = true;
	}

	function addLine() {
		const el: LabelElement = {
			id: genId(),
			type: 'line',
			x: 5,
			y: 50,
			width: 90,
			height: 0,
			props: { strokeWidth: 1 }
		};
		elements = [...elements, el];
		selectedId = el.id;
		showMobileProps = true;
	}

	function deleteSelected() {
		if (!selectedId) return;
		elements = elements.filter((e) => e.id !== selectedId);
		selectedId = null;
		showMobileProps = false;
	}

	function duplicateSelected() {
		if (!selectedElement) return;
		const el: LabelElement = {
			...structuredClone(selectedElement),
			id: genId(),
			x: Math.min(selectedElement.x + 5, 90),
			y: Math.min(selectedElement.y + 5, 90)
		};
		elements = [...elements, el];
		selectedId = el.id;
	}

	// --- Drag handling ---
	function handlePointerDown(e: PointerEvent, elId: string) {
		e.stopPropagation();
		e.preventDefault();
		selectedId = elId;
		showMobileProps = true;
		dragging = true;

		if (!canvasEl) return;
		const rect = canvasEl.getBoundingClientRect();
		const el = elements.find((el) => el.id === elId)!;
		const pxX = (el.x / 100) * rect.width;
		const pxY = (el.y / 100) * rect.height;
		dragOffsetX = e.clientX - rect.left - pxX;
		dragOffsetY = e.clientY - rect.top - pxY;

		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!dragging || !selectedId || !canvasEl) return;
		e.preventDefault();

		const rect = canvasEl.getBoundingClientRect();
		let newX = ((e.clientX - rect.left - dragOffsetX) / rect.width) * 100;
		let newY = ((e.clientY - rect.top - dragOffsetY) / rect.height) * 100;

		newX = Math.max(0, Math.min(100, newX));
		newY = Math.max(0, Math.min(100, newY));

		elements = elements.map((el) =>
			el.id === selectedId
				? { ...el, x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 }
				: el
		);
	}

	function handlePointerUp() {
		dragging = false;
	}

	function handleCanvasClick() {
		selectedId = null;
		showMobileProps = false;
	}

	// --- Keyboard ---
	function handleKeyDown(e: KeyboardEvent) {
		if (!selectedId) return;
		const step = e.shiftKey ? 5 : 1;
		let handled = false;

		if (e.key === 'ArrowLeft') {
			elements = elements.map((el) =>
				el.id === selectedId ? { ...el, x: Math.max(0, el.x - step) } : el
			);
			handled = true;
		} else if (e.key === 'ArrowRight') {
			elements = elements.map((el) =>
				el.id === selectedId ? { ...el, x: Math.min(100, el.x + step) } : el
			);
			handled = true;
		} else if (e.key === 'ArrowUp') {
			elements = elements.map((el) =>
				el.id === selectedId ? { ...el, y: Math.max(0, el.y - step) } : el
			);
			handled = true;
		} else if (e.key === 'ArrowDown') {
			elements = elements.map((el) =>
				el.id === selectedId ? { ...el, y: Math.min(100, el.y + step) } : el
			);
			handled = true;
		} else if (e.key === 'Delete' || e.key === 'Backspace') {
			// Don't delete if user is typing in an input
			if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
			deleteSelected();
			handled = true;
		}

		if (handled) e.preventDefault();
	}

	// --- Property updates ---
	function updateProp(key: string, value: any) {
		if (!selectedId) return;
		elements = elements.map((el) =>
			el.id === selectedId ? { ...el, props: { ...el.props, [key]: value } } : el
		);
	}

	function updateElement(key: 'x' | 'y' | 'width' | 'height', value: number) {
		if (!selectedId) return;
		elements = elements.map((el) => (el.id === selectedId ? { ...el, [key]: value } : el));
	}

	// --- Save ---
	async function handleSave() {
		saving = true;
		try {
			const payload = {
				name: templateName,
				width: labelWidth,
				height: labelHeight,
				elements
			};

			if (editingTemplateId) {
				await fetch(`/api/labels/templates/${editingTemplateId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
			} else {
				const res = await fetch('/api/labels/templates', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				const data = await res.json();
				editingTemplateId = data.id;
				// Update URL without navigation
				const url = new URL(window.location.href);
				url.searchParams.set('id', data.id);
				window.history.replaceState({}, '', url.toString());
			}
		} catch {
			// ignore
		} finally {
			saving = false;
		}
	}

	// --- Element display helpers ---
	function getElementLabel(el: LabelElement): string {
		switch (el.type) {
			case 'barcode':
				return 'Barcode';
			case 'field':
				return DATA_FIELDS.find((f) => f.value === el.props.field)?.label ?? 'Field';
			case 'static':
				return el.props.text ?? 'Text';
			case 'line':
				return 'Line';
			default:
				return 'Element';
		}
	}

	function getDisplayText(el: LabelElement, preview: boolean): string {
		if (el.type === 'field') {
			if (preview) return SAMPLE_DATA[el.props.field ?? 'sku'] ?? '[field]';
			return `{${el.props.field ?? 'field'}}`;
		}
		if (el.type === 'static') return el.props.text ?? 'Text';
		return '';
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="page-enter flex flex-col h-[100dvh] bg-gray-100">
	<!-- Top Bar -->
	<div class="bg-white border-b border-gray-200 px-3 py-2.5 flex items-center gap-2 flex-shrink-0 shadow-sm">
		<a
			href="/labels"
			class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</a>

		<input
			type="text"
			bind:value={templateName}
			class="flex-1 min-w-0 h-9 px-2 text-sm font-semibold text-gray-900 bg-transparent border border-transparent rounded-lg hover:border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
		/>

		<select
			bind:value={selectedSizeIdx}
			onchange={handleSizeChange}
			class="h-9 px-2 text-xs border border-gray-200 rounded-lg bg-white outline-none focus:border-primary transition hidden sm:block"
		>
			{#each LABEL_SIZES as size, i}
				<option value={i}>{size.label}</option>
			{/each}
		</select>

		{#if LABEL_SIZES[selectedSizeIdx].width === 0}
			<div class="hidden sm:flex items-center gap-1">
				<input
					type="number"
					bind:value={customWidth}
					oninput={handleCustomSizeChange}
					step="0.5"
					min="0.5"
					max="12"
					class="w-14 h-9 px-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition text-center"
				/>
				<span class="text-xs text-gray-400">x</span>
				<input
					type="number"
					bind:value={customHeight}
					oninput={handleCustomSizeChange}
					step="0.5"
					min="0.5"
					max="12"
					class="w-14 h-9 px-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition text-center"
				/>
				<span class="text-[10px] text-gray-400">in</span>
			</div>
		{/if}

		<button
			type="button"
			onclick={() => (showPreview = !showPreview)}
			class="h-9 px-3 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors hidden sm:flex items-center gap-1.5"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
			</svg>
			{showPreview ? 'Edit' : 'Preview'}
		</button>

		<button
			type="button"
			onclick={handleSave}
			disabled={saving}
			class="h-9 px-4 text-xs font-semibold bg-primary text-white rounded-lg active:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
		>
			{#if saving}
				<svg class="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
				</svg>
				Saving...
			{:else}
				Save
			{/if}
		</button>
	</div>

	<!-- Mobile size selector + preview toggle -->
	<div class="sm:hidden bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-2">
		<select
			bind:value={selectedSizeIdx}
			onchange={handleSizeChange}
			class="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white outline-none focus:border-primary transition flex-1"
		>
			{#each LABEL_SIZES as size, i}
				<option value={i}>{size.label}</option>
			{/each}
		</select>
		<button
			type="button"
			onclick={() => (showPreview = !showPreview)}
			class="h-8 px-3 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
		>
			{showPreview ? 'Edit' : 'Preview'}
		</button>
	</div>

	<!-- Main content -->
	<div class="flex-1 flex overflow-hidden">
		<!-- Left sidebar: Element palette (desktop) -->
		<div class="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 flex-shrink-0">
			<div class="p-3 border-b border-gray-100">
				<p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Add Elements</p>
			</div>
			<div class="p-2 space-y-1.5">
				<button
					type="button"
					onclick={addBarcode}
					class="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
				>
					<div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
						<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
						</svg>
					</div>
					<div class="text-left">
						<p class="font-medium text-xs">Barcode</p>
						<p class="text-[10px] text-gray-400">Barcode image</p>
					</div>
				</button>

				<button
					type="button"
					onclick={addField}
					class="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
				>
					<div class="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
						<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
						</svg>
					</div>
					<div class="text-left">
						<p class="font-medium text-xs">Data Field</p>
						<p class="text-[10px] text-gray-400">Dynamic data</p>
					</div>
				</button>

				<button
					type="button"
					onclick={addStatic}
					class="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
				>
					<div class="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
						<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
						</svg>
					</div>
					<div class="text-left">
						<p class="font-medium text-xs">Static Text</p>
						<p class="text-[10px] text-gray-400">Fixed text</p>
					</div>
				</button>

				<button
					type="button"
					onclick={addLine}
					class="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
				>
					<div class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
						<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16" />
						</svg>
					</div>
					<div class="text-left">
						<p class="font-medium text-xs">Line</p>
						<p class="text-[10px] text-gray-400">Separator line</p>
					</div>
				</button>
			</div>

			<!-- Element list -->
			<div class="border-t border-gray-100 mt-2 flex-1 overflow-y-auto">
				<div class="p-3 pb-1">
					<p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Layers</p>
				</div>
				<div class="p-2 space-y-0.5">
					{#each elements as el}
						<button
							type="button"
							onclick={() => { selectedId = el.id; showMobileProps = true; }}
							class="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg transition-colors {el.id === selectedId ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}"
						>
							<span class="w-2 h-2 rounded-full flex-shrink-0 {el.type === 'barcode' ? 'bg-primary' : el.type === 'field' ? 'bg-info' : el.type === 'static' ? 'bg-warning' : 'bg-gray-400'}"></span>
							<span class="truncate">{getElementLabel(el)}</span>
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- Mobile element palette (horizontal scroll) -->
		<div class="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 px-2 py-2 flex items-center gap-2 overflow-x-auto" style="padding-bottom: max(0.5rem, env(safe-area-inset-bottom));">
			<button
				type="button"
				onclick={addBarcode}
				class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg whitespace-nowrap active:bg-gray-100 flex-shrink-0"
			>
				<span class="w-2 h-2 rounded-full bg-primary"></span>
				Barcode
			</button>
			<button
				type="button"
				onclick={addField}
				class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg whitespace-nowrap active:bg-gray-100 flex-shrink-0"
			>
				<span class="w-2 h-2 rounded-full bg-info"></span>
				Data Field
			</button>
			<button
				type="button"
				onclick={addStatic}
				class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg whitespace-nowrap active:bg-gray-100 flex-shrink-0"
			>
				<span class="w-2 h-2 rounded-full bg-warning"></span>
				Static Text
			</button>
			<button
				type="button"
				onclick={addLine}
				class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg whitespace-nowrap active:bg-gray-100 flex-shrink-0"
			>
				<span class="w-2 h-2 rounded-full bg-gray-400"></span>
				Line
			</button>

			{#if selectedId}
				<div class="w-px h-6 bg-gray-200 flex-shrink-0"></div>
				<button
					type="button"
					onclick={duplicateSelected}
					class="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg whitespace-nowrap active:bg-gray-100 flex-shrink-0"
				>
					Duplicate
				</button>
				<button
					type="button"
					onclick={deleteSelected}
					class="flex items-center gap-1 px-3 py-2 text-xs font-medium text-danger bg-danger/5 rounded-lg whitespace-nowrap active:bg-danger/10 flex-shrink-0"
				>
					Delete
				</button>
				<button
					type="button"
					onclick={() => (showMobileProps = !showMobileProps)}
					class="flex items-center gap-1 px-3 py-2 text-xs font-medium text-primary bg-primary/5 rounded-lg whitespace-nowrap active:bg-primary/10 flex-shrink-0"
				>
					Properties
				</button>
			{/if}
		</div>

		<!-- Canvas area -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="flex-1 flex items-center justify-center p-4 md:p-8 overflow-auto"
			onclick={handleCanvasClick}
		>
			<div
				class="relative bg-white rounded-sm shadow-lg border border-gray-300"
				bind:this={canvasEl}
				style="width: min(100%, {labelWidth * 96}px); aspect-ratio: {labelWidth} / {labelHeight}; max-height: calc(100dvh - 200px);"
			>
				<!-- Grid overlay -->
				{#if !showPreview}
					<div
						class="absolute inset-0 pointer-events-none opacity-[0.07]"
						style="background-image: linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px); background-size: 10% 10%;"
					></div>
				{/if}

				<!-- Elements -->
				{#each elements as el (el.id)}
					{#if el.type === 'barcode'}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="absolute cursor-move select-none flex flex-col items-center justify-center transition-shadow {el.id === selectedId && !showPreview ? 'ring-2 ring-primary ring-offset-1 rounded' : ''}"
							style="left: {el.x}%; top: {el.y}%; width: {el.width}%; height: {el.height}%;"
							onpointerdown={(e) => handlePointerDown(e, el.id)}
							onpointermove={handlePointerMove}
							onpointerup={handlePointerUp}
						>
							<!-- Barcode placeholder bars -->
							<div class="w-full h-[70%] flex items-end justify-center gap-[1px] px-1">
								{#each Array(30) as _, i}
									<div
										class="bg-gray-900 flex-1 rounded-t-[0.5px]"
										style="height: {40 + Math.sin(i * 0.7) * 30 + (i % 3 === 0 ? 20 : 0)}%;"
									></div>
								{/each}
							</div>
							<p class="text-[8px] font-mono text-gray-600 mt-0.5 truncate w-full text-center">
								{showPreview ? SAMPLE_DATA[el.props.barcodeField ?? 'barcode'] : `{${el.props.barcodeField ?? 'barcode'}}`}
							</p>
						</div>
					{:else if el.type === 'line'}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="absolute cursor-move select-none {el.id === selectedId && !showPreview ? 'ring-2 ring-primary ring-offset-1 rounded' : ''}"
							style="left: {el.x}%; top: {el.y}%; width: {el.width}%; height: {Math.max(el.props.strokeWidth ?? 1, 4)}px; display: flex; align-items: center;"
							onpointerdown={(e) => handlePointerDown(e, el.id)}
							onpointermove={handlePointerMove}
							onpointerup={handlePointerUp}
						>
							<div class="w-full bg-gray-900 rounded-full" style="height: {el.props.strokeWidth ?? 1}px;"></div>
						</div>
					{:else}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="absolute cursor-move select-none flex items-center px-1 truncate {el.id === selectedId && !showPreview ? 'ring-2 ring-primary ring-offset-1 rounded' : ''}"
							style="left: {el.x}%; top: {el.y}%; width: {el.width}%; height: {el.height}%; font-size: {el.props.fontSize ?? 12}px; font-weight: {el.props.fontWeight ?? 'normal'};"
							onpointerdown={(e) => handlePointerDown(e, el.id)}
							onpointermove={handlePointerMove}
							onpointerup={handlePointerUp}
						>
							<span class="truncate {el.type === 'field' && !showPreview ? 'text-info' : 'text-gray-900'}">
								{getDisplayText(el, showPreview)}
							</span>
						</div>
					{/if}
				{/each}

				<!-- Empty state -->
				{#if elements.length === 0}
					<div class="absolute inset-0 flex items-center justify-center text-gray-300">
						<div class="text-center">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
							</svg>
							<p class="text-sm">Add elements from the panel</p>
						</div>
					</div>
				{/if}

				<!-- Label dimensions badge -->
				<div class="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 whitespace-nowrap">
					{labelWidth}" x {labelHeight}"
				</div>
			</div>
		</div>

		<!-- Right sidebar: Properties panel (desktop) -->
		<div class="hidden md:flex flex-col w-64 bg-white border-l border-gray-200 flex-shrink-0 overflow-y-auto">
			{#if selectedElement}
				<div class="p-3 border-b border-gray-100 flex items-center justify-between">
					<p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Properties</p>
					<div class="flex items-center gap-1">
						<button
							type="button"
							onclick={duplicateSelected}
							class="w-7 h-7 rounded-md bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
							title="Duplicate"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
							</svg>
						</button>
						<button
							type="button"
							onclick={deleteSelected}
							class="w-7 h-7 rounded-md bg-danger/5 flex items-center justify-center text-danger/60 hover:text-danger hover:bg-danger/10 transition-colors"
							title="Delete"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
						</button>
					</div>
				</div>

				<div class="p-3 space-y-3">
					<!-- Element type badge -->
					<div class="flex items-center gap-2">
						<span class="px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full
							{selectedElement.type === 'barcode' ? 'bg-primary/10 text-primary' :
							 selectedElement.type === 'field' ? 'bg-info/10 text-info' :
							 selectedElement.type === 'static' ? 'bg-warning/10 text-warning' :
							 'bg-gray-100 text-gray-500'}">
							{selectedElement.type}
						</span>
					</div>

					<!-- Position -->
					<div>
						<p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Position</p>
						<div class="grid grid-cols-2 gap-2">
							<div>
								<label for="prop-x" class="text-[10px] text-gray-500 mb-0.5 block">X (%)</label>
								<input
									id="prop-x"
									type="number"
									value={selectedElement.x}
									oninput={(e) => updateElement('x', parseFloat((e.currentTarget as HTMLInputElement).value) || 0)}
									min="0"
									max="100"
									step="0.5"
									class="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition text-center"
								/>
							</div>
							<div>
								<label for="prop-y" class="text-[10px] text-gray-500 mb-0.5 block">Y (%)</label>
								<input
									id="prop-y"
									type="number"
									value={selectedElement.y}
									oninput={(e) => updateElement('y', parseFloat((e.currentTarget as HTMLInputElement).value) || 0)}
									min="0"
									max="100"
									step="0.5"
									class="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition text-center"
								/>
							</div>
						</div>
					</div>

					<!-- Size -->
					<div>
						<p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Size</p>
						<div class="grid grid-cols-2 gap-2">
							<div>
								<label for="prop-w" class="text-[10px] text-gray-500 mb-0.5 block">Width (%)</label>
								<input
									id="prop-w"
									type="number"
									value={selectedElement.width}
									oninput={(e) => updateElement('width', parseFloat((e.currentTarget as HTMLInputElement).value) || 0)}
									min="1"
									max="100"
									step="0.5"
									class="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition text-center"
								/>
							</div>
							<div>
								<label for="prop-h" class="text-[10px] text-gray-500 mb-0.5 block">Height (%)</label>
								<input
									id="prop-h"
									type="number"
									value={selectedElement.height}
									oninput={(e) => updateElement('height', parseFloat((e.currentTarget as HTMLInputElement).value) || 0)}
									min="0"
									max="100"
									step="0.5"
									class="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition text-center"
								/>
							</div>
						</div>
					</div>

					<!-- Barcode-specific props -->
					{#if selectedElement.type === 'barcode'}
						<div>
							<p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Barcode Source</p>
							<select
								value={selectedElement.props.barcodeField ?? 'barcode'}
								onchange={(e) => updateProp('barcodeField', (e.currentTarget as HTMLSelectElement).value)}
								class="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition bg-white"
							>
								<option value="barcode">Barcode Number</option>
								<option value="sku">SKU</option>
								<option value="poNumber">PO Number</option>
							</select>
						</div>
					{/if}

					<!-- Field-specific props -->
					{#if selectedElement.type === 'field'}
						<div>
							<p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Data Field</p>
							<select
								value={selectedElement.props.field ?? 'sku'}
								onchange={(e) => updateProp('field', (e.currentTarget as HTMLSelectElement).value)}
								class="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition bg-white"
							>
								{#each DATA_FIELDS as f}
									<option value={f.value}>{f.label}</option>
								{/each}
							</select>
						</div>
					{/if}

					<!-- Static text prop -->
					{#if selectedElement.type === 'static'}
						<div>
							<p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Text</p>
							<input
								type="text"
								value={selectedElement.props.text ?? ''}
								oninput={(e) => updateProp('text', (e.currentTarget as HTMLInputElement).value)}
								class="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition"
								placeholder="Enter text..."
							/>
						</div>
					{/if}

					<!-- Font props for text elements -->
					{#if selectedElement.type === 'field' || selectedElement.type === 'static'}
						<div>
							<p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Typography</p>
							<div class="grid grid-cols-2 gap-2">
								<div>
									<label for="prop-fs" class="text-[10px] text-gray-500 mb-0.5 block">Font Size</label>
									<input
										id="prop-fs"
										type="number"
										value={selectedElement.props.fontSize ?? 12}
										oninput={(e) => updateProp('fontSize', parseInt((e.currentTarget as HTMLInputElement).value) || 12)}
										min="6"
										max="72"
										class="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition text-center"
									/>
								</div>
								<div>
									<label for="prop-fw" class="text-[10px] text-gray-500 mb-0.5 block">Weight</label>
									<select
										id="prop-fw"
										value={selectedElement.props.fontWeight ?? 'normal'}
										onchange={(e) => updateProp('fontWeight', (e.currentTarget as HTMLSelectElement).value)}
										class="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition bg-white"
									>
										<option value="normal">Normal</option>
										<option value="bold">Bold</option>
										<option value="600">Semi-Bold</option>
										<option value="300">Light</option>
									</select>
								</div>
							</div>
						</div>
					{/if}

					<!-- Line props -->
					{#if selectedElement.type === 'line'}
						<div>
							<p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Stroke</p>
							<div>
								<label for="prop-sw" class="text-[10px] text-gray-500 mb-0.5 block">Thickness (px)</label>
								<input
									id="prop-sw"
									type="number"
									value={selectedElement.props.strokeWidth ?? 1}
									oninput={(e) => updateProp('strokeWidth', parseInt((e.currentTarget as HTMLInputElement).value) || 1)}
									min="1"
									max="10"
									class="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition text-center"
								/>
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<div class="flex-1 flex items-center justify-center p-6">
					<div class="text-center">
						<svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 mx-auto mb-2 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
						</svg>
						<p class="text-xs text-gray-400">Select an element to<br />edit its properties</p>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Mobile properties bottom sheet -->
	{#if showMobileProps && selectedElement}
		<div class="md:hidden fixed inset-x-0 bottom-12 z-40 max-h-[50dvh] overflow-y-auto">
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="bg-white rounded-t-2xl shadow-xl border-t border-gray-200 p-4 space-y-3" onclick={(e) => e.stopPropagation()}>
				<!-- Handle bar -->
				<div class="w-10 h-1 bg-gray-200 rounded-full mx-auto -mt-1 mb-2"></div>

				<div class="flex items-center justify-between">
					<span class="px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full
						{selectedElement.type === 'barcode' ? 'bg-primary/10 text-primary' :
						 selectedElement.type === 'field' ? 'bg-info/10 text-info' :
						 selectedElement.type === 'static' ? 'bg-warning/10 text-warning' :
						 'bg-gray-100 text-gray-500'}">
						{selectedElement.type}
					</span>
					<button
						type="button"
						onclick={() => (showMobileProps = false)}
						class="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<!-- Position & Size -->
				<div class="grid grid-cols-4 gap-2">
					<div>
						<label class="text-[10px] text-gray-500 block">X</label>
						<input
							type="number"
							value={selectedElement.x}
							oninput={(e) => updateElement('x', parseFloat((e.currentTarget as HTMLInputElement).value) || 0)}
							min="0" max="100" step="1"
							class="w-full h-8 px-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition text-center"
						/>
					</div>
					<div>
						<label class="text-[10px] text-gray-500 block">Y</label>
						<input
							type="number"
							value={selectedElement.y}
							oninput={(e) => updateElement('y', parseFloat((e.currentTarget as HTMLInputElement).value) || 0)}
							min="0" max="100" step="1"
							class="w-full h-8 px-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition text-center"
						/>
					</div>
					<div>
						<label class="text-[10px] text-gray-500 block">W</label>
						<input
							type="number"
							value={selectedElement.width}
							oninput={(e) => updateElement('width', parseFloat((e.currentTarget as HTMLInputElement).value) || 0)}
							min="1" max="100" step="1"
							class="w-full h-8 px-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition text-center"
						/>
					</div>
					<div>
						<label class="text-[10px] text-gray-500 block">H</label>
						<input
							type="number"
							value={selectedElement.height}
							oninput={(e) => updateElement('height', parseFloat((e.currentTarget as HTMLInputElement).value) || 0)}
							min="0" max="100" step="1"
							class="w-full h-8 px-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition text-center"
						/>
					</div>
				</div>

				<!-- Type-specific controls -->
				{#if selectedElement.type === 'barcode'}
					<div>
						<label class="text-[10px] text-gray-500 block mb-0.5">Barcode Source</label>
						<select
							value={selectedElement.props.barcodeField ?? 'barcode'}
							onchange={(e) => updateProp('barcodeField', (e.currentTarget as HTMLSelectElement).value)}
							class="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition bg-white"
						>
							<option value="barcode">Barcode Number</option>
							<option value="sku">SKU</option>
							<option value="poNumber">PO Number</option>
						</select>
					</div>
				{/if}

				{#if selectedElement.type === 'field'}
					<div>
						<label class="text-[10px] text-gray-500 block mb-0.5">Data Field</label>
						<select
							value={selectedElement.props.field ?? 'sku'}
							onchange={(e) => updateProp('field', (e.currentTarget as HTMLSelectElement).value)}
							class="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition bg-white"
						>
							{#each DATA_FIELDS as f}
								<option value={f.value}>{f.label}</option>
							{/each}
						</select>
					</div>
				{/if}

				{#if selectedElement.type === 'static'}
					<div>
						<label class="text-[10px] text-gray-500 block mb-0.5">Text</label>
						<input
							type="text"
							value={selectedElement.props.text ?? ''}
							oninput={(e) => updateProp('text', (e.currentTarget as HTMLInputElement).value)}
							class="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition"
						/>
					</div>
				{/if}

				{#if selectedElement.type === 'field' || selectedElement.type === 'static'}
					<div class="grid grid-cols-2 gap-2">
						<div>
							<label class="text-[10px] text-gray-500 block mb-0.5">Font Size</label>
							<input
								type="number"
								value={selectedElement.props.fontSize ?? 12}
								oninput={(e) => updateProp('fontSize', parseInt((e.currentTarget as HTMLInputElement).value) || 12)}
								min="6" max="72"
								class="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition text-center"
							/>
						</div>
						<div>
							<label class="text-[10px] text-gray-500 block mb-0.5">Weight</label>
							<select
								value={selectedElement.props.fontWeight ?? 'normal'}
								onchange={(e) => updateProp('fontWeight', (e.currentTarget as HTMLSelectElement).value)}
								class="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition bg-white"
							>
								<option value="normal">Normal</option>
								<option value="bold">Bold</option>
								<option value="600">Semi-Bold</option>
							</select>
						</div>
					</div>
				{/if}

				{#if selectedElement.type === 'line'}
					<div>
						<label class="text-[10px] text-gray-500 block mb-0.5">Thickness</label>
						<input
							type="number"
							value={selectedElement.props.strokeWidth ?? 1}
							oninput={(e) => updateProp('strokeWidth', parseInt((e.currentTarget as HTMLInputElement).value) || 1)}
							min="1" max="10"
							class="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-primary transition text-center"
						/>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
