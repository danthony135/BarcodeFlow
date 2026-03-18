<script lang="ts">
	import { onMount } from 'svelte';

	type Building = {
		id: string;
		name: string;
		code: string;
		address: string | null;
		active: boolean;
	};

	let buildings = $state<Building[]>([]);
	let loading = $state(true);
	let showAdd = $state(false);
	let editingId = $state<string | null>(null);
	let saving = $state(false);

	let form = $state({ name: '', code: '', address: '' });

	const sampleBuildings: Building[] = [
		{ id: '1', name: 'Olathe Warehouse', code: 'OLA', address: '123 Industrial Pkwy, Olathe, KS', active: true },
		{ id: '2', name: 'Topeka Store', code: 'TOP', address: '456 Main St, Topeka, KS', active: true },
		{ id: '3', name: "Lee's Summit", code: 'LS', address: "789 Commerce Dr, Lee's Summit, MO", active: true }
	];

	onMount(async () => {
		try {
			const res = await fetch('/api/admin/buildings');
			if (res.ok) {
				buildings = await res.json();
			} else {
				buildings = sampleBuildings;
			}
		} catch {
			buildings = sampleBuildings;
		}
		loading = false;
	});

	function openAdd() {
		editingId = null;
		form = { name: '', code: '', address: '' };
		showAdd = true;
	}

	function cancelForm() {
		showAdd = false;
		editingId = null;
		form = { name: '', code: '', address: '' };
	}

	function startEdit(b: Building) {
		if (editingId === b.id) {
			cancelForm();
			return;
		}
		showAdd = false;
		editingId = b.id;
		form = { name: b.name, code: b.code, address: b.address ?? '' };
	}

	async function saveBuilding() {
		if (!form.name.trim() || !form.code.trim()) return;
		saving = true;
		try {
			if (editingId) {
				const res = await fetch(`/api/admin/buildings/${editingId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(form)
				});
				if (res.ok) {
					const updated = await res.json();
					buildings = buildings.map((b) => (b.id === editingId ? updated : b));
				}
			} else {
				const res = await fetch('/api/admin/buildings', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(form)
				});
				if (res.ok) {
					const created = await res.json();
					buildings = [created, ...buildings];
				}
			}
			cancelForm();
		} catch {
			// handle error
		}
		saving = false;
	}

	async function toggleActive(b: Building) {
		try {
			const res = await fetch(`/api/admin/buildings/${b.id}`, {
				method: b.active ? 'DELETE' : 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...b, active: !b.active })
			});
			if (res.ok) {
				buildings = buildings.map((x) => (x.id === b.id ? { ...x, active: !x.active } : x));
			}
		} catch {
			// handle error
		}
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
			<h1 class="text-xl font-bold text-gray-900">Buildings</h1>
		</div>
		<button
			type="button"
			onclick={openAdd}
			class="h-9 px-4 bg-primary text-white text-sm font-semibold rounded-lg active:opacity-80 transition-opacity"
		>
			Add Building
		</button>
	</div>

	<!-- Add Form -->
	{#if showAdd}
		<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
			<h3 class="text-sm font-semibold text-gray-700">New Building</h3>
			<div class="space-y-2">
				<input
					type="text"
					bind:value={form.name}
					placeholder="Building name"
					class="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
				/>
				<input
					type="text"
					bind:value={form.code}
					placeholder="Code (e.g. OLA)"
					maxlength="10"
					class="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary uppercase"
				/>
				<input
					type="text"
					bind:value={form.address}
					placeholder="Address (optional)"
					class="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
				/>
			</div>
			<div class="flex gap-2">
				<button
					type="button"
					onclick={saveBuilding}
					disabled={saving || !form.name.trim() || !form.code.trim()}
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
		</div>
	{/if}

	<!-- Building List -->
	{#if loading}
		<div class="space-y-3">
			{#each [1, 2, 3] as _}
				<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
					<div class="h-5 w-40 bg-gray-100 rounded animate-pulse"></div>
					<div class="h-4 w-60 bg-gray-50 rounded animate-pulse mt-2"></div>
				</div>
			{/each}
		</div>
	{:else if buildings.length === 0}
		<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
			<p class="text-sm text-gray-400">No buildings yet</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each buildings as building (building.id)}
				<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
					<!-- Card -->
					<div
						role="button"
						tabindex="0"
						onclick={() => startEdit(building)}
						onkeydown={(e) => { if (e.key === 'Enter') startEdit(building); }}
						class="w-full px-4 py-3 flex items-center gap-3 text-left active:bg-gray-50 transition-colors cursor-pointer"
					>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<span class="text-sm font-bold text-gray-900">{building.name}</span>
								<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 uppercase tracking-wide">
									{building.code}
								</span>
							</div>
							{#if building.address}
								<p class="text-xs text-gray-500 mt-0.5 truncate">{building.address}</p>
							{/if}
						</div>
						<button
							type="button"
							onclick={(e) => { e.stopPropagation(); toggleActive(building); }}
							class="relative w-10 h-6 rounded-full transition-colors {building.active ? 'bg-emerald-500' : 'bg-gray-200'}"
							role="switch"
							aria-checked={building.active}
							aria-label="Toggle active"
						>
							<span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform {building.active ? 'translate-x-4' : ''}"></span>
						</button>
					</div>

					<!-- Inline Edit -->
					{#if editingId === building.id}
						<div class="border-t border-gray-100 p-4 space-y-2 bg-gray-50/50">
							<input
								type="text"
								bind:value={form.name}
								placeholder="Building name"
								class="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
							/>
							<input
								type="text"
								bind:value={form.code}
								placeholder="Code"
								maxlength="10"
								class="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary uppercase"
							/>
							<input
								type="text"
								bind:value={form.address}
								placeholder="Address"
								class="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
							/>
							<div class="flex gap-2">
								<button
									type="button"
									onclick={saveBuilding}
									disabled={saving || !form.name.trim() || !form.code.trim()}
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
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
