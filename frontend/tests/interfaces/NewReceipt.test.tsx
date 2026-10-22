import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { format } from 'date-fns';
import NewReceipt from "@/components/interfaces/NewReceipt";
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { request } from "@/components/lib/request";

const categories = ['Groceries', 'Leisure', 'Other'];
const tags = ['food', 'cinema', 'parking'];

const todayDateString = format(new Date(), 'yyyy-MM-dd');

const alert = vi.spyOn(window, 'alert').mockImplementation(() => {
});

vi.mock('@/components/lib/request', () => ({ request: vi.fn().mockResolvedValue({}) }));

function setup() {
	render(<NewReceipt categories={categories} tags={tags}/>);

	return {
		category: screen.getByRole<HTMLSelectElement>('combobox', { name: 'Kategorie' }),
		date: screen.getByLabelText<HTMLInputElement>('Datum')
	}
}

describe('NewReceipt', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	// shows first category name by default
	it('shows the first category name by default', () => {
		const { category } = setup();

		expect(category.value).toBe('Groceries');
	});
	it('displays all category options', () => {
		const { category } = setup();

		const options = within(category).getAllByRole('option')
			.map((option) => option.textContent);

		expect(options).to.deep.equal(categories);
	})
	// shows today's date by default
	it('shows current date by default', () => {
		const { date } = setup();

		expect(date.value).toBe(todayDateString);
	});
	it('successfully submits on valid data input', async () => {
		setup();
		const user = userEvent.setup();

		await user.type(screen.getByLabelText<HTMLInputElement>('Popis'), 'Test');
		await user.type(screen.getByLabelText<HTMLInputElement>('Částka'), '150');
		await user.click(screen.getByRole('button', { name: 'Odeslat' }));

		await waitFor(() => expect(alert).toHaveBeenCalledWith('Účtenka úspěšně zaevidována'));

	});
	it('clears form on successful submission', async () => {
		const { category, date } = setup();
		const user = userEvent.setup();

		await user.type(screen.getByLabelText<HTMLInputElement>('Popis'), 'Test');
		await user.type(screen.getByLabelText<HTMLInputElement>('Částka'), '150');
		await user.selectOptions(category, 'Other');
		await user.clear(date);
		await user.type(date, '2026-10-01');
		await user.click(screen.getByRole('button', { name: 'Odeslat' }));

		await waitFor(() => expect(alert).toHaveBeenCalledWith('Účtenka úspěšně zaevidována'));

		expect(category.value).toBe('Groceries');
		expect(date.value).toBe(todayDateString);
		expect(screen.getByLabelText<HTMLInputElement>('Popis').value).toBe('');
		expect(screen.getByLabelText<HTMLInputElement>('Částka').value).toBe('');
	});

	it.each([
		{ dateValue: '2000', description: 'Test', amount: '150', error: 'Datum není v platném formátu', id: 'date' },
		{ dateValue: todayDateString, description: '', amount: '150', error: 'Popis chybí', id: 'description' },
		{ dateValue: todayDateString, description: 'Test', amount: '-1', error: 'Neplatná částka', id: 'amount' },
	])('displays validation error on invalid input - $id', async ({ dateValue, description, amount, error }) => {
		const { category, date } = setup();
		const user = userEvent.setup();

		if (description != '') {
			await user.type(screen.getByLabelText<HTMLInputElement>('Popis'), description);
		} else {
			await user.clear(screen.getByLabelText<HTMLInputElement>('Popis'))
		}
		await user.type(screen.getByLabelText<HTMLInputElement>('Částka'), amount);
		await user.selectOptions(category, 'Other');
		await user.clear(date);
		await user.type(date, dateValue);
		await user.click(screen.getByRole('button', { name: 'Odeslat' }));

		expect(screen.getByText(error)).toBeDefined();
	});

	it('blocks submission when validation errors are present', async () => {
		setup();
		const user = userEvent.setup();

		await user.clear(screen.getByLabelText<HTMLInputElement>('Popis'));
		await user.type(screen.getByLabelText<HTMLInputElement>('Částka'), '150');
		await user.click(screen.getByRole('button', { name: 'Odeslat' }));

		expect(screen.getByText('Popis chybí')).toBeDefined();
		expect(request).not.toHaveBeenCalled();
	});
	it('shows all errors and sends no request on empty submit', async () => {
		const { date } = setup();
		const user = userEvent.setup();

		await user.clear(date);
		await user.click(screen.getByRole('button', { name: 'Odeslat' }));

		expect(screen.getByText('Datum není v platném formátu')).toBeDefined();
		expect(screen.getByText('Popis chybí')).toBeDefined();
		expect(screen.getByText('Neplatná částka')).toBeDefined();
		expect(request).not.toHaveBeenCalled();
	});
	it('sends simple receipt body without items', async () => {
		setup();
		const user = userEvent.setup();

		await fillReceipt(user);
		await user.type(screen.getByLabelText<HTMLInputElement>('Značky'), 'food');
		await user.click(screen.getByRole('button', { name: 'Odeslat' }));

		await waitFor(() => expect(request).toHaveBeenCalledOnce());
		const body = sentBody();
		expect(body).toMatchObject({
			type: 'simple',
			date: todayDateString,
			description: 'Test',
			amount: '150',
			category: 'Groceries',
			tags: ['food'],
		});
		expect(body).not.toHaveProperty('items');
	});
	it('disables submit button while saving', async () => {
		setup();
		const user = userEvent.setup();

		await fillReceipt(user);
		vi.mocked(request).mockReturnValueOnce(new Promise(() => {
		}));
		await user.click(screen.getByRole('button', { name: 'Odeslat' }));

		const button = await screen.findByRole<HTMLButtonElement>('button', { name: 'Odesílá se...' });
		expect(button.disabled).toBe(true);
	});
	it('shows alert on form submission error', async () => {
		const { category, date } = setup();
		const user = userEvent.setup();

		await user.type(screen.getByLabelText<HTMLInputElement>('Popis'), 'Test');
		await user.type(screen.getByLabelText<HTMLInputElement>('Částka'), '150');
		await user.selectOptions(category, 'Other');
		await user.clear(date);
		await user.type(date, '2026-10-01');

		vi.mocked(request).mockRejectedValueOnce(new Error('Invalid payload'));
		await user.click(screen.getByRole('button', { name: 'Odeslat' }));
		await waitFor(() => expect(alert).toHaveBeenCalledWith('Chyba: Invalid payload'));
	})
	it('keeps form intact on error', async () => {
		const { category, date } = setup();
		const user = userEvent.setup();

		await user.type(screen.getByLabelText<HTMLInputElement>('Popis'), 'Test');
		await user.type(screen.getByLabelText<HTMLInputElement>('Částka'), '150');
		await user.selectOptions(category, 'Other');
		await user.clear(date);
		await user.type(date, '2026-10-01');

		vi.mocked(request).mockRejectedValueOnce(new Error('Invalid payload'));
		await user.click(screen.getByRole('button', { name: 'Odeslat' }));
		await waitFor(() => expect(alert).toHaveBeenCalledWith('Chyba: Invalid payload'));

		expect(category.value).toBe('Other');
		expect(date.value).toBe('2026-10-01');
		expect(screen.getByLabelText<HTMLInputElement>('Popis').value).toBe('Test');
		expect(screen.getByLabelText<HTMLInputElement>('Částka').value).toBe('150');
	});
	it('shows items when switching to extended type', async () => {
		setup();
		const user = userEvent.setup();

		expect(screen.queryByRole<HTMLInputElement>('heading', { name: 'Položky' })).toBeNull();
		await user.click(screen.getByRole('button', { name: 'Rozšířená' }));

		expect(screen.getByRole<HTMLInputElement>('heading', { name: 'Položky' })).toBeDefined();
	});
	it('adds item on add button click', async () => {
		const { add, items } = await setupExtended();

		expect(items()).toHaveLength(1);
		await add();

		expect(items()).toHaveLength(2);
	});
	it('does not show remove button for first item', async () => {
		await setupExtended();

		expect(screen.queryByRole('button', { name: '-' })).toBeNull();
	});
	it('removes correct item on remove button click', async () => {
		const { user, add, remove, items } = await setupExtended();

		await add();
		await add();
		for (const [i, value] of ['1', '2', '3'].entries()) {
			await user.clear(items()[i]);
			await user.type(items()[i], value);
		}
		// remove buttons start at second item
		await remove(0);

		expect(items().map((item) => item.value)).toEqual(['1', '3']);
	});
	it('hides add button at 10 items', async () => {
		const { add, items } = await setupExtended();

		for (let i = 0; i < 9; i++) await add();

		expect(items()).toHaveLength(10);
		expect(screen.queryByRole('button', { name: 'Přidat další položku' })).toBeNull();
	});
	it('blocks extended submit when item sum does not match amount', async () => {
		const { user, setItem } = await setupExtended();

		await fillReceipt(user);
		await setItem(0, '100', 'food');
		await user.click(screen.getByRole('button', { name: 'Odeslat' }));

		expect(screen.getByText(/součet hodnot položek musí být roven/)).toBeDefined();
		expect(request).not.toHaveBeenCalled();
	});
	it('blocks extended submit when item has no tags', async () => {
		const { user, setItem } = await setupExtended();

		await fillReceipt(user);
		await setItem(0, '150');
		await user.click(screen.getByRole('button', { name: 'Odeslat' }));

		expect(screen.getByText(/alespoň jednu značku/)).toBeDefined();
		expect(request).not.toHaveBeenCalled();
	});
	it('sends extended receipt body with items without key', async () => {
		const { user, add, setItem } = await setupExtended();

		await fillReceipt(user);
		await add();
		await setItem(0, '100', 'food');
		await setItem(1, '50', 'parking');
		await user.click(screen.getByRole('button', { name: 'Odeslat' }));

		await waitFor(() => expect(request).toHaveBeenCalledOnce());
		const body = sentBody();
		expect(body.type).toBe('extended');
		expect(body.items).toEqual([
			{ amount: 100, tags: ['food'] },
			{ amount: 50, tags: ['parking'] },
		]);
	});
	it('shows remaining amount to item total', async () => {
		const { user, setItem } = await setupExtended();

		await fillReceipt(user);
		await setItem(0, '100');

		expect(screen.getByText('Zbývá do celkové částky: 50')).toBeDefined();
	});
	it('sends no items after switching back to simple type', async () => {
		const { user, setItem } = await setupExtended();

		await fillReceipt(user);
		await setItem(0, '100', 'food');
		await user.click(screen.getByRole('button', { name: 'Základní' }));
		await user.click(screen.getByRole('button', { name: 'Odeslat' }));

		await waitFor(() => expect(request).toHaveBeenCalledOnce());
		const body = sentBody();
		expect(body.type).toBe('simple');
		expect(body).not.toHaveProperty('items');
	});
	it('resets items to single empty item after extended submit', async () => {
		const { user, add, setItem, items } = await setupExtended();

		await fillReceipt(user);
		await add();
		await setItem(0, '100', 'food');
		await setItem(1, '50', 'parking');
		await user.click(screen.getByRole('button', { name: 'Odeslat' }));

		await waitFor(() => expect(alert).toHaveBeenCalledWith('Účtenka úspěšně zaevidována'));
		expect(screen.getByRole('heading', { name: 'Položky' })).toBeDefined();
		expect(items().map((item) => item.value)).toEqual(['0']);
	});
})

async function fillReceipt(user: UserEvent, amount = '150') {
	await user.type(screen.getByLabelText<HTMLInputElement>('Popis'), 'Test');
	await user.type(screen.getByLabelText<HTMLInputElement>('Částka'), amount);
}

function sentBody() {
	const [, options] = vi.mocked(request).mock.calls[0];
	return JSON.parse(options!.body as string);
}

async function setupExtended() {
	setup();
	const user = userEvent.setup();
	await user.click(screen.getByRole('button', { name: 'Rozšířená' }));

	const items = () => screen.queryAllByLabelText<HTMLInputElement>(/Částka položky/);

	return {
		user,
		items,
		add: () => user.click(screen.getByRole('button', { name: 'Přidat další položku' })),
		remove: (index: number) => user.click(screen.getAllByRole('button', { name: '-' })[index]),
		// first 'Značky' input belongs to the receipt, item inputs follow
		setItem: async (index: number, amount: string, tag?: string) => {
			await user.clear(items()[index]);
			await user.type(items()[index], amount);
			if (tag) await user.type(screen.getAllByLabelText<HTMLInputElement>('Značky')[index + 1], tag);
		},
	};
}