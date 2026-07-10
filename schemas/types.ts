/**
 Generated from Harper schema
 Manual changes will be lost!
 > harper dev .
 */
export interface Order {
	id: string;
	createdAt?: string;
	customer?: OrderCustomer;
	paymentMethod?: string;
	eMoneyNumber?: string;
	items?: OrderItem[];
	total?: number;
	shipping?: number;
	vat?: number;
	grandTotal?: number;
}

export type NewOrder = Omit<Order, 'id'>;
export type { Order as OrderRecord };
export type OrderRecords = Order[];
export type NewOrderRecord = Omit<Order, 'id'>;

export interface Product {
	id: string;
	ord?: number;
	slug?: string;
	name?: string;
	shortName?: string;
	category?: string;
	new?: boolean;
	price?: number;
	description?: string;
	features?: string;
	includes?: IncludedItem[];
	image?: ImageSet;
	categoryImage?: ImageSet;
	gallery?: Gallery;
	others?: RelatedProduct[];
}

export type NewProduct = Omit<Product, 'id'>;
export type { Product as ProductRecord };
export type ProductRecords = Product[];
export type NewProductRecord = Omit<Product, 'id'>;

export interface TodoList {
	id: string;
	description?: string;
	status?: string;
}

export type NewTodoList = Omit<TodoList, 'id'>;
export type { TodoList as TodoListRecord };
export type TodoListRecords = TodoList[];
export type NewTodoListRecord = Omit<TodoList, 'id'>;

export interface User {
	id: string;
	createdAt?: string;
	email?: string;
}

export type NewUser = Omit<User, 'id'>;
export type { User as UserRecord };
export type UserRecords = User[];
export type NewUserRecord = Omit<User, 'id'>;

export interface harperfast_vite_vite_build_info {
	appName: string;
	status?: string;
}

export type harperfast_vite_Newvite_build_info = Omit<harperfast_vite_vite_build_info, 'appName'>;
export type { harperfast_vite_vite_build_info as harperfast_vite_vite_build_infoRecord };
export type harperfast_vite_vite_build_infoRecords = harperfast_vite_vite_build_info[];
export type harperfast_vite_Newvite_build_infoRecord = Omit<harperfast_vite_vite_build_info, 'appName'>;
