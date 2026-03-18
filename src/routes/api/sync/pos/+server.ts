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
		const { pos, lines } = body as {
			pos: Array<{
				poNumber: string;
				vendorId?: string;
				vendorName?: string;
				status?: string;
				poDate?: string;
				expectedDate?: string;
			}>;
			lines: Array<{
				poNumber: string;
				sku: string;
				description?: string;
				qtyOrdered?: number;
				qtyReceived?: number;
				itemCost?: number;
				barcode?: string;
			}>;
		};

		if (!pos || !Array.isArray(pos)) {
			return json({ error: 'pos array is required' }, { status: 400 });
		}

		let upsertedPOs = 0;
		let upsertedLines = 0;

		// Upsert PO headers
		for (const po of pos) {
			const vendor = po.vendorName || po.vendorId || null;
			const expectedDate = po.expectedDate ? new Date(po.expectedDate) : null;

			// Count lines for this PO
			const poLines = (lines || []).filter((l) => l.poNumber === po.poNumber);

			await prisma.poCache.upsert({
				where: { poNumber: po.poNumber },
				create: {
					poNumber: po.poNumber,
					vendor,
					status: po.status || null,
					expectedDate,
					totalItems: poLines.length,
					lastSyncedAt: new Date()
				},
				update: {
					vendor,
					status: po.status || undefined,
					expectedDate,
					totalItems: poLines.length,
					lastSyncedAt: new Date()
				}
			});
			upsertedPOs++;
		}

		// Upsert PO detail lines
		if (lines && Array.isArray(lines)) {
			for (const line of lines) {
				// Find the parent PO cache record
				const poCache = await prisma.poCache.findUnique({
					where: { poNumber: line.poNumber }
				});

				if (!poCache) continue;

				// Look for existing line by poId + sku
				const existingLine = await prisma.poLineCache.findFirst({
					where: { poId: poCache.id, sku: line.sku }
				});

				if (existingLine) {
					await prisma.poLineCache.update({
						where: { id: existingLine.id },
						data: {
							description: line.description || existingLine.description,
							qtyOrdered: line.qtyOrdered ?? existingLine.qtyOrdered,
							qtyReceived: line.qtyReceived ?? existingLine.qtyReceived,
							itemCost: line.itemCost ?? existingLine.itemCost,
							barcode: line.barcode || existingLine.barcode,
							lastSyncedAt: new Date()
						}
					});
				} else {
					await prisma.poLineCache.create({
						data: {
							poId: poCache.id,
							sku: line.sku,
							description: line.description || null,
							qtyOrdered: line.qtyOrdered ?? 0,
							qtyReceived: line.qtyReceived ?? 0,
							itemCost: line.itemCost ?? null,
							barcode: line.barcode || null,
							lastSyncedAt: new Date()
						}
					});
				}
				upsertedLines++;
			}
		}

		return json({
			message: 'Sync complete',
			upsertedPOs,
			upsertedLines,
			timestamp: new Date().toISOString()
		});
	} catch (err) {
		console.error('POST /api/sync/pos error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
