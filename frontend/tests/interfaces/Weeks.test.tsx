import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Weeks from "@/components/interfaces/Weeks";

const push = vi.fn();
vi.mock('next/navigation', () => ({
	useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}));

const weeks = [
	{ number: 1, amount: 450 },
	{ number: 2, amount: 0 },
	{ number: 12, amount: 700 },
];

function setup() {
	render(<Weeks year="2026" weeks={weeks} years={[2024, 2025, 2026]}/>);
	return { user: userEvent.setup() };
}

describe('Weeks', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	it('shows the selected year in heading and select', () => {
		setup();

		expect(screen.getByRole('heading', { name: 'Týdenní přehled 2026' })).toBeDefined();
		expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Rok' }).value).toBe('2026');
	});
	it('renders a row per week with zero-padded number and amount', () => {
		setup();

		expect(screen.getByText('01. týden').nextElementSibling!.textContent).toBe('450 Kč');
		expect(screen.getByText('02. týden').nextElementSibling!.textContent).toBe('0 Kč');
		expect(screen.getByText('12. týden').nextElementSibling!.textContent).toBe('700 Kč');
	});
	it('links each week to its detail', () => {
		setup();

		expect(screen.getAllByRole('link', { name: 'Detail →' }).map(link => link.getAttribute('href')))
			.toEqual(['/weekly-summary/2026/1', '/weekly-summary/2026/2', '/weekly-summary/2026/12']);
	});
	it('navigates to selected year', async () => {
		const { user } = setup();

		await user.selectOptions(screen.getByRole('combobox', { name: 'Rok' }), '2025');

		expect(push).toHaveBeenCalledWith('/weekly-summary/?year=2025');
	});
});
