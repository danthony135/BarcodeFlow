import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

function isAdminOrManager(user: App.Locals['user']): boolean {
	return user?.role === 'ADMIN' || user?.role === 'MANAGER';
}

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!isAdminOrManager(locals.user)) return json({ error: 'Forbidden' }, { status: 403 });

	const { id } = params;
	const body = await request.json();
	const { name, code, address, active } = body;

	try {
		const building = await prisma.building.update({
			where: { id },
			data: {
				...(name !== undefined && { name }),
				...(code !== undefined && { code: code.toUpperCase() }),
				...(address !== undefined && { address }),
				...(active !== undefined && { active })
			}
		});
		return json(building);
	} catch (err: any) {
		if (err?.code === 'P2025') {
			return json({ error: 'Building not found' }, { status: 404 });
		}
		if (err?.code === 'P2002') {
			return json({ error: 'Building code already exists' }, { status: 409 });
		}
		throw err;
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!isAdminOrManager(locals.user)) return json({ error: 'Forbidden' }, { status: 403 });

	const { id } = params;

	try {
		const building = await prisma.building.update({
			where: { id },
			data: { active: false }
		});
		return json(building);
	} catch (err: any) {
		if (err?.code === 'P2025') {
			return json({ error: 'Building not found' }, { status: 404 });
		}
		throw err;
	}
};
