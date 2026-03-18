import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE_NAME, deleteSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
	const sessionId = cookies.get(SESSION_COOKIE_NAME);

	if (sessionId) {
		await deleteSession(sessionId);
	}

	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });

	return json({ success: true });
};
