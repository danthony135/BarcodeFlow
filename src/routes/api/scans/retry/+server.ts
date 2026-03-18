import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

// Retry sync for a single scan or all failed scans
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();
	const { scanId } = body;

	const where: Record<string, unknown> = { syncStatus: 'FAILED' };
	if (scanId) where.id = scanId;

	const updated = await prisma.scan.updateMany({
		where,
		data: {
			syncStatus: 'PENDING',
			syncedToRvAt: null
		}
	});

	return json({ retriedCount: updated.count });
};
