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

export interface house_listings_Listing {
	id: string;
	address?: string;
	bathrooms?: number;
	bedrooms?: number;
	city?: string;
	createdAt?: number;
	description?: string;
	imageUrl?: string;
	latitude?: number;
	longitude?: number;
	price?: number;
	propertyType?: string;
	sqft?: number;
	state?: string;
	status?: string;
	yearBuilt?: number;
	zip?: string;
}

export type house_listings_NewListing = Omit<house_listings_Listing, 'id'>;
export type { house_listings_Listing as house_listings_ListingRecord };
export type house_listings_ListingRecords = house_listings_Listing[];
export type house_listings_NewListingRecord = Omit<house_listings_Listing, 'id'>;

export interface house_listings_ListingImage {
	id: string;
	contentType?: string;
	credit?: string;
	image?: any;
	size?: number;
	sourceFile?: string;
	storedAt?: number;
}

export type house_listings_NewListingImage = Omit<house_listings_ListingImage, 'id'>;
export type { house_listings_ListingImage as house_listings_ListingImageRecord };
export type house_listings_ListingImageRecords = house_listings_ListingImage[];
export type house_listings_NewListingImageRecord = Omit<house_listings_ListingImage, 'id'>;

export interface mission_control_AppSetting {
	id: string;
	updatedAt?: number;
	value?: string;
}

export type mission_control_NewAppSetting = Omit<mission_control_AppSetting, 'id'>;
export type { mission_control_AppSetting as mission_control_AppSettingRecord };
export type mission_control_AppSettingRecords = mission_control_AppSetting[];
export type mission_control_NewAppSettingRecord = Omit<mission_control_AppSetting, 'id'>;

export interface mission_control_CalendarEvent {
	id: string;
	allDay?: boolean;
	calendarId?: string;
	description?: string;
	endAt?: number;
	htmlLink?: string;
	location?: string;
	organizer?: string;
	startAt?: number;
	status?: string;
	summary?: string;
	updatedAt?: number;
}

export type mission_control_NewCalendarEvent = Omit<mission_control_CalendarEvent, 'id'>;
export type { mission_control_CalendarEvent as mission_control_CalendarEventRecord };
export type mission_control_CalendarEventRecords = mission_control_CalendarEvent[];
export type mission_control_NewCalendarEventRecord = Omit<mission_control_CalendarEvent, 'id'>;

export interface mission_control_ChatMessage {
	id: string;
	agentId?: string;
	at?: number;
	content?: string;
	costUsd?: number;
	error?: string;
	inputTokens?: number;
	model?: string;
	outputTokens?: number;
	role?: string;
}

export type mission_control_NewChatMessage = Omit<mission_control_ChatMessage, 'id'>;
export type { mission_control_ChatMessage as mission_control_ChatMessageRecord };
export type mission_control_ChatMessageRecords = mission_control_ChatMessage[];
export type mission_control_NewChatMessageRecord = Omit<mission_control_ChatMessage, 'id'>;

export interface mission_control_Content {
	id: string;
	aiScore?: number;
	aiScoreDetail?: string;
	aiScoreMethod?: string;
	aiScoredAt?: number;
	authorAgentId?: string;
	body?: string;
	costUsd?: number;
	createdAt?: number;
	path?: string;
	projectId?: string;
	status?: string;
	title?: string;
	type?: string;
	updatedAt?: number;
	url?: string;
	words?: number;
}

export type mission_control_NewContent = Omit<mission_control_Content, 'id'>;
export type { mission_control_Content as mission_control_ContentRecord };
export type mission_control_ContentRecords = mission_control_Content[];
export type mission_control_NewContentRecord = Omit<mission_control_Content, 'id'>;

export interface mission_control_CrewAgent {
	id: string;
	autonomyTier?: string;
	color?: string;
	currentActivity?: string;
	description?: string;
	initials?: string;
	ink?: string;
	isOrchestrator?: boolean;
	lastHeartbeat?: number;
	model?: string;
	name?: string;
	role?: string;
	sortOrder?: number;
	status?: string;
	systemPrompt?: string;
}

export type mission_control_NewCrewAgent = Omit<mission_control_CrewAgent, 'id'>;
export type { mission_control_CrewAgent as mission_control_CrewAgentRecord };
export type mission_control_CrewAgentRecords = mission_control_CrewAgent[];
export type mission_control_NewCrewAgentRecord = Omit<mission_control_CrewAgent, 'id'>;

