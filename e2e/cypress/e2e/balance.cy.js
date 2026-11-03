// The seed sets a balance of 9999 Kč and creates no receipts or income.
describe('balance', () => {

	beforeEach(() => {
		cy.task('resetDatabase');
		cy.login();
		cy.visit('/balance');
	});

	const tile = (id) => cy.get(`#${id} .text-3xl`);

	it('shows the seeded balance', () => {
		tile('last-balance').should('have.text', '9999 Kč');
		tile('estimated-balance').should('have.text', '9999 Kč');
		tile('income-since-balance').should('have.text', '0 Kč');
		tile('spend-since-balance').should('have.text', '0 Kč');
	});

	it('validates the income form', () => {
		cy.intercept('POST', '/api/balance', cy.spy().as('post'));
		cy.get('form#income').contains('button', 'Uložit').click();

		cy.get('form#income').should('contain', 'Popis chybí').and('contain', 'Neplatná částka');
		cy.get('@post').should('not.have.been.called');
	});

	it('adds income', () => {
		cy.get('form#income input[name="description"]').type('Výplata');
		cy.get('form#income input[name="amount"]').type('5000');

		cy.intercept('POST', '/api/balance').as('income');
		cy.get('form#income').contains('button', 'Uložit').click();
		cy.wait('@income').its('response.statusCode').should('eq', 201);

		tile('income-since-balance').should('have.text', '5000 Kč');
		tile('estimated-balance').should('have.text', '14999 Kč');
		tile('last-balance').should('have.text', '9999 Kč');
		cy.get('form#income input[name="amount"]').should('have.value', '');
	});

	it('updates the balance', () => {
		cy.get('form#income input[name="description"]').type('Výplata');
		cy.get('form#income input[name="amount"]').type('5000');
		cy.intercept('POST', '/api/balance').as('post');
		cy.get('form#income').contains('button', 'Uložit').click();
		cy.wait('@post');
		tile('income-since-balance').should('have.text', '5000 Kč');

		cy.get('form#balance input[name="balance"]').type('20000');
		cy.get('form#balance').contains('button', 'Uložit').click();
		cy.wait('@post').its('response.statusCode').should('eq', 200);

		// A new balance starts a new period: income before it no longer counts.
		tile('last-balance').should('have.text', '20000 Kč');
		tile('estimated-balance').should('have.text', '20000 Kč');
		tile('income-since-balance').should('have.text', '0 Kč');
		tile('spend-since-balance').should('have.text', '0 Kč');
	});
});
