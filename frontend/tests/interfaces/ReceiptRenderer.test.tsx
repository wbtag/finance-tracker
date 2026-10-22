import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReceiptRenderer from "@/components/ui/ReceiptRenderer";
import { request } from "@/components/lib/request";
import type { Receipt } from "@/app/types/receipt";

vi.mock('@/components/lib/request', () => ({ request: vi.fn().mockResolvedValue(null) }));

vi.mock('@yaireo/tagify', () => ({
	default: class {
		whitelist: string[] = [];

		destroy() {
		}

		removeAllTags() {
		}
	}
}));

const alert = vi.spyOn(window, 'alert').mockImplementation(() => {
});
const confirm = vi.spyOn(window, 'confirm');

const categories = ['Groceries', 'Leisure', 'Other'];
const tags = ['food', 'cinema', 'parking'];

const simpleReceipt: Receipt = {
	id: 1,
	type: 'simple',
	category: 'Groceries',
	date: '2026-10-14T12:00:00Z',
	dateCreated: 0,
	week: 42,
	year: 2026,
	tags: ['food', 'bio'],
	amount: 150,
	description: 'Lidl',
	items: [],
};

const extendedReceipt: Receipt = {
	id: 2,
	type: 'extended',
	category: 'Leisure',
	date: '2026-10-13T12:00:00Z',
	dateCreated: 0,
	week: 42,
	year: 2026,
	tags: ['mall'],
	amount: 300,
	description: 'Mall',
	items: [
		{ id: 10, amount: 100, tags: ['cinema'] },
		{ id: 11, amount: 200, tags: ['food'] },
	],
};

function setup(receipts: Receipt[] = [simpleReceipt]) {
	const onChanged = vi.fn();
	render(<ReceiptRenderer receipts={receipts} categories={categories} tags={tags} onChanged={onChanged}/>);
	return { onChanged, user: userEvent.setup() };
}

function sentBody() {
	const [, options] = vi.mocked(request).mock.lastCall!;
	return JSON.parse(options!.body as string);
}

