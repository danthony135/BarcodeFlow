import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import { env } from '$env/dynamic/private';

function requireApiKey(request: Request): boolean {
	const key = request.headers.get('x-api-key');
	return !!key && key === env.SYNC_API_KEY;
}

export const GET: RequestHandler = async ({ request }) => {
	if (!requireApiKey(request)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Last PO sync time
		const lastPo = await prisma.poCache.findFirst({
			orderBy: { lastSyncedAt: 'desc' },
			select: { lastSyncedAt: true }
		});

		// Last confirmed scan sync
		const lastScan = await prisma.scan.findFirst({
			where: { syncStatus: 'CONFIRMED' },
			orderBy: { syncedToRvAt: 'desc' },
			select: { syncedToRvAt: true }
		});

		// Pending counts
		const pendingScans = await prisma.scan.count({
			where: { syncStatus: 'PENDING' }
		});

		const pendingLabels = await prisma.label.count({
			where: {
				createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
			}
		});

		// Failed counts
		const failedScans = await prisma.scan.count({
			where: { syncStatus: 'FAILED' }
		});

		const failedSyncQueue = await prisma.syncQueue.count({
			where: { status: 'FAILED' }
		});

		// Recent sync queue activity
		const recentActivity = await prisma.syncQueue.findMany({
			orderBy: { createdAt: 'desc' },
			take: 10,
			select: {
				id: true,
				direction: true,
				entityType: true,
				status: true,
				error: true,
				createdAt: true,
				processedAt: true
			}
		});

		// Total counts
		const totalScans = await prisma.scan.count();
		const totalLabels = await prisma.label.count();
		const totalPOs = await prisma.poCache.count();

		return json({
			status: 'ok',
			lastPoSync: lastPo?.lastSyncedAt ?? null,
			lastScanSync: lastScan?.syncedToRvAt ?? null,
			pending: {
				scans: pendingScans,
				labels: pendingLabels
			},
			failed: {
				scans: failedScans,
				syncQueue: failedSyncQueue
			},
			totals: {
				scans: totalScans,
				labels: totalLabels,
				pos: totalPOs
			},
			recentActivity,
			timestamp: new Date().toISOString()
		});
	} catch (err) {
		console.error('GET /api/sync/status error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
