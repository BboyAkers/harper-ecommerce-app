/**
 Generated from your schema files
 Manual changes will be lost!
 > harper dev .
 */
import type { Table } from 'harperdb';
import type { Order, Product, TodoList, User, harperfast_vite_vite_build_info } from './types.ts';

declare module 'harperdb' {
	export const tables: {
		Order: { new(...args: any[]): Table<Order> };
		Product: { new(...args: any[]): Table<Product> };
		TodoList: { new(...args: any[]): Table<TodoList> };
		User: { new(...args: any[]): Table<User> };
	};

	export const databases: {
		data: {
			Order: { new(...args: any[]): Table<Order> };
			Product: { new(...args: any[]): Table<Product> };
			TodoList: { new(...args: any[]): Table<TodoList> };
			User: { new(...args: any[]): Table<User> };
		};
		harperfast_vite: {
			vite_build_info: { new(...args: any[]): Table<harperfast_vite_vite_build_info> };
		};
	};
}
