import { describe, it, expect } from 'vitest';
import { normalizeTags, normalizeItems, emptyItem } from "@/components/lib/tags";
import { RawReceiptItem } from "@/app/types/receipt";

describe('normalizeTags', () => {
	it.each([
		{ tags: [], expected: [], id: 'empty array' },
		{ tags: '', expected: [], id: 'empty string' },
		{ tags: [{ value: 'test1' }, { value: 'test2' }], expected: ['test1', 'test2'], id: 'array of value objects' },
		{ tags: ['test1', 'test2'], expected: ['test1', 'test2'], id: 'array of strings' },
		{ tags: ['test1', { value: 'test2' }], expected: ['test1', 'test2'], id: 'mixed array' },
		{
			tags: [' test1 ', { value: ' test2 ' }, '  ', { value: '' }],
			expected: ['test1', 'test2'],
			id: 'array with whitespace and blank entries'
		},
		{ tags: ['test1', null, { value: null }], expected: ['test1'], id: 'array with null entries' },
		{ tags: null, expected: [], id: 'null' },
		{ tags: undefined, expected: [], id: 'undefined' },
		{ tags: '   ', expected: [], id: 'whitespace-only string' },
		{ tags: '[{"value":"test1"},{"value":"test2"}]', expected: ['test1', 'test2'], id: 'Tagify JSON string' },
		{ tags: '["test1","test2"]', expected: ['test1', 'test2'], id: 'JSON string array' },
		{ tags: ' [] ', expected: [], id: 'empty JSON array with whitespace' },
		{ tags: 'test1, test2', expected: ['test1', 'test2'], id: 'comma-separated string' },
		{ tags: 'test1,, ,test2,', expected: ['test1', 'test2'], id: 'comma-separated string with blank entries' },
		{ tags: 'test1', expected: ['test1'], id: 'single tag string' },
		{ tags: '123', expected: ['123'], id: 'non-array JSON string' },
	])('parses $id', (
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		{ tags, expected, id }: {
			tags: unknown;
			expected: string[] | undefined[];
			id: string;
		}
	) => {
		const normalizedTags = normalizeTags(tags as RawReceiptItem['tags']);
		expect(normalizedTags).toEqual(expected);
	});
});

describe('normalizeItems', () => {
	it('returns empty array on undefined input', () => {
		const items = normalizeItems(undefined);
		expect(items).toEqual([]);
	});

	it.each([
		{
			items: [{ id: 1, amount: '20', tags: [{ value: 'test1' }, { value: 'test2' }] }],
			id: 'string amount, tags as value objects'
		},
		{
			items: [{ id: 1, amount: 20, tags: [{ value: 'test1' }, { value: 'test2' }] }],
			id: 'int amount, tags as value objects'
		},
		{ items: [{ id: 1, amount: 20, tags: ['test1', 'test2'] }], id: 'int amount, tags as string arrays' },
	]) // eslint-disable-next-line @typescript-eslint/no-unused-vars
		('parses input with $id', ({ items, id }) => {
			const normalizedItems = normalizeItems(items as RawReceiptItem[]);
			expect(normalizedItems).toEqual([{ id: 1, amount: 20, tags: ['test1', 'test2'] }]);
		});

	it('drops the client-only key', () => {
		const [item] = normalizeItems([{ key: 5, id: 1, amount: 20, tags: ['test1'] }]);
		expect(item).not.toHaveProperty('key');
		expect(item).toEqual({ id: 1, amount: 20, tags: ['test1'] });
	});

	it('normalizes Tagify JSON tags and keeps item order', () => {
		const items = normalizeItems([
			{ key: 1, amount: '200', tags: '[{"value":"test1"}]' },
			{ key: 2, amount: '800', tags: 'test2, test3' },
		]);
		expect(items).toEqual([
			{ id: undefined, amount: 200, tags: ['test1'] },
			{ id: undefined, amount: 800, tags: ['test2', 'test3'] },
		]);
	});
});

describe('emptyItem', () => {
	it('returns item template when called', () => {
		expect(emptyItem()).to.deep.equal({ key: 1, amount: 0, tags: [''] });
	});

	it('increments item key', () => {
		const item1 = emptyItem();
		const item2 = emptyItem();
		expect(item2.key).to.be.gt(item1.key as number);
	});
});