import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import { hashPin } from '$lib/server/auth';

function isAdminOrManager(user: App.Locals['user']): boolean {
	return user?.role === 'ADMIN' || user?.role === 'MANAGER';
}

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!isAdminOrManager(locals.user)) return json({ error: 'Forbidden' }, { status: 403 });

	const users = await prisma.user.findMany({
		select: {
			id: true,
			name: true,
			role: true,
			buildingId: true,
			building: { select: { id: true, name: true, code: true } },
			active: true,
			createdAt: true,
			updatedAt: true
		},
		orderBy: { name: 'asc' }
	});

	return json(users);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!isAdminOrManager(locals.user)) return json({ error: 'Forbidden' }, { status: 403 });

	const body = await request.json();
	const { name, pin, role, buildingId } = body;

	if (!name || !pin) {
		return json({ error: 'name and pin are required' }, { status: 400 });
	}

	const hashedPin = await hashPin(pin);

	const user = await prisma.user.create({
		data: {
			name,
			pin: hashedPin,
			role: role ?? 'WORKER',
			buildingId: buildingId ?? null
		},
		select: {
			id: true,
			name: true,
			role: true,
			buildingId: true,
			building: { select: { id: true, name: true, code: true } },
			active: true,
			createdAt: true,
			updatedAt: true
		}
	});

	return json(user, { status: 201 });
};
