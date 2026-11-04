import { format } from 'date-fns';

const postWithCsrf = (url, body) => {
	return cy.getCookie('csrftoken').then((cookie) => {
		return cy.request({
			method: 'POST',
			url,
			headers: {
				'x-csrftoken': cookie.value,
			},
			body,
		});
	});
};

// Cached per spec; recreated when the session no longer exists, e.g. after a database reset.
Cypress.Commands.add('login', () => {
	cy.session(
		'testuser',
		() => {
			cy.request('/api/session');
			cy.env(['TEST_USER', 'TEST_USER_PASSWORD'])
				.then(({ TEST_USER, TEST_USER_PASSWORD }) => {
					return postWithCsrf('/api/login', {
						username: TEST_USER,
						password: TEST_USER_PASSWORD,
					});
				})
				.its('body.mfa_required')
				.then((mfaRequired) => {
					if (mfaRequired) {
						// Login rotates the CSRF token, so it is read again.
						cy.task('totpCode').then((code) => postWithCsrf('/api/login/verify', { code }));
					}
				});
		},
		{
			validate() {
				cy.request('/api/session').its('body.verified').should('eq', true);
			},
		},
	);
});

Cypress.Commands.add('createReceipt', (receipt = {}) => {
	const category = receipt.category
		? cy.wrap(receipt.category)
		: cy.request('/api/categories').its('body.0');

	let date = receipt.date ?? format(new Date(), 'yyyy-MM-dd');

	category.then((categoryName) => {
		postWithCsrf('/api/receipt', {
			type: 'simple',
			amount: 100,
			description: 'E2E receipt',
			date,
			tags: [],
			...receipt,
			category: categoryName,
		});
	});
});

// Tagify hides the real input and renders its own editable element right before it.
Cypress.Commands.add('typeTags', { prevSubject: 'optional' }, (subject, name, tags) => {
	const input = subject ? cy.wrap(subject).find(`input[name="${name}"]`) : cy.get(`input[name="${name}"]`);
	input
		.prev('tags.tagify')
		.find('.tagify__input')
		.type(tags.map((tag) => `${tag}{enter}`).join(''));
});
