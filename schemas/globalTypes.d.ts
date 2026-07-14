/**
 Generated from your schema files
 Manual changes will be lost!
 > harper dev .
 */
import type { Table } from 'harperdb';
import type { Agent, Listing, Order, Product, SavedSearch, TodoList, User, harperfast_vite_vite_build_info } from './types.ts';

declare module 'harperdb' {
	export const tables: {
		Agent: { new(...args: any[]): Table<Agent> };
		Listing: { new(...args: any[]): Table<Listing> };
		Order: { new(...args: any[]): Table<Order> };
		Product: { new(...args: any[]): Table<Product> };
		SavedSearch: { new(...args: any[]): Table<SavedSearch> };
		TodoList: { new(...args: any[]): Table<TodoList> };
		User: { new(...args: any[]): Table<User> };
	};

	export const databases: {
		data: {
			Agent: { new(...args: any[]): Table<Agent> };
			Listing: { new(...args: any[]): Table<Listing> };
			Order: { new(...args: any[]): Table<Order> };
			Product: { new(...args: any[]): Table<Product> };
			SavedSearch: { new(...args: any[]): Table<SavedSearch> };
			TodoList: { new(...args: any[]): Table<TodoList> };
			User: { new(...args: any[]): Table<User> };
		};
		harperfast_vite: {
			vite_build_info: { new(...args: any[]): Table<harperfast_vite_vite_build_info> };
		};
	};
}
