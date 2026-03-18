import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import { generateBarcodeNumber } from '$lib/server/barcode';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const search = url.searchParams.get('search');
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200);
	const offset = parseInt(url.searchParams.get('offset') ?? '0', 10) || 0;

	const where: Record<string, unknown> = {};

	if (search) {
		where.OR = [
			{ barcode: { contains: search, mode: 'insensitive' } },
			{ sku: { contains: search, mode: 'insensitive' } },
			{ description: { contains: search, mode: 'insensitive' } }
		];
	}

	const labels = await prisma.label.findMany({
		where,
		orderBy: { createdAt: 'desc' },
		take: limit,
		skip: offset
	});

	return json(labels);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();
	const { sku, description, poNumber, ticketNumber, buildingCode, labelType, receivedDate } = body;

	if (!labelType) {
		return json({ error: 'labelType is required' }, { status: 400 });
	}

	const code = buildingCode ?? locals.user.building?.code ?? 'GEN';
	const barcode = await generateBarcodeNumber(code);

	const label = await prisma.label.create({
		data: {
			barcode,
			labelType,
			sku: sku ?? null,
			description: description ?? null,
			poNumber: poNumber ?? null,
			ticketNumber: ticketNumber ?? null,
			buildingCode: code,
			receivedDate: receivedDate ? new Date(receivedDate) : null
		}
	});

	return json(label, { status: 201 });
};
