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
		// Get all scans with PENDING sync status
		const scans = await prisma.scan.findMany({
			where: { syncStatus: 'PENDING' },
			orderBy: { scannedAt: 'asc' },
			take: 100
		});

		// For each scan, try to find a corresponding label with a generated barcode
		const scansWithBarcodes = await Promise.all(
			scans.map(async (scan) => {
				let generatedBarcode: string | null = null;

				// Look for a label that matches this scan's barcode or sku
				if (scan.barcode) {
					const label = await prisma.label.findUnique({
						where: { barcode: scan.barcode }
					});
					if (label) {
						generatedBarcode = label.barcode;
					}
				}

				return {
					id: scan.id,
					barcode: generatedBarcode || scan.barcode,
					sku: scan.sku,
					description: scan.description,
					poNumber: scan.poNumber,
					scanType: scan.scanType,
					scannedAt: scan.scannedAt,
					syncStatus: scan.syncStatus
				};
			})
		);

		return json({ scans: scansWithBarcodes, total: scansWithBarcodes.length });
	} catch (err) {
		console.error('GET /api/sync/scans/pending error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
