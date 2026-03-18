import { prisma } from './db';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

export const SESSION_COOKIE_NAME = 'barcodeflow_session';

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function hashPin(pin: string): Promise<string> {
	return argon2.hash(pin);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
	return argon2.verify(hash, pin);
}

export async function createSession(userId: string): Promise<string> {
	const sessionId = randomBytes(32).toString('hex');
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

	await prisma.session.create({
		data: {
			id: sessionId,
			userId,
			expiresAt
		}
	});

	return sessionId;
}

export async function validateSession(sessionId: string) {
	const session = await prisma.session.findUnique({
		where: { id: sessionId },
		include: {
			user: {
				include: {
					building: true
				}
			}
		}
	});

	if (!session) return null;

	if (session.expiresAt < new Date()) {
		await prisma.session.delete({ where: { id: sessionId } });
		return null;
	}

	return session.user;
}

export async function deleteSession(sessionId: string): Promise<void> {
	await prisma.session.delete({ where: { id: sessionId } }).catch(() => {
		// Session may already be deleted or expired; ignore
	});
}
