import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const templates = await prisma.labelTemplate.findMany({
		orderBy: { updatedAt: 'desc' }
	});

	return json(templates);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();
	const { name, width, height, elements, isDefault } = body;

	if (!name) {
		return json({ error: 'name is required' }, { status: 400 });
	}

	if (!elements || !Array.isArray(elements)) {
		return json({ error: 'elements must be an array' }, { status: 400 });
	}

	// If setting as default, unset any existing default
	if (isDefault) {
		await prisma.labelTemplate.updateMany({
			where: { isDefault: true },
			data: { isDefault: false }
		});
	}

	const template = await prisma.labelTemplate.create({
		data: {
			name,
			width: width ?? 4,
			height: height ?? 2,
			elements,
			isDefault: isDefault ?? false
		}
	});

	return json(template, { status: 201 });
};