describe('ReceiptRenderer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('row', () => {
		it('shows description, category and amount', () => {
			setup();

			expect(screen.getByText('Lidl')).toBeDefined();
			expect(screen.getByText('Groceries')).toBeDefined();
			expect(screen.getByText('150 Kč')).toBeDefined();
		});
		it('shows filtered amount instead of amount when present', () => {
			setup([{ ...extendedReceipt, filtered_amount: 100 }]);

			expect(screen.getByText('100 Kč')).toBeDefined();
			expect(screen.queryByText('300 Kč')).toBeNull();
		});
		it('renders one row per receipt', () => {
			setup([simpleReceipt, extendedReceipt]);

			expect(screen.getByText('Lidl')).toBeDefined();
			expect(screen.getByText('Mall')).toBeDefined();
		});
	});

	describe('expanded detail', () => {
		it('is hidden until the row is clicked, and collapses on second click', async () => {
			const { user } = setup();

			expect(screen.queryByText('Datum:')).toBeNull();
			await user.click(screen.getByText('Lidl'));
			expect(screen.getByText('Datum:')).toBeDefined();
			await user.click(screen.getByText('Lidl'));
			expect(screen.queryByText('Datum:')).toBeNull();
		});
		it('shows date and tags', async () => {
			const { user } = setup();

			await user.click(screen.getByText('Lidl'));

			expect(screen.getByText(new Date(simpleReceipt.date).toLocaleDateString('cs-CZ'))).toBeDefined();
			expect(screen.getByText('food, bio')).toBeDefined();
		});
		it('does not show "Celkem" when there is no filtered amount', async () => {
			const { user } = setup();

			await user.click(screen.getByText('Lidl'));

			expect(screen.queryByText('Celkem:')).toBeNull();
		});
		it('does not show "Celkem" when filtered amount equals amount', async () => {
			const { user } = setup([{ ...simpleReceipt, filtered_amount: 150 }]);

			await user.click(screen.getByText('Lidl'));

			expect(screen.queryByText('Celkem:')).toBeNull();
		});
		it('shows "Celkem" with full amount when filtered amount differs', async () => {
			const { user } = setup([{ ...extendedReceipt, filtered_amount: 100 }]);

			await user.click(screen.getByText('Mall'));

			const total = screen.getByText('Celkem:').parentElement!;
			expect(within(total).getByText('300 Kč')).toBeDefined();
		});
		it('shows items with tags, and a dash for untagged items', async () => {
			const { user } = setup([{
				...extendedReceipt,
				items: [
					{ id: 10, amount: 100, tags: ['cinema', 'popcorn'] },
					{ id: 11, amount: 200, tags: [] },
				]
			}]);

			await user.click(screen.getByText('Mall'));

			const items = screen.getByText('Položky:').parentElement!;
			expect(within(items).getByText('cinema, popcorn').nextElementSibling!.textContent).toBe('100 Kč');
			expect(within(items).getByText('—').nextElementSibling!.textContent).toBe('200 Kč');
		});
		it('does not show items section for simple receipts', async () => {
			const { user } = setup();

			await user.click(screen.getByText('Lidl'));

			expect(screen.queryByText('Položky:')).toBeNull();
		});
	});

	describe('delete', () => {
		it('sends DELETE with receipt id and calls onChanged when confirmed', async () => {
			confirm.mockReturnValueOnce(true);
			const { user, onChanged } = setup();

			await user.click(screen.getByText('Lidl'));
			await user.click(screen.getByRole('button', { name: 'Smazat' }));

			expect(confirm).toHaveBeenCalledOnce();
			expect(request).toHaveBeenCalledWith('receipt/', { method: 'DELETE' }, { id: 1 });
			await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
		});
		it('sends nothing when cancelled', async () => {
			confirm.mockReturnValueOnce(false);
			const { user, onChanged } = setup();

			await user.click(screen.getByText('Lidl'));
			await user.click(screen.getByRole('button', { name: 'Smazat' }));

			expect(request).not.toHaveBeenCalled();
			expect(onChanged).not.toHaveBeenCalled();
		});
		it('alerts on API error and does not call onChanged', async () => {
			confirm.mockReturnValueOnce(true);
			vi.mocked(request).mockRejectedValueOnce(new Error('Not found'));
			const { user, onChanged } = setup();

			await user.click(screen.getByText('Lidl'));
			await user.click(screen.getByRole('button', { name: 'Smazat' }));

			await waitFor(() => expect(alert).toHaveBeenCalledWith('Chyba: Not found'));
			expect(onChanged).not.toHaveBeenCalled();
		});
	});

	describe('edit', () => {
		async function openEdit(receipt: Receipt = simpleReceipt) {
			const ctx = setup([receipt]);
			await ctx.user.click(screen.getByText(receipt.description));
			await ctx.user.click(screen.getByRole('button', { name: 'Upravit' }));
			return ctx;
		}

		it('prefills the form with receipt values', async () => {
			await openEdit();

			expect(screen.getByLabelText<HTMLInputElement>('Datum').value).toBe('2026-10-14');
			expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Kategorie' }).value).toBe('Groceries');
			expect(screen.getByLabelText<HTMLInputElement>('Popis').value).toBe('Lidl');
			expect(screen.getByLabelText<HTMLInputElement>('Částka').value).toBe('150');
			expect(screen.getByLabelText<HTMLInputElement>('Značky').value).toBe('food,bio');
		});
		it('shows item rows only for extended receipts', async () => {
			await openEdit(extendedReceipt);

			expect(screen.getAllByLabelText<HTMLInputElement>(/Částka položky/).map(i => i.value))
				.toEqual(['100', '200']);
		});
		it('sends nothing and closes the form when nothing changed', async () => {
			const { user, onChanged } = await openEdit();

			await user.click(screen.getByRole('button', { name: 'Uložit' }));

			expect(request).not.toHaveBeenCalled();
			expect(onChanged).not.toHaveBeenCalled();
			expect(screen.getByRole('button', { name: 'Upravit' })).toBeDefined();
		});
		it('cancel closes the form without sending anything', async () => {
			const { user } = await openEdit();

			await user.clear(screen.getByLabelText('Popis'));
			await user.type(screen.getByLabelText('Popis'), 'Albert');
			await user.click(screen.getByRole('button', { name: 'Zrušit' }));

			expect(request).not.toHaveBeenCalled();
			expect(screen.queryByLabelText('Popis')).toBeNull();
			expect(screen.getByText('Lidl')).toBeDefined();
		});
		it('sends only changed scalar fields with id', async () => {
			const { user, onChanged } = await openEdit();

			await user.clear(screen.getByLabelText('Popis'));
			await user.type(screen.getByLabelText('Popis'), 'Albert');
			await user.selectOptions(screen.getByRole('combobox', { name: 'Kategorie' }), 'Other');
			await user.click(screen.getByRole('button', { name: 'Uložit' }));

			await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
			expect(request).toHaveBeenCalledWith('receipt/', expect.objectContaining({ method: 'PUT' }));
			expect(sentBody()).toEqual({ id: 1, description: 'Albert', category: 'Other' });
		});
		it('sends changed date', async () => {
			const { user } = await openEdit();

			await user.clear(screen.getByLabelText('Datum'));
			await user.type(screen.getByLabelText('Datum'), '2026-10-01');
			await user.click(screen.getByRole('button', { name: 'Uložit' }));

			await waitFor(() => expect(request).toHaveBeenCalledOnce());
			expect(sentBody()).toEqual({ id: 1, date: '2026-10-01' });
		});
		it('sends changed tags as an array', async () => {
			const { user } = await openEdit();

			await user.clear(screen.getByLabelText('Značky'));
			await user.type(screen.getByLabelText('Značky'), 'food, parking');
			await user.click(screen.getByRole('button', { name: 'Uložit' }));

			await waitFor(() => expect(request).toHaveBeenCalledOnce());
			expect(sentBody()).toEqual({ id: 1, tags: ['food', 'parking'] });
		});
		it('sends changed items with their ids and without key', async () => {
			const { user } = await openEdit(extendedReceipt);
			const items = screen.getAllByLabelText<HTMLInputElement>(/Částka položky/);

			await user.clear(items[0]);
			await user.type(items[0], '50');
			await user.clear(items[1]);
			await user.type(items[1], '250');
			await user.click(screen.getByRole('button', { name: 'Uložit' }));

			await waitFor(() => expect(request).toHaveBeenCalledOnce());
			expect(sentBody()).toEqual({
				id: 2,
				items: [
					{ id: 10, amount: 50, tags: ['cinema'] },
					{ id: 11, amount: 250, tags: ['food'] },
				],
			});
		});
		it('blocks save on validation error', async () => {
			const { user } = await openEdit();

			await user.clear(screen.getByLabelText('Popis'));
			await user.click(screen.getByRole('button', { name: 'Uložit' }));

			expect(screen.getByText('Popis chybí')).toBeDefined();
			expect(request).not.toHaveBeenCalled();
		});
		it('blocks extended save when item sum does not match amount', async () => {
			const { user } = await openEdit(extendedReceipt);

			await user.clear(screen.getByLabelText('Částka'));
			await user.type(screen.getByLabelText('Částka'), '400');
			await user.click(screen.getByRole('button', { name: 'Uložit' }));

			expect(screen.getByText(/součet hodnot položek musí být roven/)).toBeDefined();
			expect(request).not.toHaveBeenCalled();
		});
		it('disables save button while saving', async () => {
			const { user } = await openEdit();
			vi.mocked(request).mockReturnValueOnce(new Promise(() => {
			}));

			await user.clear(screen.getByLabelText('Popis'));
			await user.type(screen.getByLabelText('Popis'), 'Albert');
			await user.click(screen.getByRole('button', { name: 'Uložit' }));

			const button = await screen.findByRole<HTMLButtonElement>('button', { name: 'Ukládá se…' });
			expect(button.disabled).toBe(true);
		});
		it('alerts on API error and keeps the form open', async () => {
			const { user, onChanged } = await openEdit();
			vi.mocked(request).mockRejectedValueOnce(new Error('Invalid payload'));

			await user.clear(screen.getByLabelText('Popis'));
			await user.type(screen.getByLabelText('Popis'), 'Albert');
			await user.click(screen.getByRole('button', { name: 'Uložit' }));

			await waitFor(() => expect(alert).toHaveBeenCalledWith('Chyba: Invalid payload'));
			expect(onChanged).not.toHaveBeenCalled();
			expect(screen.getByLabelText<HTMLInputElement>('Popis').value).toBe('Albert');
		});
	});
});
