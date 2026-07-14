/**
 Generated from HarperDB schema
 Manual changes will be lost!
 > harper dev .
 */
export interface Agent {
	id: string;
	brokerage?: string;
	email?: string;
	name?: string;
	phone?: string;
}

export type NewAgent = Omit<Agent, 'id'>;
export type { Agent as AgentRecord };
export type AgentRecords = Agent[];
export type NewAgentRecord = Omit<Agent, 'id'>;

export interface Listing {
	id: string;
	addressLine?: string;
	agentId?: string;
	baths?: number;
	beds?: number;
	city?: string;
	createdTime?: number;
	description?: string;
	embedding?: number[];
	features?: string[];
	geohash?: string;
	heroPhoto?: any;
	lat?: number;
	listPrice?: number;
	lng?: number;
	mlsId?: string;
	photos?: any[];
	propertyType?: string;
	sqft?: number;
	state?: string;
	status?: string;
	updatedTime?: number;
	yearBuilt?: number;
	zip?: string;
}

export type NewListing = Omit<Listing, 'id'>;
export type { Listing as ListingRecord };
export type ListingRecords = Listing[];
export type NewListingRecord = Omit<Listing, 'id'>;

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

export interface SavedSearch {
	id: string;
	createdTime?: number;
	criteria?: any;
	label?: string;
	userId?: string;
}

export type NewSavedSearch = Omit<SavedSearch, 'id'>;
export type { SavedSearch as SavedSearchRecord };
export type SavedSearchRecords = SavedSearch[];
export type NewSavedSearchRecord = Omit<SavedSearch, 'id'>;

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
