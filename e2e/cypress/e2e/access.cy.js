describe('access control', () => {
	const protectedPaths = ['/', '/receipt', '/query', '/weekly-summary', '/balance'];

	protectedPaths.forEach((path) => {
		it(`redirects a logged-out user from ${path} to /login`, () => {
			cy.visit(path);
			cy.location('pathname').should('eq', '/login');
			cy.contains('h1', 'Přihlášení').should('be.visible');
		});
	});

	it('redirects a logged-in user away from /login', () => {
		cy.login();
		cy.visit('/login');
		cy.location('pathname').should('eq', '/');
	});
});
