import { Button } from '@/components/ui/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.tsx';
import { useCart } from '@/lib/cart.tsx';
import { useCreateOrder } from '@/lib/queries.ts';
import type { OrderConfirmation } from '@/lib/types.ts';
import { cn, formatPrice } from '@/lib/utils.ts';
import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { type ReactNode, useState } from 'react';

const SHIPPING = 50;
const VAT_RATE = 0.2;

type PaymentMethod = 'e-money' | 'cash-on-delivery';

interface FormState {
	name: string;
	email: string;
	phone: string;
	address: string;
	zip: string;
	city: string;
	country: string;
	eMoneyNumber: string;
	eMoneyPin: string;
}

const EMPTY_FORM: FormState = {
	name: '',
	email: '',
	phone: '',
	address: '',
	zip: '',
	city: '',
	country: '',
	eMoneyNumber: '',
	eMoneyPin: '',
};

function validate(form: FormState, paymentMethod: PaymentMethod) {
	const errors: Partial<Record<keyof FormState, string>> = {};
	const required: (keyof FormState)[] = ['name', 'email', 'phone', 'address', 'zip', 'city', 'country'];
	if (paymentMethod === 'e-money') required.push('eMoneyNumber', 'eMoneyPin');
	for (const field of required) {
		if (!form[field].trim()) errors[field] = "Can't be empty";
	}
	if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Wrong format';
	if (paymentMethod === 'e-money') {
		if (form.eMoneyNumber && !/^\d{6,12}$/.test(form.eMoneyNumber)) errors.eMoneyNumber ??= 'Wrong format';
		if (form.eMoneyPin && !/^\d{4}$/.test(form.eMoneyPin)) errors.eMoneyPin ??= 'Wrong format';
	}
	return errors;
}

function Field({
	id,
	label,
	error,
	className,
	children,
}: {
	id: string;
	label: string;
	error?: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<div className={className}>
			<div className="flex items-baseline justify-between">
				<Label htmlFor={id} error={!!error}>
					{label}
				</Label>
				{error && <span className="text-xs font-medium tracking-[-0.21px] text-error">{error}</span>}
			</div>
			<div className="mt-2">{children}</div>
		</div>
	);
}

