import { expect, describe, it, beforeEach } from 'vitest';
import { useValidation, isValidDate, isBlank, isPositiveInteger, isInteger } from "@/components/lib/useValidation";
import { ReceiptField, ReceiptFormData, receiptRules } from "@/components/lib/receiptValidation";
import { renderHook, act } from '@testing-library/react';
import { ReceiptType } from "@/app/types/receipt";

const receipts: Record<string,ReceiptFormData> = {};

// all values being false means valid
const noErrors = { date: false, amount: false, description: false, itemsAmount: false, itemsTags: false };

const runValidation = (receiptType: string, receipt: unknown) => {
	const { result } = renderHook(() => useValidation(receiptRules(receiptType as ReceiptType)));
	let isValid;
	act(() => { isValid = result.current.validate(receipt as ReceiptFormData); });
	return { isValid, errors: result.current.errors };
};

beforeEach(() => {
	receipts['simple'] = {
		date: new Date().toISOString().split('T')[0],
		description: 'test receipt',
		amount: 1000,
	};

	receipts['extended'] = {
		date: new Date().toISOString().split('T')[0],
		description: 'test receipt',
		amount: 1000,
		items: [
			{ amount: 200, tags: ['item1']},
			{ amount: 800, tags: ['item2']},
		]
	}
})

describe.each(['simple', 'extended'])('%s receipt', (receiptType) => {
	it('passes validation when all fields are valid', () => {
		const { isValid, errors } = runValidation(receiptType, receipts[receiptType]);
		expect(isValid).toBe(true);
		expect(errors).toEqual(noErrors);
	})

	it('passes validation when amounts are numeric strings', () => {
		const receipt = {
			...receipts[receiptType],
			amount: '1000',
			items: receipts[receiptType].items?.map((item) => ({ ...item, amount: String(item.amount) })),
		};
		const { isValid, errors } = runValidation(receiptType, receipt);
		expect(isValid).toBe(true);
		expect(errors).toEqual(noErrors);
	})

	it.each([
		{ param: 'date', value: '', id: 'empty string'},
		{ param: 'amount', value: 0, id: 'zero'},
		{ param: 'amount', value: -1, id: 'negative' },
		{ param: 'amount', value: '', id: 'empty string'},
		{ param: 'amount', value: 'abc', id: 'non-numeric string'},
		{ param: 'description', value: '', id: 'empty string'},
		{ param: 'description', value: '   ', id: 'whitespace only'},
	])('fails validation when a param is invalid - $param $id', (
		{ param, value }: { param: string; value: string | number; id: string }
	) => {
		const receipt = {
			...receipts[receiptType],
			[param]: value,
		};
		const { isValid, errors } = runValidation(receiptType, receipt);
		expect(isValid).toBe(false);
		expect(errors).toEqual({
			...noErrors,
			[param as ReceiptField]: true,
			// an invalid amount no longer matches the items sum
			...(receiptType === 'extended' && param === 'amount' && { itemsAmount: true }),
		});
	})

	it('clears errors when an invalid receipt is fixed and validated again', () => {
		const { result } = renderHook(() => useValidation(receiptRules(receiptType as ReceiptType)));
		act(() => { result.current.validate({ ...receipts[receiptType], description: '' }); });
		expect(result.current.errors.description).toBe(true);

		let isValid;
		act(() => { isValid = result.current.validate(receipts[receiptType]); });
		expect(isValid).toBe(true);
		expect(result.current.errors).toEqual(noErrors);
	})

	it.runIf(receiptType === 'simple')('ignores items', () => {
		const receipt = {
			...receipts[receiptType],
			items: [ { amount: -5, tags: [] } ],
		};
		const { isValid, errors } = runValidation(receiptType, receipt);
		expect(isValid).toBe(true);
		expect(errors).toEqual(noErrors);
	})

	it.runIf(receiptType === 'extended').each([
		{ tags: '[{"value":"item1"},{"value":"item2"}]', id: 'Tagify JSON string' },
		{ tags: 'item1, item2', id: 'comma-separated string' },
		{ tags: ['item1', ''], id: 'array with a blank entry' },
	])('passes validation when item tags are $id', (
		{ tags }: { tags: string | string[]; id: string }
	) => {
		const receipt = {
			...receipts[receiptType],
			items: [ { amount: 200, tags }, { amount: 800, tags: ['item2'] } ],
		};
		const { isValid, errors } = runValidation(receiptType, receipt);
		expect(isValid).toBe(true);
		expect(errors).toEqual(noErrors);
	})

	it.runIf(receiptType === 'extended').each([
		// TODO: add check for item existence in extended receipt validation; handle undefined items
		// { items: null, id: 'null' },
		{ items: [], id: 'empty array'},
		{ items: [ { amount: 200, tags: ['item1'] }], id: 'amount mismatch' },
		{ items: [ { amount: -200, tags: ['item1'] }, { amount: 1200, tags: ['item2'] } ], id: 'negative amount with matching sum' },
		{ items: [ { amount: 0, tags: ['item1'] }, { amount: 1000, tags: ['item2'] } ], id: 'zero amount with matching sum' },
		{ items: [ { amount: 200, tags: [] }, { amount: 800, tags: ['item2'] } ], id: 'empty tags'},
		{ items: [ { amount: 200, tags: [''] }, { amount: 800, tags: ['item2'] } ], id: 'blank tag (new item default)'},
		{ items: [ { amount: 200, tags: '[]' }, { amount: 800, tags: ['item2'] } ], id: 'empty Tagify JSON string'},
		{ items: [ { amount: 200, tags: null }, { amount: 800, tags: ['item2'] } ], id: 'null tags'},

	])('fails validation when a param is invalid - items $id', (
		{ items }: { items: Record<string,any>[] | null; id: string }
	) => {
		const receipt = {
			...receipts[receiptType],
			items,
		};
		const { isValid } = runValidation(receiptType, receipt);
		expect(isValid).toBe(false);
		// TODO: add more granular assertion after item validation rules improved
	})
});

