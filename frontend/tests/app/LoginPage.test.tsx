import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from "@/app/login/page";
import { request } from "@/components/lib/request";

const replace = vi.fn();
const push = vi.fn();
// Same instance on every render, like the real router; the session check effect depends on it.
const router = { replace, push, refresh: vi.fn(), back: vi.fn() };
vi.mock('next/navigation', () => ({
	useRouter: () => router,
}));

vi.mock('@/components/lib/request', () => ({ request: vi.fn() }));

function mockSession(session: { authenticated: boolean; verified: boolean }) {
	vi.mocked(request).mockResolvedValueOnce(session);
}

async function setupLoggedOut() {
	mockSession({ authenticated: false, verified: false });
	render(<LoginPage/>);
	return {
		user: userEvent.setup(),
		username: await screen.findByPlaceholderText<HTMLInputElement>('Uživatelské jméno'),
		password: screen.getByPlaceholderText<HTMLInputElement>('Heslo'),
	};
}

describe('LoginPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	it('redirects verified session to overview', async () => {
		mockSession({ authenticated: true, verified: true });
		render(<LoginPage/>);

		await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
		expect(screen.queryByRole('button', { name: 'Přihlásit se' })).toBeNull();
	});
	it('redirects authenticated but unverified session to OTP verification', async () => {
		mockSession({ authenticated: true, verified: false });
		render(<LoginPage/>);

		await waitFor(() => expect(replace).toHaveBeenCalledWith('/login/verify'));
		expect(screen.queryByRole('button', { name: 'Přihlásit se' })).toBeNull();
	});
	it('shows login form for anonymous session', async () => {
		await setupLoggedOut();

		expect(request).toHaveBeenCalledWith('session/');
		expect(screen.getByRole('button', { name: 'Přihlásit se' })).toBeDefined();
		expect(replace).not.toHaveBeenCalled();
	});
	it('posts credentials without auth redirect and goes to verification on success', async () => {
		const { user, username, password } = await setupLoggedOut();
		vi.mocked(request).mockResolvedValueOnce(null);

		await user.type(username, 'admin');
		await user.type(password, 'secret');
		await user.click(screen.getByRole('button', { name: 'Přihlásit se' }));

		await waitFor(() => expect(push).toHaveBeenCalledWith('/login/verify'));
		const [path, options, , config] = vi.mocked(request).mock.lastCall!;
		expect(path).toBe('login/');
		expect(options!.method).toBe('POST');
		expect(JSON.parse(options!.body as string)).toEqual({ username: 'admin', password: 'secret' });
		expect(config).toEqual({ redirectOnAuthError: false });
	});
	it('shows error message and stays on page on bad credentials', async () => {
		const { user, username, password } = await setupLoggedOut();
		vi.mocked(request).mockRejectedValueOnce(new Error('Neplatné přihlašovací údaje'));

		await user.type(username, 'admin');
		await user.type(password, 'wrong');
		await user.click(screen.getByRole('button', { name: 'Přihlásit se' }));

		expect(await screen.findByText('Neplatné přihlašovací údaje')).toBeDefined();
		expect(push).not.toHaveBeenCalled();
		expect(username.value).toBe('admin');
	});
	it('clears previous error on next attempt', async () => {
		const { user, username, password } = await setupLoggedOut();
		vi.mocked(request).mockRejectedValueOnce(new Error('Neplatné přihlašovací údaje'));

		await user.type(username, 'admin');
		await user.type(password, 'wrong');
		await user.click(screen.getByRole('button', { name: 'Přihlásit se' }));
		await screen.findByText('Neplatné přihlašovací údaje');

		vi.mocked(request).mockReturnValueOnce(new Promise(() => {
		}));
		await user.click(screen.getByRole('button', { name: 'Přihlásit se' }));

		expect(screen.queryByText('Neplatné přihlašovací údaje')).toBeNull();
	});
});
