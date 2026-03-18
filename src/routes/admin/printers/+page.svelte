<script lang="ts">
	import { onMount } from 'svelte';

	type Building = { id: string; name: string; code: string };
	type Printer = {
		id: string;
		name: string;
		type: 'THERMAL' | 'LASER';
		ipAddress: string | null;
		buildingId: string | null;
		building: Building | null;
		active: boolean;
	};

	let printers = $state<Printer[]>([]);
	let buildings = $state<Building[]>([]);
	let loading = $state(true);
	let showAdd = $state(false);
	let editingId = $state<string | null>(null);
	let saving = $state(false);

	let form = $state({ name: '', type: 'THERMAL' as 'THERMAL' | 'LASER', ipAddress: '', buildingId: '', active: true });

	const typeBadge: Record<string, string> = {
		THERMAL: 'bg-amber-100 text-amber-700',
		LASER: 'bg-cyan-100 text-cyan-700'
	};

	const samplePrinters: Printer[] = [
		{ id: '1', name: 'Warehouse Thermal', type: 'THERMAL', ipAddress: '192.168.1.100', buildingId: '1', building: { id: '1', name: 'Olathe Warehouse', code: 'OLA' }, active: true },
		{ id: '2', name: 'Office Laser', type: 'LASER', ipAddress: '192.168.1.101', buildingId: '1', building: { id: '1', name: 'Olathe Warehouse', code: 'OLA' }, active: true },
		{ id: '3', name: 'Topeka Label Printer', type: 'THERMAL', ipAddress: '192.168.2.50', buildingId: '2', building: { id: '2', name: 'Topeka Store', code: 'TOP' }, active: false }
	];

	const sampleBuildings: Building[] = [
		{ id: '1', name: 'Olathe Warehouse', code: 'OLA' },
		{ id: '2', name: 'Topeka Store', code: 'TOP' },
		{ id: '3', name: "Lee's Summit", code: 'LS' }
	];

	onMount(async () => {
		try {
			const [printersRes, buildingsRes] = await Promise.all([
				fetch('/api/admin/printers'),
				fetch('/api/admin/buildings')
			]);
			if (printersRes.ok) printers = await printersRes.json();
			else printers = samplePrinters;
			if (buildingsRes.ok) buildings = await buildingsRes.json();
			else buildings = sampleBuildings;
		} catch {
			printers = samplePrinters;
			buildings = sampleBuildings;
		}
		loading = false;
	});

	function resetForm() {
		form = { name: '', type: 'THERMAL', ipAddress: '', buildingId: '', active: true };
	}

	function openAdd() {
		editingId = null;
		resetForm();
		showAdd = true;
	}

	function cancelForm() {
		showAdd = false;
		editingId = null;
		resetForm();
	}

	function startEdit(p: Printer) {
		if (editingId === p.id) { cancelForm(); return; }
		showAdd = false;
		editingId = p.id;
		form = { name: p.name, type: p.type, ipAddress: p.ipAddress ?? '', buildingId: p.buildingId ?? '', active: p.active };
	}

	async function savePrinter() {
		if (!form.name.trim()) return;
		saving = true;
		try {
			const body = { name: form.name, type: form.type, ipAddress: form.ipAddress || null, buildingId: form.buildingId || null, active: form.active };
			if (editingId) {
				const res = await fetch(`/api/admin/printers/${editingId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});
				if (res.ok) {
					const updated = await res.json();
					printers = printers.map((p) => (p.id === editingId ? updated : p));
				}
			} else {
				const res = await fetch('/api/admin/printers', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});
				if (res.ok) {
					const created = await res.json();
					printers = [created, ...printers];
				}
			}
			cancelForm();
		} catch {
			// handle error
		}
		saving = false;
	}
</script>

<div class="page-enter p-4 space-y-4">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<a href="/admin" class="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 active:bg-gray-200 transition-colors">
				<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</a>
			<h1 class="text-xl font-bold text-gray-900">Printers</h1>
		</div>
		<button
			type="button"
			onclick={openAdd}
			class="h-9 px-4 bg-primary text-white text-sm font-semibold rounded-lg active:opacity-80 transition-opacity"
		>
			Add Printer
		</button>
	</div>

	<!-- Add Form -->
	{#if showAdd}
		<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
			<h3 class="text-sm font-semibold text-gray-700">New Printer</h3>
			{@render formFields()}
		</div>
	{/if}

	<!-- Printer List -->
	{#if loading}
		<div class="space-y-3">
			{#each [1, 2] as _}
				<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
					<div class="h-5 w-40 bg-gray-100 rounded animate-pulse"></div>
					<div class="h-4 w-52 bg-gray-50 rounded animate-pulse mt-2"></div>
				</div>
			{/each}
		</div>
	{:else if printers.length === 0}
		<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
			<p class="text-sm text-gray-400">No printers configured</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each printers as printer (printer.id)}
				<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
					<button
						type="button"
						onclick={() => startEdit(printer)}
						class="w-full px-4 py-3 flex items-center gap-3 text-left active:bg-gray-50 transition-colors"
					>
						<div class="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
							</svg>
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<span class="text-sm font-semibold text-gray-900">{printer.name}</span>
								<span class="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide {typeBadge[printer.type]}">
									{printer.type}
								</span>
							</div>
							<div class="flex items-center gap-2 mt-0.5">
								{#if printer.ipAddress}
									<span class="text-xs text-gray-500 font-mono">{printer.ipAddress}</span>
									<span class="text-gray-300">|</span>
								{/if}
								<span class="text-xs text-gray-500">{printer.building?.name ?? 'No building'}</span>
							</div>
						</div>
						<span class="w-2.5 h-2.5 rounded-full flex-shrink-0 {printer.active ? 'bg-emerald-500' : 'bg-gray-300'}"></span>
					</button>

					{#if editingId === printer.id}
						<div class="border-t border-gray-100 p-4 space-y-3 bg-gray-50/50">
							<h3 class="text-sm font-semibold text-gray-700">Edit Printer</h3>
							{@render formFields()}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

{#snippet formFields()}
	<div class="space-y-2">
		<input
			type="text"
			bind:value={form.name}
			placeholder="Printer name (e.g. Intermec PC43)"
			class="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
		/>
		<select
			bind:value={form.type}
			class="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
		>
			<option value="THERMAL">Thermal</option>
			<option value="LASER">Laser</option>
		</select>
		<input
			type="text"
			bind:value={form.ipAddress}
			placeholder="IP Address (e.g. 192.168.1.100)"
			class="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 font-mono placeholder:text-gray-400 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
		/>
		<select
			bind:value={form.buildingId}
			class="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
		>
			<option value="">No building</option>
			{#each buildings as b}
				<option value={b.id}>{b.name} ({b.code})</option>
			{/each}
		</select>
		{#if editingId}
			<div class="flex items-center justify-between py-1">
				<span class="text-sm text-gray-600">Active</span>
				<button
					type="button"
					onclick={() => form.active = !form.active}
					class="relative w-10 h-6 rounded-full transition-colors {form.active ? 'bg-emerald-500' : 'bg-gray-200'}"
					role="switch"
					aria-checked={form.active}
				>
					<span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform {form.active ? 'translate-x-4' : ''}"></span>
				</button>
			</div>
		{/if}
	</div>
	<div class="flex gap-2">
		<button
			type="button"
			onclick={savePrinter}
			disabled={saving || !form.name.trim()}
			class="flex-1 h-10 bg-primary text-white text-sm font-semibold rounded-lg disabled:opacity-50 active:opacity-80 transition-opacity"
		>
			{saving ? 'Saving...' : 'Save'}
		</button>
		<button
			type="button"
			onclick={cancelForm}
			class="flex-1 h-10 bg-gray-100 text-gray-600 text-sm font-semibold rounded-lg active:bg-gray-200 transition-colors"
		>
			Cancel
		</button>
	</div>
{/snippet}
