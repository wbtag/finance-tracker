// The overview and weekly summary are rendered on the server with the real clock, so these receipts are dated today.
describe('receipt flows', () => {

	beforeEach(() => {
		cy.task('resetDatabase');
		cy.login();
	});

	const submitReceipt = () => {
		cy.intercept('POST', '/api/receipt').as('create');
		cy.contains('button', 'Odeslat').click();
		cy.wait('@create').its('response.statusCode').should('eq', 201);
	};

	it('creates a simple receipt and shows it in the overview', () => {
		cy.visit('/receipt');
		cy.get('input[name="description"]').type('Test simple');
		cy.get('input[name="amount"]').type('187');
		cy.typeTags('tags', ['testing1']);
		submitReceipt();

		cy.visit('/');
		cy.contains('a', 'Útrata tento týden').should('contain', '187 Kč');
		cy.contains('a', 'Útrata tento měsíc').should('contain', '187 Kč');
		cy.contains('tr', 'Groceries').should('contain', '187/3500 Kč');

		cy.visit('/query');
		cy.contains('p', 'Celková útrata: 187 Kč').should('be.visible');
		cy.contains('.text-sm', 'Test simple').should('be.visible');
		cy.contains('.text-sm', '187 Kč').should('be.visible');
	});

	it('creates an extended receipt and shows it in the weekly summary', () => {
		cy.visit('/receipt');
		cy.contains('button', 'Rozšířená').click();
		cy.get('select[name="category"]').select('Leisure');
		cy.get('input[name="description"]').type('Test extended');
		cy.get('input[name="amount"]').type('300');
		cy.typeTags('tags', ['shop']);

		cy.get('input[name="amount-0"]').type('200');
		cy.typeTags('tags-0', ['food']);
		cy.contains('button', 'Přidat další položku').click();
		cy.get('input[name="amount-1"]').type('100');
		cy.typeTags('tags-1', ['drinks']);
		cy.contains('p', 'Zbývá do celkové částky: 0').should('be.visible');
		submitReceipt();

		// The overview links to the current week, whatever the configured week start is.
		cy.visit('/');
		cy.contains('a', 'Útrata tento týden')
			.should('contain', '300 Kč')
			.invoke('attr', 'href')
			.then((weekHref) => {
				cy.visit('/weekly-summary');
				cy.get(`a[href="${weekHref}"]`).parent().should('contain', '300 Kč');

				cy.get(`a[href="${weekHref}"]`).click();
				cy.location('pathname').should('eq', weekHref);
				cy.contains('Celkem').parent().should('contain', '300 Kč');
				cy.contains('Test extended').click();
				cy.contains('food').parent().should('contain', '200 Kč');
				cy.contains('drinks').parent().should('contain', '100 Kč');
			});
	});

	it('edits a receipt', () => {
		cy.createReceipt({ description: 'Before edit', amount: 120 });

		cy.visit('/query');
		cy.contains('Before edit').click();
		cy.contains('button', 'Upravit').click();
		cy.get('input[name="description"]').clear().type('After edit');
		cy.get('input[name="amount"]').clear().type('250');

		cy.intercept('PUT', '/api/receipt').as('edit');
		cy.contains('button', 'Uložit').click();
		cy.wait('@edit').then(({ request, response }) => {
			expect(response.statusCode).to.eq(200);
			expect(request.body).to.include({ description: 'After edit', amount: '250' });
			expect(request.body).not.to.have.any.keys('category', 'date', 'tags');
		});

		cy.contains('p', 'Celková útrata: 250 Kč').should('be.visible');
		cy.contains('.text-sm', 'After edit').should('be.visible');
		cy.contains('Before edit').should('not.exist');

		cy.reload();
		cy.contains('.text-sm', 'After edit').should('be.visible');
	});

	it('deletes a receipt', () => {
		cy.createReceipt({ description: 'To delete', amount: 80 });
		cy.createReceipt({ description: 'To keep', amount: 20 });

		cy.visit('/query');
		cy.contains('p', 'Celková útrata: 100 Kč').should('be.visible');
		cy.contains('To delete').click();

		cy.intercept('DELETE', '/api/receipt*').as('delete');
		cy.contains('button', 'Smazat').click();
		cy.wait('@delete').its('response.statusCode').should('eq', 204);

		cy.contains('p', 'Celková útrata: 20 Kč').should('be.visible');
		cy.contains('To delete').should('not.exist');
		cy.contains('To keep').should('be.visible');
	});
});
