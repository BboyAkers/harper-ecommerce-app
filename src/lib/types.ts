export interface ImageSet {
	mobile: string;
	tablet: string;
	desktop: string;
}

export interface Product {
	id: string;
	ord: number;
	slug: string;
	name: string;
	shortName: string;
	category: 'headphones' | 'speakers' | 'earphones';
	new: boolean;
	price: number;
	description: string;
	features: string;
	includes: { quantity: number; item: string }[];
	image: ImageSet;
	categoryImage: ImageSet;
	gallery: { first: ImageSet; second: ImageSet; third: ImageSet };
	others: { slug: string; name: string; shortName: string; image: ImageSet }[];
}

export interface CartItem {
	slug: string;
	shortName: string;
	price: number;
	image: string;
	quantity: number;
}

export interface OrderPayload {
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
	items: { slug: string; quantity: number }[];
}

export interface OrderConfirmation {
	id: string;
	items: { slug: string; name: string; price: number; quantity: number; image: string }[];
	total: number;
	shipping: number;
	vat: number;
	grandTotal: number;
}
