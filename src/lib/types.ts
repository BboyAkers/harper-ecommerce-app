// The domain types live in `shared/` so the Harper resources and the storefront
// cannot drift apart. Re-exported here so existing `@/lib/types.ts` imports keep
// working.
export type {
	CartItem,
	Category,
	Gallery,
	ImageSet,
	IncludedItem,
	OrderConfirmation,
	OrderCustomer,
	OrderItem,
	OrderPayload,
	PaymentMethod,
	Product,
	RelatedProduct,
} from '@shared/types.ts';
