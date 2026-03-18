<script lang="ts">
	import { onMount } from 'svelte';

	type Building = { id: string; name: string; code: string };
	type User = {
		id: string;
		name: string;
		role: 'ADMIN' | 'MANAGER' | 'WORKER';
		buildingId: string | null;
		building: Building | null;
		active: boolean;
	};

	let users = $state<User[]>([]);
	let buildings = $state<Building[]>([]);
	let loading = $state(true);
	let showAdd = $state(false);
	let editingId = $state<string | null>(null);
	let saving = $state(false);
	let showPin = $state(false);

	let form = $state({ name: '', pin: '', role: 'WORKER' as 'ADMIN' | 'MANAGER' | 'WORKER', buildingId: '', active: true });

	const roleBadge: Record<string, string> = {
		ADMIN: 'bg-purple-100 text-purple-700',
		MANAGER: 'bg-blue-100 text-blue-700',
		WORKER: 'bg-gray-100 text-gray-600'
	};

	const sampleUsers: User[] = [
		{ id: '1', name: 'Dan Anthony', role: 'ADMIN', buildingId: '1', building: { id: '1', name: 'Olathe Warehouse', code: 'OLA' }, active: true },
		{ id: '2', name: 'Maria Garcia', role: 'MANAGER', buildingId: '2', building: { id: '2', name: 'Topeka Store', code: 'TOP' }, active: true },
		{ id: '3', name: 'James Wilson', role: 'WORKER', buildingId: '1', building: { id: '1', name: 'Olathe Warehouse', code: 'OLA' }, active: true },
		{ id: '4', name: 'Sarah Kim', role: 'WORKER', buildingId: '3', building: { id: '3', name: "Lee's Summit", code: 'LS' }, active: false }
	];

	const sampleBuildings: Building[] = [
		{ id: '1', name: 'Olathe Warehouse', code: 'OLA' },
		{ id: '2', name: 'Topeka Store', code: 'TOP' },
		{ id: '3', name: "Lee's Summit", code: 'LS' }
	];

	onMount(async () => {
		try {
			const [usersRes, buildingsRes] = await Promise.all([
				fetch('/api/admin/users'),
				fetch('/api/admin/buildings')
			]);
			if (usersRes.ok) users = await usersRes.json();
			else users = sampleUsers;
			if (buildingsRes.ok) buildings = await buildingsRes.json();
			else buildings = sampleBuildings;
		} catch {
			users = sampleUsers;
			buildings = sampleBuildings;
		}
		loading = false;
	});

	function resetForm() {
		form = { name: '', pin: '', role: 'WORKER', buildingId: '', active: true };
		showPin = false;
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

	function startEdit(u: User) {
		if (editingId === u.id) { cancelForm(); return; }
		showAdd = false;
		editingId = u.id;
		form = { name: u.name, pin: '', role: u.role, buildingId: u.buildingId ?? '', active: u.active };
		showPin = false;
	}

	async function saveUser() {
		if (!form.name.trim()) return;
		if (!editingId && !form.pin.trim()) return;
		saving = true;
		try {
			const body: Record<string, unknown> = {
				name: form.name,
				role: form.role,
				buildingId: form.buildingId || null,
				active: form.active
			};
			if (form.pin) body.pin = form.pin;

			if (editingId) {
				const res = await fetch(`/api/admin/users/${editingId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});
				if (res.ok) {
					const updated = await res.json();
					users = users.map((u) => (u.id === editingId ? updated : u));
				}
			} else {
				const res = await fetch('/api/admin/users', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});
				if (res.ok) {
					const created = await res.json();
					users = [created, ...users];
				}
			}
			cancelForm();
		} catch {
			// handle error
		}
		saving = false;
	}

	async function deactivateUser(u: User) {
		try {
			const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
			if (res.ok) {
				users = users.map((x) => (x.id === u.id ? { ...x, active: false } : x));
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
			<h1 class="text-xl font-bold text-gray-900">Users</h1>
		</div>
		<button
			type="button"
			onclick={openAdd}
			class="h-9 px-4 bg-primary text-white text-sm font-semibold rounded-lg active:opacity-80 transition-opacity"
		>
			Add User
		</button>
	</div>

	<!-- Add / Edit Form -->
	{#if showAdd}
		<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
			<h3 class="text-sm font-semibold text-gray-700">New User</h3>
			{@render formFields()}
		</div>
	{/if}

	<!-- User List -->
	{#if loading}
		<div class="space-y-3">
			{#each [1, 2, 3] as _}
				<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
					<div class="h-5 w-32 bg-gray-100 rounded animate-pulse"></div>
					<div class="h-4 w-48 bg-gray-50 rounded animate-pulse mt-2"></div>
				</div>
			{/each}
		</div>
	{:else if users.length === 0}
		<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
			<p class="text-sm text-gray-400">No users yet</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each users as user (user.id)}
				<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
					<button
						type="button"
						onclick={() => startEdit(user)}
						class="w-full px-4 py-3 flex items-center gap-3 text-left active:bg-gray-50 transition-colors"
					>
						<div class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
							<span class="text-sm font-bold text-gray-500">{user.name.charAt(0).toUpperCase()}</span>
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<span class="text-sm font-semibold text-gray-900">{user.name}</span>
								<span class="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide {roleBadge[user.role]}">
									{user.role}
								</span>
							</div>
							<p class="text-xs text-gray-500 mt-0.5">{user.building?.name ?? 'No building'}</p>
						</div>
						<span class="w-2.5 h-2.5 rounded-full flex-shrink-0 {user.active ? 'bg-emerald-500' : 'bg-gray-300'}"></span>
					</button>

					{#if editingId === user.id}
						<div class="border-t border-gray-100 p-4 space-y-3 bg-gray-50/50">
							<h3 class="text-sm font-semibold text-gray-700">Edit User</h3>
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
			placeholder="Full name"
			class="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
		/>
		<div class="relative">
			<input
				type={showPin ? 'text' : 'password'}
				bind:value={form.pin}
				placeholder={editingId ? 'New PIN (leave blank to keep)' : 'PIN'}
				inputmode="numeric"
				maxlength="6"
				class="w-full h-10 px-3 pr-10 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
			/>
			<button
				type="button"
				onclick={() => showPin = !showPin}
				class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400"
				aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
			>
				{#if showPin}
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
					</svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
					</svg>
				{/if}
			</button>
		</div>
		<select
			bind:value={form.role}
			class="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
		>
			<option value="WORKER">Worker</option>
			<option value="MANAGER">Manager</option>
			<option value="ADMIN">Admin</option>
		</select>
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
			onclick={saveUser}
			disabled={saving || !form.name.trim() || (!editingId && !form.pin.trim())}
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