describe('isValidDate', () => {
	it('returns true for yyyy-mm-dd date', () => {
		expect(isValidDate(new Date().toISOString().split('T')[0])).toBe(true);
	});
	it('returns false for full date ISO string', () => {
		expect(isValidDate(new Date().toISOString())).toBe(false);
	});
	// TODO: isValidDate only checks the format; flip to it() once it rejects impossible dates
	it.fails('returns false for impossible date', () => {
		expect(isValidDate('2026-13-45')).toBe(false);
	});
});

describe('isBlank', () => {
	it('returns true for undefined', () => {
		expect(isBlank(undefined)).toBe(true);
	});
	it('returns true for empty string', () => {
		expect(isBlank('')).toBe(true);
	});
	it('returns true for whitespace-only string', () => {
		expect(isBlank('   ')).toBe(true);
	});
	it('returns false for non-empty string', () => {
		expect(isBlank('test')).toBe(false);
	});
});

describe('isInteger', () => {
	it('returns true for positive integer', () => {
		expect(isInteger(1)).toBe(true);
	});
	it('returns true for integer in string', () => {
		expect(isInteger('1')).toBe(true);
	});
	it('returns true for negative integer', () => {
		expect(isInteger(-1)).toBe(true);
	});
	it('returns false for float', () => {
		expect(isInteger(1.5)).toBe(false);
	});
	it('returns false for undefined', () => {
		expect(isInteger(undefined)).toBe(false);
	});
	it('returns false for empty string', () => {
		expect(isInteger('')).toBe(false);
	});
});

describe('isPositiveInteger', () => {
	it('returns true for integer', () => {
		expect(isPositiveInteger(1)).toBe(true);
	});
	it('returns true for integer in string', () => {
		expect(isPositiveInteger('1')).toBe(true);
	});
	it('returns false for negative integer', () => {
		expect(isPositiveInteger(-1)).toBe(false);
	});
	it('returns false for float', () => {
		expect(isPositiveInteger(1.5)).toBe(false);
	});
	it('returns false for negative float', () => {
		expect(isPositiveInteger(-1.5)).toBe(false);
	});
	it('returns false for undefined', () => {
		expect(isPositiveInteger(undefined)).toBe(false);
	});
	it('returns false for empty string', () => {
		expect(isPositiveInteger('')).toBe(false);
	});
});
