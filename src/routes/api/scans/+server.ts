import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const type = url.searchParams.get('type');
	const poNumber = url.searchParams.get('poNumber');
	const barcode = url.searchParams.get('barcode');
	const dateFrom = url.searchParams.get('dateFrom');
	const dateTo = url.searchParams.get('dateTo');
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200);
	const offset = parseInt(url.searchParams.get('offset') ?? '0', 10) || 0;

	const where: Record<string, unknown> = {};

	if (type) where.scanType = type;
	if (poNumber) where.poNumber = { contains: poNumber, mode: 'insensitive' };
	if (barcode) where.barcode = { contains: barcode, mode: 'insensitive' };
	if (dateFrom || dateTo) {
		where.scannedAt = {};
		if (dateFrom) (where.scannedAt as Record<string, unknown>).gte = new Date(dateFrom);
		if (dateTo) (where.scannedAt as Record<string, unknown>).lte = new Date(dateTo);
	}

	const scans = await prisma.scan.findMany({
		where,
		include: {
			user: { select: { id: true, name: true } },
			building: { select: { id: true, name: true, code: true } }
		},
		orderBy: { scannedAt: 'desc' },
		take: limit,
		skip: offset
	});

	return json(scans);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();
	const { barcode, scanType, poNumber, sku, description, ticketNumber, quantity } = body;

	if (!barcode || !scanType) {
		return json({ error: 'barcode and scanType are required' }, { status: 400 });
	}

	const scan = await prisma.scan.create({
		data: {
			barcode,
			scanType,
			poNumber: poNumber ?? null,
			sku: sku ?? null,
			description: description ?? null,
			ticketNumber: ticketNumber ?? null,
			quantity: quantity ?? 1,
			userId: locals.user.id,
			buildingId: locals.user.buildingId
		},
		include: {
			user: { select: { id: true, name: true } },
			building: { select: { id: true, name: true, code: true } }
		}
	});

	return json(scan, { status: 201 });
};
