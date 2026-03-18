import { prisma } from './db';
import bwipjs from 'bwip-js';

export async function generateBarcodeNumber(buildingCode: string): Promise<string> {
	const now = new Date();
	const yy = String(now.getFullYear()).slice(-2);
	const mm = String(now.getMonth() + 1).padStart(2, '0');
	const dd = String(now.getDate()).padStart(2, '0');
	const datePart = `${yy}${mm}${dd}`;

	// Count today's labels to determine sequence number
	const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

	const todayCount = await prisma.label.count({
		where: {
			createdAt: {
				gte: startOfDay,
				lt: endOfDay
			}
		}
	});

	const seq = String(todayCount + 1).padStart(5, '0');

	return `BF-${buildingCode}-${datePart}-${seq}`;
}

export function generateBarcodeSvg(text: string): string {
	return bwipjs.toSVG({
		bcid: 'code128',
		text,
		scale: 3,
		height: 15,
		includetext: true,
		textxalign: 'center'
	});
}
