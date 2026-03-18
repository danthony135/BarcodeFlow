import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async () => {
	const users = await prisma.user.findMany({
		where: { active: true },
		select: {
			id: true,
			name: true,
			role: true,
			building: {
				select: {
					name: true
				}
			}
		},
		orderBy: { name: 'asc' }
	});

	return json(users);
};
