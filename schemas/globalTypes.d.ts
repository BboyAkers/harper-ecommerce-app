/**
 Generated from your schema files
 Manual changes will be lost!
 > harper dev .
 */
import type { Table } from 'harperdb';
import type { Agent, Cart, Listing, Order, Product, SavedSearch, TodoList, User, harperfast_vite_vite_build_info, house_listings_Listing, house_listings_ListingImage, mission_control_AppSetting, mission_control_CalendarEvent, mission_control_ChatMessage, mission_control_Content, mission_control_CrewAgent, mission_control_DriveFile, mission_control_Heartbeat, mission_control_JobRun, mission_control_MemoryEntry, mission_control_Project, mission_control_ProjectFile, mission_control_ReferenceArticle, mission_control_ResearchResult, mission_control_ScheduledJob, mission_control_WorkItem, mqtt_live_scoring_Match, mqtt_live_scoring_ScoreEvent, oauth_csrf_token, oauth_harper_oauth_mcp_client, oauth_harper_oauth_mcp_key, oauth_mcp_assertion_jti, oauth_mcp_auth_code, oauth_mcp_refresh_family, product_list_Product, url_shortener_Link } from './types.ts';

declare module 'harperdb' {
	export const tables: {
		Agent: { new(...args: any[]): Table<Agent> };
		Cart: { new(...args: any[]): Table<Cart> };
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
			Cart: { new(...args: any[]): Table<Cart> };
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
		house_listings: {
			Listing: { new(...args: any[]): Table<house_listings_Listing> };
			ListingImage: { new(...args: any[]): Table<house_listings_ListingImage> };
		};
		mission_control: {
			AppSetting: { new(...args: any[]): Table<mission_control_AppSetting> };
			CalendarEvent: { new(...args: any[]): Table<mission_control_CalendarEvent> };
			ChatMessage: { new(...args: any[]): Table<mission_control_ChatMessage> };
			Content: { new(...args: any[]): Table<mission_control_Content> };
			CrewAgent: { new(...args: any[]): Table<mission_control_CrewAgent> };
			DriveFile: { new(...args: any[]): Table<mission_control_DriveFile> };
			Heartbeat: { new(...args: any[]): Table<mission_control_Heartbeat> };
			JobRun: { new(...args: any[]): Table<mission_control_JobRun> };
			MemoryEntry: { new(...args: any[]): Table<mission_control_MemoryEntry> };
			Project: { new(...args: any[]): Table<mission_control_Project> };
			ProjectFile: { new(...args: any[]): Table<mission_control_ProjectFile> };
			ReferenceArticle: { new(...args: any[]): Table<mission_control_ReferenceArticle> };
			ResearchResults: { new(...args: any[]): Table<mission_control_ResearchResult> };
			ScheduledJob: { new(...args: any[]): Table<mission_control_ScheduledJob> };
			WorkItem: { new(...args: any[]): Table<mission_control_WorkItem> };
		};
		mqtt_live_scoring: {
			Match: { new(...args: any[]): Table<mqtt_live_scoring_Match> };
			ScoreEvent: { new(...args: any[]): Table<mqtt_live_scoring_ScoreEvent> };
		};
		oauth: {
			csrf_tokens: { new(...args: any[]): Table<oauth_csrf_token> };
			harper_oauth_mcp_clients: { new(...args: any[]): Table<oauth_harper_oauth_mcp_client> };
			harper_oauth_mcp_keys: { new(...args: any[]): Table<oauth_harper_oauth_mcp_key> };
			mcp_assertion_jtis: { new(...args: any[]): Table<oauth_mcp_assertion_jti> };
			mcp_auth_codes: { new(...args: any[]): Table<oauth_mcp_auth_code> };
			mcp_refresh_families: { new(...args: any[]): Table<oauth_mcp_refresh_family> };
		};
		product_list: {
			Product: { new(...args: any[]): Table<product_list_Product> };
		};
		url_shortener: {
			Link: { new(...args: any[]): Table<url_shortener_Link> };
		};
	};
}
