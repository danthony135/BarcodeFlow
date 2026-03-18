import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { po } = params;

	const poCache = await prisma.poCache.findUnique({
		where: { poNumber: po },
		include: {
			lines: {
				orderBy: { sku: 'asc' }
			}
		}
	});

	if (!poCache) {
		return json({ error: 'PO not found' }, { status: 404 });
	}

	return json({
		poNumber: poCache.poNumber,
		vendor: poCache.vendor,
		status: poCache.status,
		lines: poCache.lines.map((line) => ({
			id: line.id,
			sku: line.sku,
			description: line.description,
			qtyOrdered: line.qtyOrdered,
			qtyReceived: line.qtyReceived,
			barcode: line.barcode
		}))
	});
};
