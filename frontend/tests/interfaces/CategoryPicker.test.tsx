import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CategoryPicker from "@/components/ui/CategoryPicker";

const categories = ['Groceries', 'Leisure', 'Other'];

function setup(activeCategories: string[]) {
	const setActiveCategories = vi.fn();
	render(
		<CategoryPicker
			categories={categories}
			activeCategories={activeCategories}
			setActiveCategories={setActiveCategories}
		/>
	);
	return { setActiveCategories, user: userEvent.setup() };
}

const isActive = (name: string) => screen.getByRole('button', { name }).classList.contains('button--active');

describe('CategoryPicker', () => {
	it('renders a button per category with active state', () => {
		setup(['Groceries']);

		expect(isActive('Groceries')).toBe(true);
		expect(isActive('Leisure')).toBe(false);
		expect(isActive('Other')).toBe(false);
	});
	it('removes an active category on click', async () => {
		const { user, setActiveCategories } = setup(['Groceries', 'Leisure']);

		await user.click(screen.getByRole('button', { name: 'Groceries' }));

		expect(setActiveCategories).toHaveBeenCalledWith(['Leisure']);
	});
	it('adds an inactive category on click', async () => {
		const { user, setActiveCategories } = setup(['Groceries']);

		await user.click(screen.getByRole('button', { name: 'Other' }));

		expect(setActiveCategories).toHaveBeenCalledWith(['Groceries', 'Other']);
	});
	it('select-all button selects all categories when some are inactive', async () => {
		const { user, setActiveCategories } = setup(['Groceries']);

		await user.click(screen.getByRole('button', { name: 'Select all' }));

		expect(setActiveCategories).toHaveBeenCalledWith(categories);
	});
	it('select-all button deselects all categories when all are active', async () => {
		const { user, setActiveCategories } = setup(categories);

		await user.click(screen.getByRole('button', { name: 'Select all' }));

		expect(setActiveCategories).toHaveBeenCalledWith([]);
	});
	it('double click on a category toggles all categories', async () => {
		const { user, setActiveCategories } = setup(['Groceries']);

		await user.dblClick(screen.getByRole('button', { name: 'Leisure' }));

		expect(setActiveCategories).toHaveBeenLastCalledWith(categories);
	});
	it('select-all icon reflects whether all categories are active', () => {
		const { unmount } = render(
			<CategoryPicker categories={categories} activeCategories={[]} setActiveCategories={vi.fn()}/>
		);
		expect(screen.getByRole('img', { name: 'Select all' }).getAttribute('src')).toContain('check-circle');
		unmount();

		render(<CategoryPicker categories={categories} activeCategories={categories} setActiveCategories={vi.fn()}/>);
		expect(screen.getByRole('img', { name: 'Select all' }).getAttribute('src')).toContain('circle-xmark');
	});
});
