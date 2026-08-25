import { tables } from 'harper';
import { computeTotals } from '../shared/pricing.ts';
import { availableStock, getProductBySlug, type ProductRecord } from './lib/catalog.ts';
import { badRequest, conflict } from './lib/errors.ts';

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

/** Line items priced from the catalog, paired with the product they came from. */
interface PricedItem {
	product: ProductRecord;
	quantity: number;
	line: {
		slug: string;
		name: string;
		price: number;
		quantity: number;
		image: string;
	};
}

/**
 * Validate the request and re-price every line from the Product table.
 *
 * Nothing about money comes from the client: prices, VAT, and shipping are all
 * derived here, so a tampered payload changes what is *ordered*, never what is
 * charged. `ownerUsername` is stamped from the session when there is one;
 * guest checkout stays supported and leaves it undefined.
 */
async function buildOrder(body: unknown, ownerUsername?: string) {
	if (!body || typeof body !== 'object') badRequest('Order body is required');
	const { customer, paymentMethod, eMoneyNumber, items } = body as OrderInput;

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

	const priced = await priceItems(items);
	const totals = computeTotals(priced.reduce((sum, item) => sum + item.line.price * item.quantity, 0));

	const order = {
		id: crypto.randomUUID(),
		createdAt: new Date().toISOString(),
		ownerUsername,
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
		items: priced.map((item) => item.line),
		...totals,
	};

	return { order, priced };
}

/** Resolve each requested slug to a catalog product and price the line. */
async function priceItems(items: OrderItemInput[]): Promise<PricedItem[]> {
	const priced: PricedItem[] = [];
	for (const item of items) {
		const quantity = Number(item?.quantity);
		if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
			badRequest('Item quantities must be whole numbers between 1 and 99');
		}

		const product = await getProductBySlug(item?.slug);
		if (!product) badRequest(`Unknown product "${item?.slug}"`);

		const stock = availableStock(product);
		if (stock <= 0) conflict(`"${product.shortName ?? product.slug}" is sold out`);
		if (quantity > stock) {
			conflict(`Only ${stock} of "${product.shortName ?? product.slug}" left in stock`);
		}

		priced.push({
			product,
			quantity,
			line: {
				slug: product.slug as string,
				name: product.shortName as string,
				price: product.price as number,
				quantity,
				image: `/assets/cart/image-${product.slug}.jpg`,
			},
		});
	}
	return priced;
}

/**
 * Draw down stock for a placed order.
 *
 * Read-and-decrement runs inside the request's transaction, but two orders for
 * the last unit can still interleave; the stock check above is the guard, not a
 * guarantee. Oversell is corrected on the next write rather than prevented, which
 * is the right trade-off for a demo — a real store would reserve inventory first.
 */
async function drawDownStock(priced: PricedItem[]) {
	for (const { product, quantity } of priced) {
		if (typeof product.stock !== 'number') continue;
		await tables.Product.patch(product.id, { stock: Math.max(0, product.stock - quantity) });
	}
}

export class Order extends tables.Order {
	// Anyone can place an order, including guests. Reading orders back is scoped
	// to the ordering customer — see the `search` override below.
	//
	// TODO(auth): allowCreate/allowRead are deprecated in Harper 5.2.5 in favour
	// of authorizing inside the operation. Migrating means taking over the
	// permission check itself, so it is done as part of the auth work rather than
	// incidentally here.
	allowCreate() {
		return true;
	}

	// Table instance post is invoked as post(data, query) (loadAsInstance default).
	async post(data: unknown, query?: unknown) {
		const user = this.getCurrentUser();
		const { order, priced } = await buildOrder(data, user?.username);
		await super.post(order as never, query as never);
		await drawDownStock(priced);
		return order;
	}
}

