import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE_NAME, validateSession } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get(SESSION_COOKIE_NAME);

	if (sessionId) {
		const user = await validateSession(sessionId);
		if (user) {
			event.locals.user = {
				id: user.id,
				name: user.name,
				role: user.role,
				buildingId: user.buildingId,
				building: user.building
					? { id: user.building.id, name: user.building.name, code: user.building.code }
					: null
			};
		} else {
			// Session invalid or expired — clear the cookie
			event.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
			event.locals.user = null;
		}
	} else {
		event.locals.user = null;
	}

	return resolve(event);
};
