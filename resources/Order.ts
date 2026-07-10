import { tables } from 'harper';

const SHIPPING = 50;
const VAT_RATE = 0.2;

interface OrderItemInput {
	slug: string;
	quantity: number;
}

interface OrderInput {
	customer: {
		name: string;
		email: string;
		phone: string;
		address: string;
		zip: string;
		city: string;
		country: string;
	};
	paymentMethod: 'e-money' | 'cash-on-delivery';
	eMoneyNumber?: string;
	items: OrderItemInput[];
}

const REQUIRED_CUSTOMER_FIELDS = ['name', 'email', 'phone', 'address', 'zip', 'city', 'country'] as const;

function badRequest(message: string): never {
	const error = new Error(message) as Error & { statusCode: number };
	error.statusCode = 400;
	throw error;
}

async function buildOrder(input: OrderInput) {
	if (!input || typeof input !== 'object') badRequest('Order body is required');
	const { customer, paymentMethod, eMoneyNumber, items } = input;

	if (!customer || typeof customer !== 'object') badRequest('Customer details are required');
	for (const field of REQUIRED_CUSTOMER_FIELDS) {
		if (typeof customer[field] !== 'string' || customer[field].trim() === '') {
			badRequest(`Customer field "${field}" is required`);
		}
	}
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) badRequest('Customer email is not valid');

	if (paymentMethod !== 'e-money' && paymentMethod !== 'cash-on-delivery') {
		badRequest('paymentMethod must be "e-money" or "cash-on-delivery"');
	}
	if (paymentMethod === 'e-money' && !eMoneyNumber) badRequest('eMoneyNumber is required for e-money payments');

	if (!Array.isArray(items) || items.length === 0) badRequest('Order must contain at least one item');

	// Prices come from the Product table, never from the client.
	const orderItems = [];
	for (const item of items) {
		const quantity = Number(item?.quantity);
		if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
			badRequest('Item quantities must be whole numbers between 1 and 99');
		}
		const product = await tables.Product.get(item.slug);
		if (!product) badRequest(`Unknown product "${item?.slug}"`);
		orderItems.push({
			slug: product.slug,
			name: product.shortName,
			price: product.price,
			quantity,
			image: `/assets/cart/image-${product.slug}.jpg`,
		});
	}

	const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
	const vat = Math.round(total * VAT_RATE);
	return {
		id: crypto.randomUUID(),
		createdAt: new Date().toISOString(),
		customer: {
			name: customer.name.trim(),
			email: customer.email.trim(),
			phone: customer.phone.trim(),
			address: customer.address.trim(),
			zip: customer.zip.trim(),
			city: customer.city.trim(),
			country: customer.country.trim(),
		},
		paymentMethod,
		eMoneyNumber: paymentMethod === 'e-money' ? String(eMoneyNumber) : undefined,
		items: orderItems,
		total,
		shipping: SHIPPING,
		vat,
		grandTotal: total + SHIPPING,
	};
}

export class Order extends tables.Order {
	// Anyone can place an order; reading orders back still requires a login.
	allowCreate() {
		return true;
	}

	// Table instance post is invoked as post(data, query) (loadAsInstance default).
	async post(data: OrderInput, query?: unknown) {
		const order = await buildOrder(data);
		await super.post(order as never, query as never);
		return order;
	}
}
