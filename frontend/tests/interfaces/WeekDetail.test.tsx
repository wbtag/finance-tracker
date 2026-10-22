import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeekDetail from "@/components/interfaces/WeekDetail";
import type { Receipt } from "@/app/types/receipt";

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
	useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/components/lib/request', () => ({ request: vi.fn().mockResolvedValue(null) }));

const categories = ['Groceries', 'Leisure', 'Other'];

const receipt = (id: number, category: string, description: string, amount: number): Receipt => ({
	id, category, description, amount,
	type: 'simple',
	date: '2026-10-14T12:00:00Z',
	dateCreated: 0,
	week: 42,
	year: 2026,
	tags: ['tag'],
	items: [],
});

const receipts = [
	receipt(1, 'Groceries', 'Lidl', 150),
	receipt(2, 'Leisure', 'Kino', 200),
	receipt(3, 'Groceries', 'Albert', 50),
];

function setup(data = receipts) {
	render(<WeekDetail receipts={data} categories={categories} tags={[]} week={42} year={2026}/>);
	return { user: userEvent.setup() };
}

const total = () => screen.getByText('Celkem').nextElementSibling!.textContent;

describe('WeekDetail', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	it('shows week and year in heading', () => {
		setup();

		expect(screen.getByRole('heading', { name: '42. týden roku 2026' })).toBeDefined();
	});
	it('shows all receipts and their total', () => {
		setup();

		expect(screen.getByText('Lidl')).toBeDefined();
		expect(screen.getByText('Kino')).toBeDefined();
		expect(screen.getByText('Albert')).toBeDefined();
		expect(total()).toBe('400 Kč');
	});
	it('hides receipts of deselected category and updates the total', async () => {
		const { user } = setup();

		await user.click(screen.getByRole('button', { name: 'Groceries' }));

		expect(screen.queryByText('Lidl')).toBeNull();
		expect(screen.queryByText('Albert')).toBeNull();
		expect(screen.getByText('Kino')).toBeDefined();
		expect(total()).toBe('200 Kč');
	});
	it('shows empty message when no receipts are visible', async () => {
		const { user } = setup();

		await user.click(screen.getByRole('button', { name: 'Select all' }));

		expect(screen.getByText('Žádné účtenky.')).toBeDefined();
		expect(screen.queryByText('Celkem')).toBeNull();
	});
	it('shows empty message for a week without receipts', () => {
		setup([]);

		expect(screen.getByText('Žádné účtenky.')).toBeDefined();
	});
	it('refreshes server data after a receipt changes', async () => {
		vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
		const { user } = setup();

		await user.click(screen.getByText('Kino'));
		await user.click(screen.getByRole('button', { name: 'Smazat' }));

		await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
	});
});
