import { format, subDays, subMonths, setDate } from 'date-fns';

const NOW = new Date(2026, 9, 30); // Friday

const formatDate = (date) => {
	return format(date, 'yyyy-MM-dd');
};

describe('query', () => {

	before(() => {
		cy.login();
		cy.createReceipt({ date: formatDate(subDays(NOW, 1)), description: 'same week' });
		cy.createReceipt({
			date: formatDate(subDays(NOW, 6)),
			description: 'within 7 days'
		});
		cy.createReceipt({ date: formatDate(setDate(NOW, 5)), description: 'same month' });
		// "Poslední měsíc" starts on the same day of the previous month.
		cy.createReceipt({ date: formatDate(subMonths(NOW, 1)), description: 'within last month' });
		cy.createReceipt({ date: formatDate(new Date(2026, 0, 10)), description: 'alltime' });

		// Tagged receipts, in a month of their own.
		cy.createReceipt({ date: '2025-06-10', description: 'coffee simple', amount: 120, tags: ['coffee'] });
		cy.createReceipt({
			date: '2025-06-12',
			description: 'coffee extended',
			type: 'extended',
			amount: 100,
			tags: [],
			items: [
				{ amount: 40, tags: ['coffee'] },
				{ amount: 60, tags: ['snack'] },
			],
		});
		cy.createReceipt({ date: '2025-06-15', description: 'no coffee', amount: 70 });
	});

	beforeEach(() => {
		cy.login();
		cy.clock(NOW, ['Date']);
		cy.visit('/query');
	});

	const timePeriodCases = [
		{ timeframe: 'week', sum: 100 },
		{ timeframe: 'weekToDate', sum: 200 },
		{ timeframe: 'month', sum: 300 },
		{ timeframe: 'fiscalMonth', sum: 200 },
		{ timeframe: 'monthToDate', sum: 400 },
		{ timeframe: 'allTime', sum: 790 },
	];

	timePeriodCases.forEach(({ timeframe, sum }) => {
		it(`shows receipts according to selected time period - ${timeframe}`, () => {
			cy.get('select[name="timeframe"]').select(timeframe);
			cy.contains('button', 'Aktualizovat').click();
			cy.contains('p', `Celková útrata: ${sum} Kč`).should('be.visible');
		});
	});

	it('allows custom timeframe specification', () => {
		cy.get('select[name="timeframe"]').select('Vlastní');
		cy.get('input[name="from"]').clear().type('2026-01-01');
		cy.get('input[name="to"]').clear().type('2026-01-11');
		cy.contains('button', 'Aktualizovat').click();
		cy.contains('p', `Celková útrata: 100 Kč`).should('be.visible');
	});

	it('handles tag querying', () => {
		cy.get('select[name="timeframe"]').select('Vlastní');
		cy.get('input[name="from"]').clear().type('2025-06-01');
		cy.get('input[name="to"]').clear().type('2025-06-30');
		cy.typeTags('tags', ['coffee']);

		cy.intercept('POST', '/api/query').as('query');
		cy.contains('button', 'Aktualizovat').click();
		cy.wait('@query').its('request.body.tags').should('deep.equal', ['coffee']);

		// Receipt-level tag counts the whole receipt, item-level tag only the matching items.
		cy.contains('p', 'Celková útrata: 160 Kč').should('be.visible');
		cy.contains('.text-sm', 'coffee simple').parents('.grid').should('contain', '120 Kč');
		cy.contains('.text-sm', 'coffee extended').parents('.grid').should('contain', '40 Kč');
		cy.contains('no coffee').should('not.exist');

		cy.contains('coffee extended').click();
		cy.contains('p', 'Celkem:').next().should('have.text', '100 Kč');
	});

	it('shows no results for an unused tag', () => {
		cy.get('select[name="timeframe"]').select('allTime');
		cy.typeTags('tags', ['nonexistent']);
		cy.contains('button', 'Aktualizovat').click();
		cy.contains('p', 'Celková útrata: 0 Kč').should('be.visible');
		cy.contains('Žádné výsledky.').should('be.visible');
	});
});
