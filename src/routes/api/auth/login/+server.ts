import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import { verifyPin, createSession, SESSION_COOKIE_NAME } from '$lib/server/auth';
import { dev } from '$app/environment';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { userId, pin } = await request.json();

	if (!userId || !pin) {
		return json({ success: false, message: 'User and PIN are required' }, { status: 400 });
	}

	const user = await prisma.user.findUnique({
		where: { id: userId, active: true },
		include: { building: true }
	});

	if (!user) {
		return json({ success: false, message: 'User not found' }, { status: 401 });
	}

	const valid = await verifyPin(pin, user.pin);
	if (!valid) {
		return json({ success: false, message: 'Invalid PIN' }, { status: 401 });
	}

	const sessionId = await createSession(user.id);

	cookies.set(SESSION_COOKIE_NAME, sessionId, {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		maxAge: 86400 // 24 hours
	});

	return json({
		success: true,
		user: {
			id: user.id,
			name: user.name,
			role: user.role,
			buildingId: user.buildingId,
			building: user.building
				? { id: user.building.id, name: user.building.name, code: user.building.code }
				: null
		}
	});
};
