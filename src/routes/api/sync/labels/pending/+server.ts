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
		const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

		// Get labels created in the last 24 hours
		const recentLabels = await prisma.label.findMany({
			where: {
				createdAt: { gte: oneDayAgo }
			},
			orderBy: { createdAt: 'desc' }
		});

		// Find which labels already have a confirmed scan (meaning barcode was written to RV)
		const confirmedBarcodes = await prisma.scan.findMany({
			where: {
				barcode: { in: recentLabels.map((l) => l.barcode) },
				syncStatus: 'CONFIRMED'
			},
			select: { barcode: true }
		});

		const confirmedSet = new Set(confirmedBarcodes.map((s) => s.barcode));

		// Return labels that don't have a corresponding confirmed scan
		const pendingLabels = recentLabels
			.filter((label) => !confirmedSet.has(label.barcode))
			.map((label) => ({
				id: label.id,
				barcode: label.barcode,
				labelType: label.labelType,
				sku: label.sku,
				description: label.description,
				poNumber: label.poNumber,
				buildingCode: label.buildingCode,
				createdAt: label.createdAt
			}));

		return json({ labels: pendingLabels, total: pendingLabels.length });
	} catch (err) {
		console.error('GET /api/sync/labels/pending error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
