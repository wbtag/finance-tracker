import Query from "@/components/interfaces/Query";
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { request } from "@/components/lib/request";

const fiscalMonthStart = 10;

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(new Date(2026, 9, 15, 12));
	vi.clearAllMocks();
});

afterEach(() => {
	vi.useRealTimers();
});

vi.mock('@/components/lib/request', () => (
	{
		request: vi.fn().mockResolvedValue([{
			"id": 1,
			"date": "2026-10-14T07:51:04.731076Z",
			"type": "simple",
			"category": "Groceries",
			"description": "food",
			"amount": 150,
			"tags": [
				"food"
			],
			"filtered_amount": 150,
			"items": []
		}])
	}
));

vi.mock('@yaireo/tagify', () => ({
	default: class {
		whitelist: string[] = [];

		destroy() {
		}

		removeAllTags() {
		}
	}
}));

function setup(sundayWeekStart = false) {
	render(
		<Query
			categories={['Groceries', 'Leisure', 'Other']}
			tags={['food', 'cinema', 'parking']}
			fiscalMonthStart={fiscalMonthStart}
			sundayWeekStart={sundayWeekStart}
		/>
	)

	return {
		timeframe: screen.getByRole<HTMLSelectElement>('combobox', { name: 'Časový úsek' }),
		user: userEvent.setup()
	}
}

function sentBody() {
	const [, options] = vi.mocked(request).mock.lastCall!;
	return JSON.parse(options!.body as string);
}

describe('Query', () => {
	it('queries by fiscal month by default', async () => {
		const { timeframe } = setup();
		expect(timeframe.value).toBe('fiscalMonth');
		expect(request).toHaveBeenCalledOnce();
	});
	// system time is frozen at Thursday 2026-10-15
	it.each([
		{ timeframeValue: 'fiscalMonth', from: '2026-10-10' },
		{ timeframeValue: 'week', from: '2026-10-12' },
		{ timeframeValue: 'weekToDate', from: '2026-10-09' },
		{ timeframeValue: 'month', from: '2026-10-01' },
		{ timeframeValue: 'monthToDate', from: '2026-09-15' },
		{ timeframeValue: 'allTime', from: '2000-01-01' }
	])('sets correct from/to values - $timeframeValue', async ({ timeframeValue, from }) => {
		const { timeframe, user } = setup();

		await user.selectOptions(timeframe, timeframeValue);
		await user.click(screen.getByRole('button', { name: 'Aktualizovat' }))

		const body = sentBody();
		expect(body.from).toBe(from);
		expect(body.to).toBe('2026-10-15');
	});
	it('starts the week on Sunday when sundayWeekStart is set', async () => {
		const { timeframe, user } = setup(true);

		await user.selectOptions(timeframe, 'week');
		await user.click(screen.getByRole('button', { name: 'Aktualizovat' }));

		expect(sentBody().from).toBe('2026-10-11');
	});
	it('queries the previous fiscal month before its start day', async () => {
		vi.setSystemTime(new Date(2026, 9, 5, 12));
		setup();

		await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
		expect(sentBody()).toEqual({ from: '2026-09-10', to: '2026-10-05', tags: [] });
	});
	it('reruns the current query after a receipt is deleted', async () => {
		const { timeframe, user } = setup();
		vi.spyOn(window, 'confirm').mockReturnValueOnce(true);

		await user.selectOptions(timeframe, 'allTime');
		await user.click(await screen.findByText('food', { selector: 'p' }));
		await user.click(screen.getByRole('button', { name: 'Smazat' }));

		await vi.waitFor(() => expect(sentBody().from).toBe('2000-01-01'));
		expect(vi.mocked(request).mock.calls.map(([path]) => path)).toEqual(['query/', 'receipt/', 'query/']);
	});
	it('shows from/to select fields on custom timeframe selection', async () => {
		const { timeframe, user } = setup();

		await user.selectOptions(timeframe, 'custom');

		screen.getByLabelText<HTMLInputElement>('Datum od');
		screen.getByLabelText<HTMLInputElement>('Datum do');
	});
	it('correctly passes custom timeframe to request', async () => {
		const { timeframe, user } = setup();

		await user.selectOptions(timeframe, 'custom');

		await user.clear(screen.getByLabelText<HTMLInputElement>('Datum od'));
		await user.clear(screen.getByLabelText<HTMLInputElement>('Datum do'));
		await user.type(screen.getByLabelText<HTMLInputElement>('Datum od'), '2026-10-01');
		await user.type(screen.getByLabelText<HTMLInputElement>('Datum do'), '2026-10-10');
		await user.click(screen.getByRole('button', { name: 'Aktualizovat' }));

		const body = sentBody();
		expect(body.from).toBe('2026-10-01');
		expect(body.to).toBe('2026-10-10');
	});
	it('updates visible receipts and spend amount on category picker interaction', async () => {
		const { timeframe, user } = setup();

		await user.selectOptions(timeframe, 'allTime');

		vi.mocked(request).mockResolvedValueOnce([
			{
				id: 1, date: "2026-10-14T07:51:04.731076Z", type: "simple", category: "Groceries", description: "food",
				amount: 150, tags: ["food"], filtered_amount: 150, items: []
			},
			{
				id: 2, date: "2026-10-14T08:51:04.731076Z", type: "simple", category: "Leisure", description: "cinema",
				amount: 100, tags: ["cinema"], filtered_amount: 100, items: []
			},
		]);

		await user.click(screen.getByRole('button', { name: 'Aktualizovat' }));

		screen.getByText('Celková útrata: 250 Kč');
		screen.getByText('food');
		screen.getByText('cinema');

		await user.click(screen.getByRole('button', { name: 'Groceries' }));

		screen.getByText('Celková útrata: 100 Kč');
		expect(screen.queryByText('food')).toBeNull();
		screen.getByText('cinema');
	});
	it('shows "no results" message when no receipts are returned', async () => {
		const { timeframe, user } = setup();
		await user.selectOptions(timeframe, 'allTime');

		vi.mocked(request).mockResolvedValueOnce([]);
		await user.click(screen.getByRole('button', { name: 'Aktualizovat' }));

		screen.getByText('Celková útrata: 0 Kč');
		screen.getByText(/Žádné výsledky/);
	});
	it('sends selected tags in query request', async () => {
		const { timeframe, user } = setup();

		await user.selectOptions(timeframe, 'allTime');
		expect(sentBody().tags).toEqual([]);

		await user.type(screen.getByLabelText('Značky'), 'food');
		await user.click(screen.getByRole('button', { name: 'Aktualizovat' }));
		expect(sentBody().tags).toEqual(['food']);
	})
})