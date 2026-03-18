import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const now = new Date();
	const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const tomorrowMidnight = new Date(todayMidnight.getTime() + 24 * 60 * 60 * 1000);

	const [todayScans, pendingSync, labelsPrinted] = await Promise.all([
		prisma.scan.count({
			where: {
				scannedAt: { gte: todayMidnight, lt: tomorrowMidnight }
			}
		}),
		prisma.scan.count({
			where: { syncStatus: 'PENDING' }
		}),
		prisma.label.count({
			where: {
				printedAt: { gte: todayMidnight, lt: tomorrowMidnight }
			}
		})
	]);

	// openPos: count of POs in cache (no sync yet, return 0)
	const openPos = 0;

	return json({ todayScans, pendingSync, openPos, labelsPrinted });
};
