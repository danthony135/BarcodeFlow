import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import { env } from '$env/dynamic/private';

function requireApiKey(request: Request): boolean {
	const key = request.headers.get('x-api-key');
	return !!key && key === env.SYNC_API_KEY;
}

export const POST: RequestHandler = async ({ request }) => {
	if (!requireApiKey(request)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { scanIds, status, error } = body as {
			scanIds: string[];
			status: 'CONFIRMED' | 'FAILED';
			error?: string;
		};

		if (!scanIds || !Array.isArray(scanIds) || scanIds.length === 0) {
			return json({ error: 'scanIds array is required' }, { status: 400 });
		}

		if (!status || !['CONFIRMED', 'FAILED'].includes(status)) {
			return json({ error: 'status must be CONFIRMED or FAILED' }, { status: 400 });
		}

		const syncStatus = status === 'CONFIRMED' ? 'CONFIRMED' : 'FAILED';
		const now = new Date();

		// Update scan records
		const result = await prisma.scan.updateMany({
			where: { id: { in: scanIds } },
			data: {
				syncStatus,
				syncedToRvAt: status === 'CONFIRMED' ? now : undefined
			}
		});

		// Also log to sync queue for audit
		for (const scanId of scanIds) {
			await prisma.syncQueue.create({
				data: {
					direction: 'TO_RV',
					entityType: 'Scan',
					entityId: scanId,
					payload: { status, error: error || null },
					status: syncStatus,
					processedAt: now
				}
			});
		}

		return json({
			message: `Updated ${result.count} scans to ${status}`,
			updated: result.count,
			timestamp: now.toISOString()
		});
	} catch (err) {
		console.error('POST /api/sync/scans/confirm error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
