import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Navigation from "@/components/ui/Navigation";

const pathname = vi.fn(() => '/');
vi.mock('next/navigation', () => ({
	usePathname: () => pathname(),
}));

const routes = [
	{ name: 'Přehled', href: '/' },
	{ name: 'Nová útrata', href: '/receipt' },
	{ name: 'Detail útrat', href: '/query' },
	{ name: 'Týdenní přehled', href: '/weekly-summary' },
	{ name: 'Zůstatek', href: '/balance' },
];

// Mobile menu buttons only contain an icon: [0] opens the menu, [1] closes it.
const mobileMenu = () => document.querySelector('aside')!;
const isOpen = () => mobileMenu().classList.contains('translate-x-0');

describe('Navigation', () => {
	it('renders app name and links to all pages in desktop and mobile menu', () => {
		render(<Navigation appName="Finance"/>);

		expect(screen.getByRole('heading', { level: 1, name: 'Finance' })).toBeDefined();
		for (const { name, href } of routes) {
			const links = screen.getAllByRole('link', { name, hidden: true });
			expect(links).toHaveLength(2);
			expect(links.every(link => link.getAttribute('href') === href)).toBe(true);
		}
	});
	it.each(['/login', '/login/verify'])('renders nothing on %s', (path) => {
		pathname.mockReturnValueOnce(path).mockReturnValueOnce(path);
		const { container } = render(<Navigation appName="Finance"/>);

		expect(container.innerHTML).toBe('');
	});
	it('opens and closes the mobile menu', async () => {
		const user = userEvent.setup();
		render(<Navigation appName="Finance"/>);

		expect(isOpen()).toBe(false);
		await user.click(screen.getAllByRole('button')[0]);
		expect(isOpen()).toBe(true);
		await user.click(screen.getAllByRole('button')[1]);
		expect(isOpen()).toBe(false);
	});
	it('closes the mobile menu after following a link', async () => {
		const user = userEvent.setup();
		render(<Navigation appName="Finance"/>);

		await user.click(screen.getAllByRole('button')[0]);
		const mobileLinks = mobileMenu().querySelectorAll('a');
		await user.click(mobileLinks[2]);

		expect(isOpen()).toBe(false);
	});
});
