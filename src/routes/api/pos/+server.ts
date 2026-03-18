import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const pos = await prisma.poCache.findMany({
		include: {
			lines: {
				select: { qtyReceived: true }
			}
		},
		orderBy: { lastSyncedAt: 'desc' }
	});

	const result = pos.map((po) => ({
		poNumber: po.poNumber,
		vendor: po.vendor,
		status: po.status,
		totalItems: po.totalItems,
		receivedCount: po.lines.reduce((sum, l) => sum + l.qtyReceived, 0),
		lastSyncedAt: po.lastSyncedAt
	}));

	return json(result);
};
