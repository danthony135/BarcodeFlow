<script lang="ts">
	import { onMount } from 'svelte';

	// Collapsible sections state
	let openSections = $state<Record<string, boolean>>({
		requirements: false,
		agent: false,
		apikey: false,
		status: true,
		flow: false
	});

	// Connection status
	let syncStatus = $state<{
		status: string;
		lastPoSync: string | null;
		lastScanSync: string | null;
		pending: { scans: number; labels: number };
		failed: { scans: number; syncQueue: number };
		totals: { scans: number; labels: number; pos: number };
		timestamp: string;
	} | null>(null);
	let statusLoading = $state(false);
	let statusError = $state<string | null>(null);
	let copied = $state<string | null>(null);

	function toggle(section: string) {
		openSections[section] = !openSections[section];
	}

	async function fetchStatus() {
		statusLoading = true;
		statusError = null;
		try {
			const resp = await fetch('/api/sync/status', {
				headers: { 'x-api-key': 'internal-admin-check' }
			});
			if (resp.ok) {
				syncStatus = await resp.json();
			} else {
				statusError = `API returned ${resp.status}`;
			}
		} catch (e) {
			statusError = 'Could not reach sync status endpoint';
		} finally {
			statusLoading = false;
		}
	}

	async function copyToClipboard(text: string, id: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = id;
			setTimeout(() => (copied = null), 2000);
		} catch {
			// fallback
			const ta = document.createElement('textarea');
			ta.value = text;
			document.body.appendChild(ta);
			ta.select();
			document.execCommand('copy');
			document.body.removeChild(ta);
			copied = id;
			setTimeout(() => (copied = null), 2000);
		}
	}

	function timeAgo(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		const diff = Date.now() - new Date(dateStr).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'Just now';
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	function statusColor(dateStr: string | null): string {
		if (!dateStr) return 'bg-gray-300';
		const diff = Date.now() - new Date(dateStr).getTime();
		if (diff < 10 * 60 * 1000) return 'bg-emerald-500'; // < 10 min
		if (diff < 30 * 60 * 1000) return 'bg-amber-500'; // < 30 min
		return 'bg-red-500'; // > 30 min
	}

	onMount(() => {
		fetchStatus();
	});
</script>

<div class="page-enter p-4 space-y-4 pb-32 max-w-3xl mx-auto">
	<!-- Header -->
	<div class="flex items-center gap-3 mb-2">
		<a href="/admin" class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center active:bg-gray-200">
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</a>
		<div>
			<h1 class="text-xl font-bold text-gray-900">Server Setup</h1>
			<p class="text-xs text-gray-500">Deploy the sync agent to connect BarcodeFlow with RETAILvantage</p>
		</div>
	</div>

	<!-- How it works callout -->
	<div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
		<p class="text-sm font-medium text-blue-900 mb-1">No firewall changes needed</p>
		<p class="text-xs text-blue-700">The sync agent runs on your server and makes <strong>outbound</strong> HTTPS requests to BarcodeFlow in the cloud. It pulls PO data down and pushes barcodes back — all outbound traffic. No ports need to be opened, no VPN, no tunnel.</p>
	</div>

	<!-- Section 1: Server Requirements -->
	<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
		<button
			onclick={() => toggle('requirements')}
			class="w-full px-4 py-3.5 flex items-center justify-between text-left"
		>
			<div class="flex items-center gap-3">
				<div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
					<span class="text-base">1</span>
				</div>
				<div>
					<h2 class="text-sm font-semibold text-gray-900">Server Requirements</h2>
					<p class="text-xs text-gray-500">What you need on the on-prem server</p>
				</div>
			</div>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-400 transition-transform {openSections.requirements ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		{#if openSections.requirements}
			<div class="px-4 pb-4 space-y-3 border-t border-gray-50">
				<div class="mt-3 space-y-2">
					<div class="flex items-start gap-2.5">
						<div class="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
						</div>
						<div>
							<p class="text-sm font-medium text-gray-800">Windows Server</p>
							<p class="text-xs text-gray-500">The same server running RETAILvantage and Pervasive SQL / Actian Zen</p>
						</div>
					</div>
					<div class="flex items-start gap-2.5">
						<div class="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
						</div>
						<div>
							<p class="text-sm font-medium text-gray-800">Python 3.11+</p>
							<p class="text-xs text-gray-500">Download from <a href="https://python.org" target="_blank" class="text-primary underline">python.org</a> — check "Add to PATH" during install</p>
						</div>
					</div>
					<div class="flex items-start gap-2.5">
						<div class="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
						</div>
						<div>
							<p class="text-sm font-medium text-gray-800">Pervasive ODBC Driver</p>
							<p class="text-xs text-gray-500">Usually installed with RETAILvantage. Verify in ODBC Data Sources (64-bit).</p>
						</div>
					</div>
					<div class="flex items-start gap-2.5">
						<div class="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
						</div>
						<div>
							<p class="text-sm font-medium text-gray-800">Network Access to Label Printer</p>
							<p class="text-xs text-gray-500">Thermal printer accessible on the local network (e.g., 192.168.1.100:9100)</p>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Section 2: Install Sync Agent -->
	<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
		<button
			onclick={() => toggle('agent')}
			class="w-full px-4 py-3.5 flex items-center justify-between text-left"
		>
			<div class="flex items-center gap-3">
				<div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
					<span class="text-base">2</span>
				</div>
				<div>
					<h2 class="text-sm font-semibold text-gray-900">Install Sync Agent</h2>
					<p class="text-xs text-gray-500">Python agent that syncs data with Pervasive SQL</p>
				</div>
			</div>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-400 transition-transform {openSections.agent ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		{#if openSections.agent}
			<div class="px-4 pb-4 space-y-4 border-t border-gray-50">
				<div class="mt-3">
					<h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Step 1: Download the sync-agent folder</h3>
					<p class="text-xs text-gray-600 mb-2">Copy the <code class="bg-gray-100 px-1 py-0.5 rounded">sync-agent/</code> folder to the server, e.g. <code class="bg-gray-100 px-1 py-0.5 rounded">C:\BarcodeFlow\sync-agent\</code></p>
				</div>

				<div>
					<h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Step 2: Create virtual environment and install dependencies</h3>
					<div class="relative">
						<pre class="bg-gray-900 text-gray-100 text-xs p-3 rounded-lg overflow-x-auto"><code>cd C:\BarcodeFlow\sync-agent
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt</code></pre>
						<button onclick={() => copyToClipboard('cd C:\\BarcodeFlow\\sync-agent\npython -m venv venv\nvenv\\Scripts\\activate\npip install -r requirements.txt', 'ag1')} class="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors">
							{copied === 'ag1' ? 'Copied!' : 'Copy'}
						</button>
					</div>
				</div>

				<div>
					<h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Step 3: Configure</h3>
					<div class="relative">
						<pre class="bg-gray-900 text-gray-100 text-xs p-3 rounded-lg overflow-x-auto"><code>copy config.env.example config.env
notepad config.env</code></pre>
						<button onclick={() => copyToClipboard('copy config.env.example config.env\nnotepad config.env', 'ag2')} class="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors">
							{copied === 'ag2' ? 'Copied!' : 'Copy'}
						</button>
					</div>
					<p class="text-xs text-gray-500 mt-1">Set your ODBC DSN, BarcodeFlow URL, and API key.</p>
				</div>

				<div>
					<h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Step 4: Test connection</h3>
					<div class="relative">
						<pre class="bg-gray-900 text-gray-100 text-xs p-3 rounded-lg overflow-x-auto"><code>python test_connection.py</code></pre>
						<button onclick={() => copyToClipboard('python test_connection.py', 'ag3')} class="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors">
							{copied === 'ag3' ? 'Copied!' : 'Copy'}
						</button>
					</div>
					<p class="text-xs text-gray-500 mt-1">This verifies both the Pervasive SQL and BarcodeFlow API connections.</p>
				</div>

				<div>
					<h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Step 5: Install as Windows Service</h3>
					<div class="relative">
						<pre class="bg-gray-900 text-gray-100 text-xs p-3 rounded-lg overflow-x-auto"><code>python install_service.py install
python install_service.py start</code></pre>
						<button onclick={() => copyToClipboard('python install_service.py install\npython install_service.py start', 'ag4')} class="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors">
							{copied === 'ag4' ? 'Copied!' : 'Copy'}
						</button>
					</div>
					<p class="text-xs text-gray-500 mt-1">The service will auto-start on boot. Check status with <code class="bg-gray-100 px-1 py-0.5 rounded text-xs">python install_service.py status</code></p>
				</div>

				<div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
					<p class="text-xs text-amber-800"><strong>Tip:</strong> For best service management, download <a href="https://nssm.cc/download" target="_blank" class="underline">nssm.exe</a> and place it in the sync-agent folder. The installer will use it automatically.</p>
				</div>
			</div>
		{/if}
	</div>

	<!-- Section 3: API Key Setup -->
	<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
		<button
			onclick={() => toggle('apikey')}
			class="w-full px-4 py-3.5 flex items-center justify-between text-left"
		>
			<div class="flex items-center gap-3">
				<div class="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
					<span class="text-base">3</span>
				</div>
				<div>
					<h2 class="text-sm font-semibold text-gray-900">API Key Setup</h2>
					<p class="text-xs text-gray-500">Secure the sync API with a shared key</p>
				</div>
			</div>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-400 transition-transform {openSections.apikey ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		{#if openSections.apikey}
			<div class="px-4 pb-4 space-y-4 border-t border-gray-50">
				<div class="mt-3">
					<h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Generate an API key</h3>
					<p class="text-xs text-gray-600 mb-2">Use any secure random string. Here is one you can use:</p>
					<div class="relative">
						<pre class="bg-gray-900 text-gray-100 text-xs p-3 rounded-lg overflow-x-auto font-mono"><code>bf-sync-{Math.random().toString(36).slice(2)}-{Math.random().toString(36).slice(2)}</code></pre>
						<button onclick={() => copyToClipboard(`bf-sync-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`, 'apikey')} class="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors">
							{copied === 'apikey' ? 'Copied!' : 'Copy'}
						</button>
					</div>
				</div>

				<div>
					<h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Set in Railway</h3>
					<p class="text-xs text-gray-600 mb-2">Add this environment variable to your BarcodeFlow Railway service:</p>
					<div class="relative">
						<pre class="bg-gray-900 text-gray-100 text-xs p-3 rounded-lg overflow-x-auto"><code>SYNC_API_KEY=your-generated-key-here</code></pre>
						<button onclick={() => copyToClipboard('SYNC_API_KEY=your-generated-key-here', 'railkey')} class="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors">
							{copied === 'railkey' ? 'Copied!' : 'Copy'}
						</button>
					</div>
				</div>

				<div>
					<h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Set in Sync Agent</h3>
					<p class="text-xs text-gray-600 mb-2">Set the same key in the sync agent's <code class="bg-gray-100 px-1 py-0.5 rounded text-xs">config.env</code>:</p>
					<div class="relative">
						<pre class="bg-gray-900 text-gray-100 text-xs p-3 rounded-lg overflow-x-auto"><code>BARCODEFLOW_API_KEY=your-generated-key-here</code></pre>
						<button onclick={() => copyToClipboard('BARCODEFLOW_API_KEY=your-generated-key-here', 'agentkey')} class="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors">
							{copied === 'agentkey' ? 'Copied!' : 'Copy'}
						</button>
					</div>
				</div>

				<div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
					<p class="text-xs text-blue-800"><strong>Important:</strong> Both sides must use the exact same API key. The key is sent as an <code class="bg-blue-100 px-1 rounded">x-api-key</code> header on every sync request.</p>
				</div>
			</div>
		{/if}
	</div>

	<!-- Section 4: Connection Status -->
	<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
		<button
			onclick={() => toggle('status')}
			class="w-full px-4 py-3.5 flex items-center justify-between text-left"
		>
			<div class="flex items-center gap-3">
				<div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
					<span class="text-base">4</span>
				</div>
				<div>
					<h2 class="text-sm font-semibold text-gray-900">Connection Status</h2>
					<p class="text-xs text-gray-500">Live sync health monitoring</p>
				</div>
			</div>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-400 transition-transform {openSections.status ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		{#if openSections.status}
			<div class="px-4 pb-4 space-y-3 border-t border-gray-50">
				{#if statusLoading}
					<div class="mt-3 flex items-center justify-center py-6">
						<div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
						<span class="ml-2 text-sm text-gray-500">Loading status...</span>
					</div>
				{:else if statusError}
					<div class="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
						<p class="text-xs text-red-700">{statusError}</p>
						<p class="text-xs text-red-500 mt-1">The sync agent may not be running or the API key may be incorrect.</p>
					</div>
				{:else if syncStatus}
					<!-- Status grid -->
					<div class="mt-3 grid grid-cols-2 gap-3">
						<div class="bg-gray-50 rounded-lg p-3">
							<div class="flex items-center gap-2 mb-1">
								<div class="w-2.5 h-2.5 rounded-full {statusColor(syncStatus.lastPoSync)}"></div>
								<span class="text-xs font-medium text-gray-600">Last PO Sync</span>
							</div>
							<p class="text-sm font-semibold text-gray-900">{timeAgo(syncStatus.lastPoSync)}</p>
						</div>
						<div class="bg-gray-50 rounded-lg p-3">
							<div class="flex items-center gap-2 mb-1">
								<div class="w-2.5 h-2.5 rounded-full {statusColor(syncStatus.lastScanSync)}"></div>
								<span class="text-xs font-medium text-gray-600">Last Scan Sync</span>
							</div>
							<p class="text-sm font-semibold text-gray-900">{timeAgo(syncStatus.lastScanSync)}</p>
						</div>
						<div class="bg-gray-50 rounded-lg p-3">
							<div class="flex items-center gap-2 mb-1">
								<div class="w-2.5 h-2.5 rounded-full {syncStatus.pending.scans > 0 ? 'bg-amber-500' : 'bg-emerald-500'}"></div>
								<span class="text-xs font-medium text-gray-600">Pending</span>
							</div>
							<p class="text-sm font-semibold text-gray-900">{syncStatus.pending.scans} scans, {syncStatus.pending.labels} labels</p>
						</div>
						<div class="bg-gray-50 rounded-lg p-3">
							<div class="flex items-center gap-2 mb-1">
								<div class="w-2.5 h-2.5 rounded-full {syncStatus.failed.scans > 0 ? 'bg-red-500' : 'bg-emerald-500'}"></div>
								<span class="text-xs font-medium text-gray-600">Failed</span>
							</div>
							<p class="text-sm font-semibold text-gray-900">{syncStatus.failed.scans} scans, {syncStatus.failed.syncQueue} queue</p>
						</div>
					</div>

					<!-- Totals -->
					<div class="bg-gray-50 rounded-lg p-3">
						<p class="text-xs font-medium text-gray-600 mb-2">Totals</p>
						<div class="flex gap-6 text-xs text-gray-700">
							<span><strong>{syncStatus.totals.scans}</strong> scans</span>
							<span><strong>{syncStatus.totals.labels}</strong> labels</span>
							<span><strong>{syncStatus.totals.pos}</strong> POs</span>
						</div>
					</div>
				{:else}
					<div class="mt-3 bg-gray-50 rounded-lg p-4 text-center">
						<p class="text-xs text-gray-500">No status data available. The sync agent may not be configured yet.</p>
					</div>
				{/if}

				<!-- Test button -->
				<button
					onclick={fetchStatus}
					disabled={statusLoading}
					class="w-full h-10 bg-primary text-white font-medium text-sm rounded-lg active:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
					{statusLoading ? 'Testing...' : 'Test Connection'}
				</button>
			</div>
		{/if}
	</div>

	<!-- Section 5: Barcode Flow Explanation -->
	<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
		<button
			onclick={() => toggle('flow')}
			class="w-full px-4 py-3.5 flex items-center justify-between text-left"
		>
			<div class="flex items-center gap-3">
				<div class="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
					<span class="text-base">5</span>
				</div>
				<div>
					<h2 class="text-sm font-semibold text-gray-900">How Barcode Sync Works</h2>
					<p class="text-xs text-gray-500">End-to-end barcode generation and sync flow</p>
				</div>
			</div>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-400 transition-transform {openSections.flow ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		{#if openSections.flow}
			<div class="px-4 pb-4 border-t border-gray-50">
				<div class="mt-3 space-y-0">
					<!-- Step 1 -->
					<div class="flex gap-3">
						<div class="flex flex-col items-center">
							<div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
								<span class="text-xs font-bold text-primary">1</span>
							</div>
							<div class="w-0.5 h-full bg-gray-200 my-1"></div>
						</div>
						<div class="pb-4">
							<p class="text-sm font-medium text-gray-900">Item Arrives</p>
							<p class="text-xs text-gray-500">Worker scans or receives the item in BarcodeFlow. The PO and item data are already synced from RETAILvantage.</p>
						</div>
					</div>

					<!-- Step 2 -->
					<div class="flex gap-3">
						<div class="flex flex-col items-center">
							<div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
								<span class="text-xs font-bold text-primary">2</span>
							</div>
							<div class="w-0.5 h-full bg-gray-200 my-1"></div>
						</div>
						<div class="pb-4">
							<p class="text-sm font-medium text-gray-900">Barcode Generated</p>
							<p class="text-xs text-gray-500">BarcodeFlow generates a unique barcode number following the pattern:</p>
							<div class="mt-1.5 bg-gray-900 rounded-lg p-2.5 inline-block">
								<code class="text-emerald-400 text-xs font-mono">BF-OLA-260318-00042</code>
							</div>
							<p class="text-xs text-gray-400 mt-1">Format: BF-{'{'}building{'}'}-{'{'}YYMMDD{'}'}-{'{'}sequence{'}'}</p>
						</div>
					</div>

					<!-- Step 3 -->
					<div class="flex gap-3">
						<div class="flex flex-col items-center">
							<div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
								<span class="text-xs font-bold text-primary">3</span>
							</div>
							<div class="w-0.5 h-full bg-gray-200 my-1"></div>
						</div>
						<div class="pb-4">
							<p class="text-sm font-medium text-gray-900">Label Printed</p>
							<p class="text-xs text-gray-500">A label with the barcode, description, PO number, and ticket number is printed on the thermal printer and attached to the item.</p>
						</div>
					</div>

					<!-- Step 4 -->
					<div class="flex gap-3">
						<div class="flex flex-col items-center">
							<div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
							</div>
							<div class="w-0.5 h-full bg-gray-200 my-1"></div>
						</div>
						<div class="pb-4">
							<p class="text-sm font-medium text-gray-900">Sync Agent Picks Up Barcode</p>
							<p class="text-xs text-gray-500">The on-prem sync agent polls BarcodeFlow every 2 minutes for new barcodes that need to be written to RETAILvantage.</p>
						</div>
					</div>

					<!-- Step 5 -->
					<div class="flex gap-3">
						<div class="flex flex-col items-center">
							<div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
								</svg>
							</div>
							<div class="w-0.5 h-full bg-gray-200 my-1"></div>
						</div>
						<div class="pb-4">
							<p class="text-sm font-medium text-gray-900">Written to Pervasive SQL</p>
							<p class="text-xs text-gray-500">The sync agent writes the barcode to the <code class="bg-gray-100 px-1 py-0.5 rounded text-xs">ITEM-UPC</code> field in the ITEM table via ODBC. This is the same database RETAILvantage uses.</p>
						</div>
					</div>

					<!-- Step 6 -->
					<div class="flex gap-3">
						<div class="flex flex-col items-center">
							<div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							</div>
						</div>
						<div class="pb-2">
							<p class="text-sm font-medium text-gray-900">RETAILvantage Ready</p>
							<p class="text-xs text-gray-500">RETAILvantage now knows this item's barcode. Scanning it at POS, during inventory, or anywhere in RV will instantly identify the item.</p>
						</div>
					</div>
				</div>

				<!-- Visual summary -->
				<div class="mt-4 bg-gray-50 rounded-lg p-3">
					<p class="text-xs font-medium text-gray-600 mb-2">Data Flow Summary</p>
					<div class="flex items-center justify-between text-xs text-gray-500 gap-1">
						<div class="text-center">
							<div class="w-16 h-10 bg-white rounded border border-gray-200 flex items-center justify-center mb-1">
								<span class="text-xs font-medium text-gray-700">RV</span>
							</div>
							<span class="text-gray-400">Pervasive</span>
						</div>
						<div class="flex flex-col items-center gap-0.5">
							<span class="text-emerald-500 text-xs">POs</span>
							<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-4 text-gray-300" fill="none" viewBox="0 0 32 16"><path d="M0 8h28m0 0l-6-6m6 6l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
						</div>
						<div class="text-center">
							<div class="w-16 h-10 bg-white rounded border border-primary/30 flex items-center justify-center mb-1">
								<span class="text-xs font-bold text-primary">BF</span>
							</div>
							<span class="text-gray-400">Cloud</span>
						</div>
						<div class="flex flex-col items-center gap-0.5">
							<span class="text-blue-500 text-xs">Barcodes</span>
							<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-4 text-gray-300 rotate-180" fill="none" viewBox="0 0 32 16"><path d="M0 8h28m0 0l-6-6m6 6l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
						</div>
						<div class="text-center">
							<div class="w-16 h-10 bg-white rounded border border-gray-200 flex items-center justify-center mb-1">
								<span class="text-xs font-medium text-gray-700">RV</span>
							</div>
							<span class="text-gray-400">Pervasive</span>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