export interface mission_control_DriveFile {
	id: string;
	folderId?: string;
	iconLink?: string;
	mimeType?: string;
	modifiedAt?: number;
	name?: string;
	owners?: string[];
	size?: number;
	sourceRecordId?: string;
	syncedAt?: number;
	webViewLink?: string;
}

export type mission_control_NewDriveFile = Omit<mission_control_DriveFile, 'id'>;
export type { mission_control_DriveFile as mission_control_DriveFileRecord };
export type mission_control_DriveFileRecords = mission_control_DriveFile[];
export type mission_control_NewDriveFileRecord = Omit<mission_control_DriveFile, 'id'>;

export interface mission_control_Heartbeat {
	id: string;
	agentId?: string;
	at?: number;
	level?: string;
	message?: string;
	workItemId?: string;
}

export type mission_control_NewHeartbeat = Omit<mission_control_Heartbeat, 'id'>;
export type { mission_control_Heartbeat as mission_control_HeartbeatRecord };
export type mission_control_HeartbeatRecords = mission_control_Heartbeat[];
export type mission_control_NewHeartbeatRecord = Omit<mission_control_Heartbeat, 'id'>;

export interface mission_control_JobRun {
	id: string;
	at?: number;
	jobId?: string;
	note?: string;
	ok?: boolean;
}

export type mission_control_NewJobRun = Omit<mission_control_JobRun, 'id'>;
export type { mission_control_JobRun as mission_control_JobRunRecord };
export type mission_control_JobRunRecords = mission_control_JobRun[];
export type mission_control_NewJobRunRecord = Omit<mission_control_JobRun, 'id'>;

export interface mission_control_MemoryEntry {
	id: string;
	agentId?: string;
	at?: number;
	content?: string;
	date?: string;
	embedding?: number[];
	projectId?: string;
	sourceEntryId?: string;
	sourceFile?: string;
	type?: string;
	workItemId?: string;
}

export type mission_control_NewMemoryEntry = Omit<mission_control_MemoryEntry, 'id'>;
export type { mission_control_MemoryEntry as mission_control_MemoryEntryRecord };
export type mission_control_MemoryEntryRecords = mission_control_MemoryEntry[];
export type mission_control_NewMemoryEntryRecord = Omit<mission_control_MemoryEntry, 'id'>;

export interface mission_control_Project {
	id: string;
	agentMap?: string;
	brief?: string;
	briefName?: string;
	buildCostUsd?: number;
	buildRuns?: number;
	color?: string;
	createdAt?: number;
	description?: string;
	githubIssuesClosed?: number;
	githubIssuesTotal?: number;
	githubOpenPrs?: number;
	githubOwner?: string;
	githubProjectNumber?: number;
	githubRepo?: string;
	lastSyncedAt?: number;
	name?: string;
	progress?: number;
	status?: string;
	template?: string;
	todayFocus?: string;
}

export type mission_control_NewProject = Omit<mission_control_Project, 'id'>;
export type { mission_control_Project as mission_control_ProjectRecord };
export type mission_control_ProjectRecords = mission_control_Project[];
export type mission_control_NewProjectRecord = Omit<mission_control_Project, 'id'>;

export interface mission_control_ProjectFile {
	id: string;
	blob?: any;
	content?: string;
	encoding?: string;
	path?: string;
	projectId?: string;
	sha256?: string;
	size?: number;
	updatedAt?: number;
}

export type mission_control_NewProjectFile = Omit<mission_control_ProjectFile, 'id'>;
export type { mission_control_ProjectFile as mission_control_ProjectFileRecord };
export type mission_control_ProjectFileRecords = mission_control_ProjectFile[];
export type mission_control_NewProjectFileRecord = Omit<mission_control_ProjectFile, 'id'>;

export interface mission_control_ReferenceArticle {
	id: string;
	active?: boolean;
	addedAt?: number;
	author?: string;
	format?: string;
	icpScore?: number;
	publishedOn?: string;
	quarter?: string;
	refNo?: number;
	title?: string;
	url?: string;
	why?: string;
}

export type mission_control_NewReferenceArticle = Omit<mission_control_ReferenceArticle, 'id'>;
export type { mission_control_ReferenceArticle as mission_control_ReferenceArticleRecord };
export type mission_control_ReferenceArticleRecords = mission_control_ReferenceArticle[];
export type mission_control_NewReferenceArticleRecord = Omit<mission_control_ReferenceArticle, 'id'>;

