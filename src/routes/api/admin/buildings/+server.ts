import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

function isAdminOrManager(user: App.Locals['user']): boolean {
	return user?.role === 'ADMIN' || user?.role === 'MANAGER';
}

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!isAdminOrManager(locals.user)) return json({ error: 'Forbidden' }, { status: 403 });

	const buildings = await prisma.building.findMany({
		orderBy: { name: 'asc' }
	});

	return json(buildings);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!isAdminOrManager(locals.user)) return json({ error: 'Forbidden' }, { status: 403 });

	const body = await request.json();
	const { name, code, address } = body;

	if (!name || !code) {
		return json({ error: 'name and code are required' }, { status: 400 });
	}

	try {
		const building = await prisma.building.create({
			data: {
				name,
				code: code.toUpperCase(),
				address: address ?? null
			}
		});
		return json(building, { status: 201 });
	} catch (err: any) {
		if (err?.code === 'P2002') {
			return json({ error: 'Building code already exists' }, { status: 409 });
		}
		throw err;
	}
};
