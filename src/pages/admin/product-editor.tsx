import { RequireEditor } from '@/components/require-editor.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Select } from '@/components/ui/select.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { useCreateProduct, useDeleteProduct, useProductById, useProducts, useUpdateProduct } from '@/lib/queries.ts';
import type { Category, ImageSet, Product, RelatedProduct } from '@/lib/types.ts';
import {
	blankValues,
	buildDraft,
	CATEGORIES,
	type FieldErrors,
	GALLERY_SLOTS,
	IMAGE_SIZES,
	type ProductFormValues,
	relatedFrom,
	valuesFromProduct,
} from '@/pages/admin/product-draft.ts';
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { type FormEvent, type ReactNode, useState } from 'react';

const editRoute = getRouteApi('/admin/$id');

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
	return (
		<section className="rounded-lg bg-white px-6 py-8 sm:p-8">
			<h2 className="text-subtitle tracking-[0.93px] text-primary">{title}</h2>
			{hint && <p className="text-body mt-2 opacity-50">{hint}</p>}
			<div className="mt-6 space-y-6">{children}</div>
		</section>
	);
}

/** Label, inline error and control, so every field reports itself the same way. */
function Field({
	id,
	label,
	hint,
	error,
	className,
	children,
}: {
	id?: string;
	label: string;
	hint?: string;
	error?: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<div className={className}>
			<div className="flex items-baseline justify-between gap-4">
				<Label htmlFor={id} error={!!error}>
					{label}
				</Label>
				{error && <span className="text-xs font-bold text-error">{error}</span>}
			</div>
			{hint && <p className="mt-1 text-xs opacity-50">{hint}</p>}
			<div className="mt-2">{children}</div>
		</div>
	);
}

/**
 * The three URLs behind one responsive image, with a live thumbnail.
 *
 * The preview is the point: these are free-text paths into `public/assets`, and
 * a typo is invisible in a text field but obvious as a broken image.
 */
