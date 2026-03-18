import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import { hashPin } from '$lib/server/auth';

function isAdminOrManager(user: App.Locals['user']): boolean {
	return user?.role === 'ADMIN' || user?.role === 'MANAGER';
}

const userSelect = {
	id: true,
	name: true,
	role: true,
	buildingId: true,
	building: { select: { id: true, name: true, code: true } },
	active: true,
	createdAt: true,
	updatedAt: true
} as const;

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!isAdminOrManager(locals.user)) return json({ error: 'Forbidden' }, { status: 403 });

	const { id } = params;
	const body = await request.json();
	const { name, pin, role, buildingId, active } = body;

	const data: Record<string, unknown> = {};
	if (name !== undefined) data.name = name;
	if (role !== undefined) data.role = role;
	if (buildingId !== undefined) data.buildingId = buildingId || null;
	if (active !== undefined) data.active = active;
	if (pin) data.pin = await hashPin(pin);

	try {
		const user = await prisma.user.update({
			where: { id },
			data,
			select: userSelect
		});
		return json(user);
	} catch (err: any) {
		if (err?.code === 'P2025') {
			return json({ error: 'User not found' }, { status: 404 });
		}
		throw err;
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!isAdminOrManager(locals.user)) return json({ error: 'Forbidden' }, { status: 403 });

	const { id } = params;

	try {
		const user = await prisma.user.update({
			where: { id },
			data: { active: false },
			select: userSelect
		});
		return json(user);
	} catch (err: any) {
		if (err?.code === 'P2025') {
			return json({ error: 'User not found' }, { status: 404 });
		}
		throw err;
	}
};
