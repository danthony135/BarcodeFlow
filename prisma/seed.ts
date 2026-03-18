import { PrismaClient } from '../src/generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'argon2';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
	console.log('Seeding database...');

	// Create buildings
	const warehouse = await prisma.building.upsert({
		where: { code: 'OLA' },
		update: {},
		create: { name: 'Olathe Warehouse', code: 'OLA', address: '123 Industrial Pkwy, Olathe, KS' }
	});

	const topeka = await prisma.building.upsert({
		where: { code: 'TOP' },
		update: {},
		create: { name: 'Topeka Store', code: 'TOP', address: '456 Main St, Topeka, KS' }
	});

	const lees = await prisma.building.upsert({
		where: { code: 'LS' },
		update: {},
		create: { name: "Lee's Summit", code: 'LS', address: "789 Commerce Dr, Lee's Summit, MO" }
	});

	console.log('Buildings created:', warehouse.name, topeka.name, lees.name);

	// Create admin user (PIN: 1234)
	const adminPin = await hash('1234');
	const admin = await prisma.user.upsert({
		where: { id: 'admin-user' },
		update: {},
		create: {
			id: 'admin-user',
			name: 'Dan',
			pin: adminPin,
			role: 'ADMIN',
			buildingId: warehouse.id
		}
	});

	// Create worker user (PIN: 0000)
	const workerPin = await hash('0000');
	const worker = await prisma.user.upsert({
		where: { id: 'worker-user' },
		update: {},
		create: {
			id: 'worker-user',
			name: 'Worker',
			pin: workerPin,
			role: 'WORKER',
			buildingId: warehouse.id
		}
	});

	console.log('Users created:', admin.name, worker.name);

	// Create sample POs
	const po1 = await prisma.poCache.upsert({
		where: { poNumber: 'PO-4521' },
		update: {},
		create: {
			poNumber: 'PO-4521',
			vendor: 'Ashley Furniture',
			status: 'OPEN',
			totalItems: 15,
			lines: {
				create: [
					{ sku: '8721338', description: 'Altari Sofa - Slate', qtyOrdered: 2, qtyReceived: 0 },
					{ sku: '8721335', description: 'Altari Loveseat - Slate', qtyOrdered: 2, qtyReceived: 0 },
					{ sku: '8721320', description: 'Altari Ottoman - Slate', qtyOrdered: 3, qtyReceived: 0 },
					{ sku: '8721317', description: 'Altari Chair - Slate', qtyOrdered: 4, qtyReceived: 0 },
					{ sku: '8721355', description: 'Altari Sleeper - Slate', qtyOrdered: 4, qtyReceived: 0 }
				]
			}
		}
	});

	const po2 = await prisma.poCache.upsert({
		where: { poNumber: 'PO-4518' },
		update: {},
		create: {
			poNumber: 'PO-4518',
			vendor: 'Serta Simmons',
			status: 'OPEN',
			totalItems: 8,
			lines: {
				create: [
					{ sku: 'SRT-500QN', description: 'iComfort Queen Mattress', qtyOrdered: 3, qtyReceived: 2 },
					{ sku: 'SRT-500KG', description: 'iComfort King Mattress', qtyOrdered: 3, qtyReceived: 2 },
					{ sku: 'SRT-FNDQN', description: 'Foundation Queen', qtyOrdered: 1, qtyReceived: 1 }
				]
			}
		}
	});

	const po3 = await prisma.poCache.upsert({
		where: { poNumber: 'PO-4515' },
		update: {},
		create: {
			poNumber: 'PO-4515',
			vendor: 'La-Z-Boy',
			status: 'OPEN',
			totalItems: 22,
			lines: {
				create: [
					{ sku: 'LZB-330', description: 'Greyson Recliner - Charcoal', qtyOrdered: 6, qtyReceived: 5 },
					{ sku: 'LZB-440', description: 'Trouper Reclining Sofa', qtyOrdered: 4, qtyReceived: 4 },
					{ sku: 'LZB-550', description: 'Pinnacle Recliner', qtyOrdered: 6, qtyReceived: 6 },
					{ sku: 'LZB-660', description: 'Morrison Reclining Loveseat', qtyOrdered: 6, qtyReceived: 5 }
				]
			}
		}
	});

	console.log('POs created:', po1.poNumber, po2.poNumber, po3.poNumber);

	// Create sample printer
	await prisma.printer.upsert({
		where: { id: 'printer-1' },
		update: {},
		create: {
			id: 'printer-1',
			name: 'Warehouse Thermal',
			type: 'THERMAL',
			ipAddress: '192.168.1.100',
			buildingId: warehouse.id
		}
	});

	console.log('Seed complete!');
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect());