export interface mission_control_ResearchResult {
	id: string;
	authorAgentId?: string;
	body?: string;
	costUsd?: number;
	createdAt?: number;
	path?: string;
	projectId?: string;
	status?: string;
	title?: string;
	type?: string;
	updatedAt?: number;
	url?: string;
	words?: number;
}

export type mission_control_NewResearchResult = Omit<mission_control_ResearchResult, 'id'>;
export type mission_control_ResearchResults = mission_control_ResearchResult[];
export type { mission_control_ResearchResult as mission_control_ResearchResultRecord };
export type mission_control_ResearchResultRecords = mission_control_ResearchResult[];
export type mission_control_NewResearchResultRecord = Omit<mission_control_ResearchResult, 'id'>;

export interface mission_control_ScheduledJob {
	id: string;
	cronExpr?: string;
	declaredAt?: number;
	description?: string;
	enabled?: boolean;
	lastRunAt?: number;
	name?: string;
	ownerId?: string;
}

export type mission_control_NewScheduledJob = Omit<mission_control_ScheduledJob, 'id'>;
export type { mission_control_ScheduledJob as mission_control_ScheduledJobRecord };
export type mission_control_ScheduledJobRecords = mission_control_ScheduledJob[];
export type mission_control_NewScheduledJobRecord = Omit<mission_control_ScheduledJob, 'id'>;

export interface mission_control_WorkItem {
	id: string;
	completedAt?: number;
	context?: string;
	createdAt?: number;
	githubAssignees?: string[];
	githubContentType?: string;
	githubItemId?: string;
	githubLabels?: string[];
	githubNumber?: number;
	githubRepository?: string;
	githubState?: string;
	githubStatus?: string;
	githubUpdatedAt?: number;
	hidden?: boolean;
	links?: string[];
	meta?: string;
	ownerId?: string;
	priority?: number;
	projectId?: string;
	sourceAgentId?: string;
	status?: string;
	syncNote?: string;
	title?: string;
	type?: string;
	updatedAt?: number;
}

export type mission_control_NewWorkItem = Omit<mission_control_WorkItem, 'id'>;
export type { mission_control_WorkItem as mission_control_WorkItemRecord };
export type mission_control_WorkItemRecords = mission_control_WorkItem[];
export type mission_control_NewWorkItemRecord = Omit<mission_control_WorkItem, 'id'>;

export interface mqtt_live_scoring_Match {
	id: string;
	awayScore?: number;
	awayTeam?: string;
	homeScore?: number;
	homeTeam?: string;
	minute?: number;
	status?: string;
	updatedAt?: number;
}

export type mqtt_live_scoring_NewMatch = Omit<mqtt_live_scoring_Match, 'id'>;
export type { mqtt_live_scoring_Match as mqtt_live_scoring_MatchRecord };
export type mqtt_live_scoring_MatchRecords = mqtt_live_scoring_Match[];
export type mqtt_live_scoring_NewMatchRecord = Omit<mqtt_live_scoring_Match, 'id'>;

export interface mqtt_live_scoring_ScoreEvent {
	id: string;
	aggregateMs?: number;
	createdAt?: number;
	kind?: string;
	matchId?: string;
	minute?: number;
	persistMs?: number;
	points?: number;
	processingMs?: number;
	team?: string;
	validateMs?: number;
}

export type mqtt_live_scoring_NewScoreEvent = Omit<mqtt_live_scoring_ScoreEvent, 'id'>;
export type { mqtt_live_scoring_ScoreEvent as mqtt_live_scoring_ScoreEventRecord };
export type mqtt_live_scoring_ScoreEventRecords = mqtt_live_scoring_ScoreEvent[];
export type mqtt_live_scoring_NewScoreEventRecord = Omit<mqtt_live_scoring_ScoreEvent, 'id'>;

export interface oauth_csrf_token {
	token_id: string;
	created_at?: number;
	data?: string;
}

export type oauth_Newcsrf_token = Omit<oauth_csrf_token, 'token_id'>;
export type oauth_csrf_tokens = oauth_csrf_token[];
export type { oauth_csrf_token as oauth_csrf_tokenRecord };
export type oauth_csrf_tokenRecords = oauth_csrf_token[];
export type oauth_Newcsrf_tokenRecord = Omit<oauth_csrf_token, 'token_id'>;

export interface oauth_harper_oauth_mcp_client {
	client_id: string;
	application_type?: string;
	client_id_issued_at?: number;
	client_name?: string;
	client_secret?: string;
	client_secret_expires_at?: number;
	client_uri?: string;
	contacts?: string;
	grant_types?: string;
	logo_uri?: string;
	redirect_uris?: string;
	response_types?: string;
	scope?: string;
	software_id?: string;
	software_version?: string;
	token_endpoint_auth_method?: string;
}

