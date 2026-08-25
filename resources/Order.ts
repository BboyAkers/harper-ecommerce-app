import { type RequestTarget, tables } from 'harper';
import { computeTotals } from '../shared/pricing.ts';
import type { OrderRecord } from '../shared/types.ts';
import { availableStock, getProductBySlug, type ProductRecord } from './lib/catalog.ts';
import { badRequest, conflict, notFound } from './lib/errors.ts';
import { isSuperUser, requireUser } from './lib/session.ts';

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

/**
 * Orders are writable by anyone and readable only by the customer who placed them.
 *
 * Reads deliberately keep Harper's inherited `allowRead`, which enforces the
 * role's table-level Order permission — so an anonymous request is rejected
 * before it reaches this code. Row scoping is layered on below: the role answers
 * "may this user read orders at all", the overrides answer "which ones".
 */
export class Order extends tables.Order {
	// Guest checkout is supported, so placing an order must not require a session.
	// This opens the endpoint; `post` below does the real validation.
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

	/**
	 * Scope collection reads to the caller's own orders.
	 *
	 * `rowFilter` is evaluated during query execution *and* against the final
	 * materialized record, so it cannot be sidestepped by crafting conditions —
	 * unlike appending an `ownerUsername` condition, which a client-supplied
	 * condition could contradict. Harper runs the same predicate over subscription
	 * events, so a WebSocket subscriber is scoped by this too.
	 */
	search(target: RequestTarget) {
		const user = requireUser(this.getCurrentUser(), 'Sign in to view your orders');
		if (!isSuperUser(user)) {
			const { username } = user;
			target.rowFilter = (record: Partial<OrderRecord>) => record?.ownerUsername === username;
		}
		return super.search(target);
	}

	/**
	 * Scope single-record reads the same way.
	 *
	 * A collection target (`GET /Order/?…`) is *also* routed through `get` — Harper
	 * hands it back to the static `search`, which lands on the override above — so
	 * it has to pass straight through here rather than being treated as a record.
	 */
	async get(target?: unknown) {
		if ((target as RequestTarget | undefined)?.isCollection) return super.get(target as never);

		const record = (await super.get(target as never)) as Partial<OrderRecord> | undefined | null;
		if (!record) return record;

		const user = requireUser(this.getCurrentUser(), 'Sign in to view your orders');
		if (isSuperUser(user)) return record;
		if (record.ownerUsername !== user.username) {
			// 404 rather than 403: order ids are opaque, and a 403 would confirm
			// which of them exist.
			notFound('Order not found');
		}
		return record;
	}
}

