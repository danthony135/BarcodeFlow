import type { RequestHandler } from './$types';
import { generateBarcodeSvg } from '$lib/server/barcode';

export const GET: RequestHandler = async ({ params }) => {
	const { code } = params;

	if (!code) {
		return new Response('Missing barcode code', { status: 400 });
	}

	try {
		const svg = generateBarcodeSvg(code);

		return new Response(svg, {
			headers: {
				'Content-Type': 'image/svg+xml',
				'Cache-Control': 'public, max-age=3600'
			}
		});
	} catch (err) {
		return new Response('Failed to generate barcode', { status: 500 });
	}
};