export type oauth_Newharper_oauth_mcp_client = Omit<oauth_harper_oauth_mcp_client, 'client_id'>;
export type oauth_harper_oauth_mcp_clients = oauth_harper_oauth_mcp_client[];
export type { oauth_harper_oauth_mcp_client as oauth_harper_oauth_mcp_clientRecord };
export type oauth_harper_oauth_mcp_clientRecords = oauth_harper_oauth_mcp_client[];
export type oauth_Newharper_oauth_mcp_clientRecord = Omit<oauth_harper_oauth_mcp_client, 'client_id'>;

export interface oauth_harper_oauth_mcp_key {
	kid: string;
	alg?: string;
	created_at?: number;
	private_key_pem?: string;
	public_key_pem?: string;
}

export type oauth_Newharper_oauth_mcp_key = Omit<oauth_harper_oauth_mcp_key, 'kid'>;
export type oauth_harper_oauth_mcp_keys = oauth_harper_oauth_mcp_key[];
export type { oauth_harper_oauth_mcp_key as oauth_harper_oauth_mcp_keyRecord };
export type oauth_harper_oauth_mcp_keyRecords = oauth_harper_oauth_mcp_key[];
export type oauth_Newharper_oauth_mcp_keyRecord = Omit<oauth_harper_oauth_mcp_key, 'kid'>;

export interface oauth_mcp_assertion_jti {
	id: string;
	client_id?: string;
	created_at?: number;
}

export type oauth_Newmcp_assertion_jti = Omit<oauth_mcp_assertion_jti, 'id'>;
export type oauth_mcp_assertion_jtis = oauth_mcp_assertion_jti[];
export type { oauth_mcp_assertion_jti as oauth_mcp_assertion_jtiRecord };
export type oauth_mcp_assertion_jtiRecords = oauth_mcp_assertion_jti[];
export type oauth_Newmcp_assertion_jtiRecord = Omit<oauth_mcp_assertion_jti, 'id'>;

export interface oauth_mcp_auth_code {
	code: string;
	client_id?: string;
	code_challenge?: string;
	code_challenge_method?: string;
	created_at?: number;
	redirect_uri?: string;
	resource?: string;
	scope?: string;
	user?: string;
}

export type oauth_Newmcp_auth_code = Omit<oauth_mcp_auth_code, 'code'>;
export type oauth_mcp_auth_codes = oauth_mcp_auth_code[];
export type { oauth_mcp_auth_code as oauth_mcp_auth_codeRecord };
export type oauth_mcp_auth_codeRecords = oauth_mcp_auth_code[];
export type oauth_Newmcp_auth_codeRecord = Omit<oauth_mcp_auth_code, 'code'>;

export interface oauth_mcp_refresh_family {
	family_id: string;
	client_id?: string;
	created_at?: number;
	current_token_hash?: string;
	expires_at?: number;
	resource?: string;
	revoked?: boolean;
	scope?: string;
	user?: string;
}

export type oauth_Newmcp_refresh_family = Omit<oauth_mcp_refresh_family, 'family_id'>;
export type oauth_mcp_refresh_families = oauth_mcp_refresh_family[];
export type { oauth_mcp_refresh_family as oauth_mcp_refresh_familyRecord };
export type oauth_mcp_refresh_familyRecords = oauth_mcp_refresh_family[];
export type oauth_Newmcp_refresh_familyRecord = Omit<oauth_mcp_refresh_family, 'family_id'>;

export interface product_list_Product {
	id: string;
	category?: string;
	createdAt?: number;
	description?: string;
	imageUrl?: string;
	inStock?: boolean;
	name?: string;
	price?: number;
}

export type product_list_NewProduct = Omit<product_list_Product, 'id'>;
export type { product_list_Product as product_list_ProductRecord };
export type product_list_ProductRecords = product_list_Product[];
export type product_list_NewProductRecord = Omit<product_list_Product, 'id'>;

export interface url_shortener_Link {
	id: string;
	createdAt?: number;
	hits?: number;
	url?: string;
}

export type url_shortener_NewLink = Omit<url_shortener_Link, 'id'>;
export type { url_shortener_Link as url_shortener_LinkRecord };
export type url_shortener_LinkRecords = url_shortener_Link[];
export type url_shortener_NewLinkRecord = Omit<url_shortener_Link, 'id'>;
