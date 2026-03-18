import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { id } = params;

	try {
		const template = await prisma.labelTemplate.findUniqueOrThrow({
			where: { id }
		});
		return json(template);
	} catch (err: any) {
		if (err?.code === 'P2025') {
			return json({ error: 'Template not found' }, { status: 404 });
		}
		throw err;
	}
};

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { id } = params;
	const body = await request.json();
	const { name, width, height, elements, isDefault } = body;

	// If setting as default, unset any existing default
	if (isDefault) {
		await prisma.labelTemplate.updateMany({
			where: { isDefault: true, id: { not: id } },
			data: { isDefault: false }
		});
	}

	try {
		const template = await prisma.labelTemplate.update({
			where: { id },
			data: {
				...(name !== undefined && { name }),
				...(width !== undefined && { width }),
				...(height !== undefined && { height }),
				...(elements !== undefined && { elements }),
				...(isDefault !== undefined && { isDefault })
			}
		});
		return json(template);
	} catch (err: any) {
		if (err?.code === 'P2025') {
			return json({ error: 'Template not found' }, { status: 404 });
		}
		throw err;
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { id } = params;

	try {
		await prisma.labelTemplate.delete({ where: { id } });
		return json({ success: true });
	} catch (err: any) {
		if (err?.code === 'P2025') {
			return json({ error: 'Template not found' }, { status: 404 });
		}
		throw err;
	}
};