function ImageSetFields({
	id,
	label,
	hint,
	value,
	onChange,
}: {
	id: string;
	label: string;
	hint?: string;
	value: ImageSet;
	onChange: (next: ImageSet) => void;
}) {
	return (
		<div>
			<p className="text-xs font-bold tracking-[-0.21px]">{label}</p>
			{hint && <p className="mt-1 text-xs opacity-50">{hint}</p>}
			<div className="mt-3 flex gap-4">
				{value.mobile ? (
					<img src={value.mobile} alt="" className="size-16 shrink-0 rounded-lg bg-light object-cover" />
				) : (
					<div className="grid size-16 shrink-0 place-items-center rounded-lg bg-light text-[10px] font-bold uppercase opacity-30">
						None
					</div>
				)}
				<div className="grid flex-1 gap-3 sm:grid-cols-3">
					{IMAGE_SIZES.map((size) => (
						<div key={size}>
							<Label htmlFor={`${id}-${size}`} className="capitalize opacity-50">
								{size}
							</Label>
							<Input
								id={`${id}-${size}`}
								value={value[size]}
								onChange={(event) => onChange({ ...value, [size]: event.target.value })}
								placeholder={`/assets/…/${size}/image.jpg`}
								className="mt-1 h-12 px-4 text-xs"
								autoCapitalize="none"
								spellCheck={false}
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function IncludesFields({
	items,
	error,
	onChange,
}: {
	items: ProductFormValues['includes'];
	error?: string;
	onChange: (next: ProductFormValues['includes']) => void;
}) {
	function edit(index: number, changes: Partial<ProductFormValues['includes'][number]>) {
		onChange(items.map((row, at) => (at === index ? { ...row, ...changes } : row)));
	}

	return (
		<div>
			<div className="flex items-baseline justify-between gap-4">
				<Label error={!!error}>In the box</Label>
				{error && <span className="text-xs font-bold text-error">{error}</span>}
			</div>

			<ul className="mt-2 space-y-3">
				{items.map((entry, index) => (
					/* Index keys: these rows carry no identity of their own, and the list
					   is only ever edited in place, appended to, or spliced — never
					   reordered, which is the case an index key gets wrong. */
					<li key={index} className="flex gap-3">
						<Input
							value={entry.quantity}
							onChange={(event) => edit(index, { quantity: event.target.value })}
							inputMode="numeric"
							aria-label={`Quantity for included item ${index + 1}`}
							className="w-20 shrink-0 px-0 text-center"
						/>
						<Input
							value={entry.item}
							onChange={(event) => edit(index, { item: event.target.value })}
							placeholder="Headphone unit"
							aria-label={`Included item ${index + 1}`}
						/>
						<button
							type="button"
							onClick={() => onChange(items.filter((_, at) => at !== index))}
							aria-label={`Remove included item ${index + 1}`}
							className="shrink-0 cursor-pointer px-2 text-xs font-bold uppercase tracking-[1px] opacity-50 transition-colors hover:text-error hover:opacity-100"
						>
							Remove
						</button>
					</li>
				))}
			</ul>

			<button
				type="button"
				onClick={() => onChange([...items, { quantity: '1', item: '' }])}
				className="mt-4 cursor-pointer text-[13px] font-bold uppercase tracking-[1px] text-primary hover:underline"
			>
				Add item
			</button>
		</div>
	);
}

/**
 * The "You may also like" row, picked from the catalog rather than typed.
 *
 * Each entry is stored as a snapshot of the product it points at, so this
 * *appends* a freshly derived one and *removes* by slug. Rebuilding the whole
 * list from the catalog on every change would be shorter, and would silently
 * restyle the seeded records' shared-asset imagery the first time anyone edited
 * a price.
 */
function RelatedPicker({
	candidates,
	value,
	onChange,
}: {
	candidates: Product[];
	value: RelatedProduct[];
	onChange: (next: RelatedProduct[]) => void;
}) {
	const picked = new Set(value.map((entry) => entry.slug));

	function toggle(product: Product) {
		if (picked.has(product.slug)) onChange(value.filter((entry) => entry.slug !== product.slug));
		else onChange([...value, relatedFrom(product)]);
	}

	if (candidates.length === 0) {
		return <p className="text-body opacity-50">There is no other product to link to yet.</p>;
	}

	return (
		<ul className="grid gap-3 sm:grid-cols-2">
			{candidates.map((product) => (
				<li key={product.id}>
					<label className="flex cursor-pointer items-center gap-3 rounded-lg border border-input-border p-3 transition-colors hover:border-primary">
						<input
							type="checkbox"
							checked={picked.has(product.slug)}
							onChange={() => toggle(product)}
							className="size-4 shrink-0 accent-primary"
						/>
						<img src={product.image?.mobile} alt="" className="size-10 shrink-0 rounded bg-light object-cover" />
						<span className="min-w-0">
							<span className="block truncate text-sm font-bold">{product.shortName}</span>
							<span className="block truncate font-mono text-xs opacity-50">/{product.slug}</span>
						</span>
					</label>
				</li>
			))}
		</ul>
	);
}

function ProductForm({ product, catalog }: { product?: Product; catalog: Product[] }) {
	const navigate = useNavigate();
	const create = useCreateProduct();
	const update = useUpdateProduct();
	const remove = useDeleteProduct();

	const [values, setValues] = useState<ProductFormValues>(() => (product ? valuesFromProduct(product) : blankValues()));
	const [errors, setErrors] = useState<FieldErrors>({});
	const [failure, setFailure] = useState<string>();
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	// The catalog minus this record: what the slug check compares against, and
	// what the related-products picker offers.
	const others = catalog.filter((candidate) => candidate.id !== product?.id);
	const saving = create.isPending || update.isPending;

	function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
		setValues((current) => ({ ...current, [key]: value }));
	}

	async function submit(event: FormEvent) {
		event.preventDefault();
		setFailure(undefined);

		const { errors: found, draft } = buildDraft(values, others);
		setErrors(found);
		if (!draft) return;

		try {
			// An edit sends the whole draft: PATCH still leaves every attribute the
			// form does not know about alone, which is the reason it is a PATCH.
			if (product) await update.mutateAsync({ id: product.id, changes: draft });
			else await create.mutateAsync(draft);
			navigate({ to: '/admin' });
		} catch (caught) {
			setFailure(caught instanceof Error ? caught.message : 'Could not save the product.');
		}
	}

	async function confirmDelete() {
		if (!product) return;
		setFailure(undefined);
		try {
			await remove.mutateAsync(product.id);
			navigate({ to: '/admin' });
		} catch (caught) {
			setConfirmingDelete(false);
			setFailure(caught instanceof Error ? caught.message : 'Could not delete the product.');
		}
	}

	return (
		<form onSubmit={submit} noValidate className="space-y-6">
			<Section title="Details">
				<div className="grid gap-6 sm:grid-cols-2">
					<Field id="name" label="Name" error={errors.name} hint="Shown on the product page.">
						<Input id="name" value={values.name} onChange={(event) => set('name', event.target.value)} />
					</Field>
					<Field
						id="shortName"
						label="Short name"
						error={errors.shortName}
						hint="Used in the cart, order history and related-product tiles."
					>
						<Input id="shortName" value={values.shortName} onChange={(event) => set('shortName', event.target.value)} />
					</Field>
				</div>

				<Field
					id="slug"
					label="Slug"
					error={errors.slug}
					hint="The public URL, and the key every order line and cart item stores. Changing it breaks existing links."
				>
					<Input
						id="slug"
						value={values.slug}
						onChange={(event) => set('slug', event.target.value)}
						placeholder="xx99-mark-two-headphones"
						autoCapitalize="none"
						spellCheck={false}
					/>
				</Field>

				<div className="grid gap-6 sm:grid-cols-3">
					<Field id="category" label="Category" error={errors.category}>
						<Select
							id="category"
							value={values.category}
							onChange={(event) => set('category', event.target.value as Category)}
						>
							{CATEGORIES.map((category) => (
								<option key={category} value={category}>
									{category}
								</option>
							))}
						</Select>
					</Field>
					<Field id="price" label="Price (USD)" error={errors.price} hint="Whole dollars.">
						<Input
							id="price"
							value={values.price}
							onChange={(event) => set('price', event.target.value)}
							inputMode="numeric"
							placeholder="2999"
						/>
					</Field>
					<Field id="ord" label="Sort order" error={errors.ord} hint="Ascending across listings.">
						<Input
							id="ord"
							value={values.ord}
							onChange={(event) => set('ord', event.target.value)}
							inputMode="numeric"
						/>
					</Field>
				</div>

				<label className="flex cursor-pointer items-center gap-3">
					<input
						type="checkbox"
						checked={values.new}
						onChange={(event) => set('new', event.target.checked)}
						className="size-4 accent-primary"
					/>
					<span className="text-xs font-bold tracking-[-0.21px]">Flag as a new product</span>
				</label>
			</Section>

			<Section
				title="Inventory"
				hint="Leave stock blank to sell without tracking it. A tracked product that reaches zero is refused at checkout."
			>
				<div className="grid gap-6 sm:grid-cols-2">
					<Field id="stock" label="Units in stock" error={errors.stock} hint="Blank means untracked.">
						<Input
							id="stock"
							value={values.stock}
							onChange={(event) => set('stock', event.target.value)}
							inputMode="numeric"
							placeholder="Untracked"
						/>
					</Field>
					<Field
						id="lowStockThreshold"
						label="Low-stock threshold"
						error={errors.lowStockThreshold}
						hint="Blank uses the default of 5."
					>
						<Input
							id="lowStockThreshold"
							value={values.lowStockThreshold}
							onChange={(event) => set('lowStockThreshold', event.target.value)}
							inputMode="numeric"
							placeholder="5"
						/>
					</Field>
				</div>
			</Section>

			<Section title="Copy">
				<Field id="description" label="Description" error={errors.description}>
					<Textarea
						id="description"
						value={values.description}
						onChange={(event) => set('description', event.target.value)}
					/>
				</Field>
				<Field id="features" label="Features" hint="Blank lines separate paragraphs.">
					<Textarea
						id="features"
						value={values.features}
						onChange={(event) => set('features', event.target.value)}
						className="min-h-[220px]"
					/>
				</Field>
				<IncludesFields items={values.includes} error={errors.includes} onChange={(next) => set('includes', next)} />
			</Section>

			<Section title="Images" hint="Paths under public/assets, one per breakpoint.">
				<ImageSetFields
					id="image"
					label="Product image"
					hint="The main shot on the product page."
					value={values.image}
					onChange={(next) => set('image', next)}
				/>
				<ImageSetFields
					id="categoryImage"
					label="Listing image"
					hint="Used on the category and all-products pages."
					value={values.categoryImage}
					onChange={(next) => set('categoryImage', next)}
				/>
				{GALLERY_SLOTS.map((slot) => (
					<ImageSetFields
						key={slot}
						id={`gallery-${slot}`}
						label={`Gallery — ${slot}`}
						value={values.gallery[slot]}
						onChange={(next) => set('gallery', { ...values.gallery, [slot]: next })}
					/>
				))}
			</Section>

			<Section title="You may also like" hint="Shown at the bottom of this product's page.">
				<RelatedPicker candidates={others} value={values.others} onChange={(next) => set('others', next)} />
			</Section>

			{failure && <p className="text-body text-error">{failure}</p>}
			{Object.keys(errors).length > 0 && !failure && (
				<p className="text-body text-error">Some fields need attention before this can be saved.</p>
			)}

			<div className="flex flex-wrap items-center gap-4">
				<Button type="submit" disabled={saving}>
					{saving ? 'Saving…' : product ? 'Save Changes' : 'Create Product'}
				</Button>
				<Button asChild variant="secondary">
					<Link to="/admin">Cancel</Link>
				</Button>
				{product && (
					<button
						type="button"
						onClick={() => setConfirmingDelete(true)}
						className="ml-auto cursor-pointer text-[13px] font-bold uppercase tracking-[1px] text-error hover:underline"
					>
						Delete
					</button>
				)}
			</div>

			{product && (
				<Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
					<DialogContent className="left-1/2 top-1/2 w-[calc(100%-3rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 p-6 sm:p-8">
						<DialogTitle className="text-2xl font-bold uppercase tracking-[1px]">Delete product</DialogTitle>
						<DialogDescription className="text-body mt-4 opacity-50">
							{/* Worth stating plainly: order history is safe because every order
							    line stores its own copy of the name, price and image. What is
							    not safe is anything still pointing at the slug. */}
							“{product.name}” is removed from the catalog. Past orders keep their own copy of its name, price and
							image, so order history is unaffected — but any product listing it as related, and any link to /
							{product.slug}, stops resolving.
						</DialogDescription>
						<div className="mt-8 flex gap-4">
							<DialogClose asChild>
								<Button type="button" variant="secondary" className="flex-1">
									Cancel
								</Button>
							</DialogClose>
							<Button
								type="button"
								onClick={confirmDelete}
								disabled={remove.isPending}
								className="flex-1 bg-error hover:bg-error/80"
							>
								{remove.isPending ? 'Deleting…' : 'Delete'}
							</Button>
						</div>
					</DialogContent>
				</Dialog>
			)}
		</form>
	);
}

function EditorShell({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
	return (
		<div className="bg-light pb-24 pt-8 lg:pb-[141px] lg:pt-20">
			<div className="container-app">
				<Link to="/admin" className="text-subtitle opacity-50 transition-opacity hover:opacity-100">
					Go Back
				</Link>
				<div className="mt-6 flex flex-wrap items-center justify-between gap-4">
					<h1 className="text-[28px] font-bold uppercase tracking-[1px] sm:text-[32px] sm:leading-9">{title}</h1>
					{aside}
				</div>
				<div className="mt-8">{children}</div>
			</div>
		</div>
	);
}

export function NewProductPage() {
	const { data: catalog } = useProducts();

	return (
		<RequireEditor>
			<EditorShell title="New product">
				{/* The form needs the catalog to check the slug for collisions and to
				    offer related products, so it waits rather than rendering a picker
				    with nothing in it. */}
				{catalog ? <ProductForm catalog={catalog} /> : <p className="text-body opacity-50">Loading the catalog…</p>}
			</EditorShell>
		</RequireEditor>
	);
}

export function EditProductPage() {
	const { id } = editRoute.useParams();
	const { data: catalog } = useProducts();
	// Same cached request as `useProducts`, narrowed by a `select` — one fetch.
	const { data: product, isSuccess } = useProductById(id);

	return (
		<RequireEditor>
			<EditorShell
				title={product?.shortName ?? 'Edit product'}
				aside={
					product && (
						<Link
							to="/product/$slug"
							/* The saved slug, not the one in the form: previewing an unsaved
							   slug would just 404. */
							params={{ slug: product.slug }}
							className="text-subtitle tracking-[1px] text-primary hover:underline"
						>
							View on storefront
						</Link>
					)
				}
			>
				{product && catalog ? (
					/* Keyed so the form's initial state is taken from the record once it
					   arrives, rather than from the undefined it was first rendered with. */
					<ProductForm key={product.id} product={product} catalog={catalog} />
				) : isSuccess && !product ? (
					<p className="text-body opacity-50">No product with that id.</p>
				) : (
					<p className="text-body opacity-50">Loading…</p>
				)}
			</EditorShell>
		</RequireEditor>
	);
}
