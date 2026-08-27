import { tables } from './lib/tables.ts';

// Product catalog is public: anyone can browse without logging in.
export class Product extends tables.Product {
	allowRead() {
		return true;
	}
}
