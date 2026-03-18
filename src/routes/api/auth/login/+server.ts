import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import { verifyPin, createSession, SESSION_COOKIE_NAME } from '$lib/server/auth';
import { dev } from '$app/environment';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { pin } = await request.json();

	if (!pin) {
		return json({ success: false, message: 'PIN is required' }, { status: 400 });
	}

	// Find user by trying PIN against all active users
	const activeUsers = await prisma.user.findMany({
		where: { active: true },
		include: { building: true }
	});

	let matchedUser = null;
	for (const user of activeUsers) {
		const valid = await verifyPin(pin, user.pin);
		if (valid) {
			matchedUser = user;
			break;
		}
	}

	if (!matchedUser) {
		return json({ success: false, message: 'Invalid PIN' }, { status: 401 });
	}

	const sessionId = await createSession(matchedUser.id);

	cookies.set(SESSION_COOKIE_NAME, sessionId, {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		maxAge: 86400
	});

	return json({
		success: true,
		user: {
			id: matchedUser.id,
			name: matchedUser.name,
			role: matchedUser.role,
			buildingId: matchedUser.buildingId,
			building: matchedUser.building
				? { id: matchedUser.building.id, name: matchedUser.building.name, code: matchedUser.building.code }
				: null
		}
	});
};
