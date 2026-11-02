const otpRequired = Cypress.expose('OTP_REQUIRED');
const itWithoutOtp = otpRequired ? it.skip : it;
const itWithOtp = otpRequired ? it : it.skip;

const submitCredentials = () => {
	cy.visit('/');

	cy.get('[name="username"]').type('testuser');

	cy.env(['TEST_USER_PASSWORD']).then(({ TEST_USER_PASSWORD }) => {
		cy.get('[name="password"]').type(TEST_USER_PASSWORD);
	});

	cy.intercept('/api/login').as('login');
	cy.get('.button').click();

	cy.wait('@login').its('response.statusCode').should('eq', 200);
};

describe('login flow', () => {
	itWithoutOtp('redirects to overview on successful login (MFA off)', () => {
		submitCredentials();

		cy.location('pathname').should('eq', '/');
		cy.get('a[href="/query"]').should('be.visible');
		cy.get('a[href="/balance"]').should('be.visible');
	});
	itWithOtp('redirects to overview after OTP verification (MFA on)', () => {
		submitCredentials();

		cy.location('pathname').should('eq', '/login/verify');
		cy.task('totpCode').then((code) => {
			cy.get('input[placeholder="Ověřovací kód"]').type(code);
		});
		cy.intercept('/api/login/verify').as('verify');
		cy.contains('button', 'Odeslat').click();

		cy.wait('@verify').its('response.statusCode').should('eq', 200);
		cy.location('pathname').should('eq', '/');
		cy.get('a[href="/query"]').should('be.visible');
	});
	it('displays an error on invalid credential submission', () => {
		cy.visit('/');

		cy.get('[name="username"]').type('invaliduser');
		cy.get('[name="password"]').type('badpassword');
		cy.intercept('/api/login').as('login');
		cy.get('.button').click();

		cy.wait('@login').its('response.statusCode').should('eq', 401);
		cy.location('pathname').should('eq', '/login');
		cy.get('.text-red-600').should('be.visible');
		cy.get('.text-red-600').should('have.text', 'Invalid credentials');
	});
	it('displays an error on empty credential submission', () => {
		cy.visit('/');
		cy.intercept('/api/login').as('login');
		cy.get('.button').click();

		cy.wait('@login').its('response.statusCode').should('eq', 401);
		cy.location('pathname').should('eq', '/login');
		cy.get('.text-red-600').should('be.visible');
		cy.get('.text-red-600').should('have.text', 'Invalid credentials');
	});
	// Last: a failed attempt throttles the device for the next verification.
	itWithOtp('displays an error on an invalid OTP code', () => {
		submitCredentials();

		cy.location('pathname').should('eq', '/login/verify');
		cy.get('input[placeholder="Ověřovací kód"]').type('000000');
		cy.intercept('/api/login/verify').as('verify');
		cy.contains('button', 'Odeslat').click();

		cy.wait('@verify').its('response.statusCode').should('eq', 401);
		cy.location('pathname').should('eq', '/login/verify');
		cy.get('.text-red-600').should('have.text', 'Invalid OTP token');
	});
});