export function CheckoutPage() {
	const navigate = useNavigate();
	const router = useRouter();
	const { items, total, removeAll } = useCart();
	const createOrder = useCreateOrder();
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('e-money');
	const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
	const [confirmation, setConfirmation] = useState<OrderConfirmation | undefined>();

	const vat = Math.round(total * VAT_RATE);
	const grandTotal = total + SHIPPING;

	const update = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
		setForm((current) => ({ ...current, [field]: event.target.value }));
		setErrors((current) => ({ ...current, [field]: undefined }));
	};

	const inputProps = (field: keyof FormState, placeholder: string) => ({
		id: field,
		value: form[field],
		onChange: update(field),
		placeholder,
		error: !!errors[field],
	});

	function submit(event: React.FormEvent) {
		event.preventDefault();
		if (items.length === 0) return;
		const nextErrors = validate(form, paymentMethod);
		setErrors(nextErrors);
		if (Object.values(nextErrors).some(Boolean)) return;

		createOrder.mutate(
			{
				customer: {
					name: form.name,
					email: form.email,
					phone: form.phone,
					address: form.address,
					zip: form.zip,
					city: form.city,
					country: form.country,
				},
				paymentMethod,
				eMoneyNumber: paymentMethod === 'e-money' ? form.eMoneyNumber : undefined,
				items: items.map((item) => ({ slug: item.slug, quantity: item.quantity })),
			},
			{ onSuccess: (order) => setConfirmation(order) },
		);
	}

	return (
		<div className="bg-light pb-24 lg:pb-[141px]">
			<div className="container-app pt-4 sm:pt-8 lg:pt-20">
				<button
					type="button"
					onClick={() => router.history.back()}
					className="text-body cursor-pointer opacity-50 transition hover:text-primary hover:opacity-100"
				>
					Go Back
				</button>

				<form onSubmit={submit} noValidate className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_350px]">
					{/* Checkout form */}
					<div className="rounded-lg bg-white px-6 py-8 sm:p-8 lg:px-12 lg:pb-12 lg:pt-14">
						<h1 className="text-[28px] font-bold uppercase tracking-[1px] sm:text-[32px] sm:leading-9 sm:tracking-[1.14px]">
							Checkout
						</h1>

						<h2 className="text-subtitle mt-8 tracking-[0.93px] text-primary sm:mt-10">Billing Details</h2>
						<div className="mt-4 grid gap-6 sm:grid-cols-2">
							<Field id="name" label="Name" error={errors.name}>
								<Input {...inputProps('name', 'Alexei Ward')} autoComplete="name" />
							</Field>
							<Field id="email" label="Email Address" error={errors.email}>
								<Input {...inputProps('email', 'alexei@mail.com')} type="email" autoComplete="email" />
							</Field>
							<Field id="phone" label="Phone Number" error={errors.phone}>
								<Input {...inputProps('phone', '+1 202-555-0136')} type="tel" autoComplete="tel" />
							</Field>
						</div>

						<h2 className="text-subtitle mt-8 tracking-[0.93px] text-primary sm:mt-[53px]">Shipping Info</h2>
						<div className="mt-4 grid gap-6 sm:grid-cols-2">
							<Field id="address" label="Address" error={errors.address} className="sm:col-span-2">
								<Input {...inputProps('address', '1137 Williams Avenue')} autoComplete="street-address" />
							</Field>
							<Field id="zip" label="ZIP Code" error={errors.zip}>
								<Input {...inputProps('zip', '10001')} autoComplete="postal-code" />
							</Field>
							<Field id="city" label="City" error={errors.city}>
								<Input {...inputProps('city', 'New York')} autoComplete="address-level2" />
							</Field>
							<Field id="country" label="Country" error={errors.country}>
								<Input {...inputProps('country', 'United States')} autoComplete="country-name" />
							</Field>
						</div>

						<h2 className="text-subtitle mt-8 tracking-[0.93px] text-primary sm:mt-[61px]">Payment Details</h2>
						<div className="mt-4 grid gap-4 sm:grid-cols-2 sm:gap-6">
							<Label className="pt-4">Payment Method</Label>
							<RadioGroup
								value={paymentMethod}
								onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
							>
								{(['e-money', 'cash-on-delivery'] as const).map((method) => (
									<label
										key={method}
										className={cn(
											'flex h-14 cursor-pointer items-center gap-4 rounded-lg border border-input-border bg-white px-4 text-sm font-bold tracking-[-0.25px]',
											paymentMethod === method && 'border-primary',
										)}
									>
										<RadioGroupItem value={method} />
										{method === 'e-money' ? 'e-Money' : 'Cash on Delivery'}
									</label>
								))}
							</RadioGroup>
							{paymentMethod === 'e-money' ? (
								<>
									<Field id="eMoneyNumber" label="e-Money Number" error={errors.eMoneyNumber}>
										<Input {...inputProps('eMoneyNumber', '238521993')} inputMode="numeric" />
									</Field>
									<Field id="eMoneyPin" label="e-Money PIN" error={errors.eMoneyPin}>
										<Input {...inputProps('eMoneyPin', '6891')} inputMode="numeric" />
									</Field>
								</>
							) : (
								<div className="flex items-center gap-8 sm:col-span-2">
									<img src="/assets/checkout/icon-cash-on-delivery.svg" alt="" className="size-12 shrink-0" />
									<p className="text-body opacity-50">
										The 'Cash on Delivery' option enables you to pay in cash when our delivery courier arrives at
										your residence. Just make sure your address is correct so that your order will not be
										cancelled.
									</p>
								</div>
							)}
						</div>
					</div>

					{/* Summary */}
					<aside className="rounded-lg bg-white px-6 py-8 sm:p-8">
						<h2 className="text-lg font-bold uppercase tracking-[1.29px]">Summary</h2>
						{items.length === 0 ? (
							<p className="text-body mt-8 opacity-50">
								Your cart is empty.{' '}
								<Link to="/" className="text-primary underline">
									Continue shopping
								</Link>
							</p>
						) : (
							<>
								<ul className="mt-8 space-y-6">
									{items.map((item) => (
										<li key={item.slug} className="flex items-center gap-4">
											<img src={item.image} alt={item.shortName} className="size-16 rounded-lg" />
											<div className="min-w-0 flex-1">
												<p className="truncate text-[15px] font-bold">{item.shortName}</p>
												<p className="text-sm font-bold opacity-50">{formatPrice(item.price)}</p>
											</div>
											<span className="text-[15px] font-bold opacity-50">x{item.quantity}</span>
										</li>
									))}
								</ul>
								<dl className="mt-8 space-y-2">
									{(
										[
											['Total', total],
											['Shipping', SHIPPING],
											['VAT (Included)', vat],
										] as const
									).map(([label, amount]) => (
										<div key={label} className="flex items-center justify-between">
											<dt className="text-body uppercase opacity-50">{label}</dt>
											<dd className="text-lg font-bold">{formatPrice(amount)}</dd>
										</div>
									))}
									<div className="flex items-center justify-between pt-4">
										<dt className="text-body uppercase opacity-50">Grand Total</dt>
										<dd className="text-lg font-bold text-primary">{formatPrice(grandTotal)}</dd>
									</div>
								</dl>
								{createOrder.isError && (
									<p className="text-body mt-4 text-error">
										{createOrder.error instanceof Error
											? createOrder.error.message
											: 'Something went wrong placing your order.'}
									</p>
								)}
								<Button type="submit" disabled={createOrder.isPending} className="mt-8 w-full">
									{createOrder.isPending ? 'Placing order…' : 'Continue & Pay'}
								</Button>
							</>
						)}
					</aside>
				</form>
			</div>

			{/* Order confirmation */}
			<Dialog
				open={!!confirmation}
				onOpenChange={(open) => {
					if (!open) {
						removeAll();
						setConfirmation(undefined);
						navigate({ to: '/' });
					}
				}}
			>
				<DialogContent
					aria-describedby={undefined}
					onInteractOutside={(event) => event.preventDefault()}
					className="left-1/2 top-1/2 max-h-[90vh] w-[calc(100vw-48px)] max-w-[540px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-8 sm:p-12"
				>
					{confirmation && (
						<>
							<img src="/assets/checkout/icon-order-confirmation.svg" alt="" className="size-16" />
							<DialogTitle className="mt-6 max-w-[280px] text-2xl font-bold uppercase leading-7 tracking-[0.86px] sm:mt-8 sm:text-[32px] sm:leading-9 sm:tracking-[1.14px]">
								Thank you for your order
							</DialogTitle>
							<DialogDescription className="text-body mt-4 opacity-50 sm:mt-6">
								You will receive an email confirmation shortly.
							</DialogDescription>
							<div className="mt-6 overflow-hidden rounded-lg sm:mt-8 sm:grid sm:grid-cols-[1fr_198px]">
								<div className="bg-light p-6">
									<div className="flex items-center gap-4">
										<img
											src={confirmation.items[0].image}
											alt={confirmation.items[0].name}
											className="size-[50px] rounded"
										/>
										<div className="min-w-0 flex-1">
											<p className="truncate text-[15px] font-bold">{confirmation.items[0].name}</p>
											<p className="text-sm font-bold opacity-50">{formatPrice(confirmation.items[0].price)}</p>
										</div>
										<span className="text-[15px] font-bold opacity-50">x{confirmation.items[0].quantity}</span>
									</div>
									{confirmation.items.length > 1 && (
										<p className="mt-3 border-t border-black/10 pt-3 text-center text-xs font-bold tracking-[-0.21px] opacity-50">
											and {confirmation.items.length - 1} other item(s)
										</p>
									)}
								</div>
								<div className="flex flex-col justify-center bg-black p-6 text-white sm:pl-8">
									<p className="text-body uppercase opacity-50">Grand Total</p>
									<p className="mt-2 text-lg font-bold">{formatPrice(confirmation.grandTotal)}</p>
								</div>
							</div>
							<Button
								className="mt-6 w-full sm:mt-11"
								onClick={() => {
									removeAll();
									setConfirmation(undefined);
									navigate({ to: '/' });
								}}
							>
								Back to Home
							</Button>
						</>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
