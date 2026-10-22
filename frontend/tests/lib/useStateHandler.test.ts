import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest';
import { useStateHandler } from "@/components/lib/useStateHandler";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: Record<string, any> = {
	amount: 0,
	description: '',
	date: new Date(),
}

describe('useStateHandler', () => {
	it('stores formData in correct form', () => {
		const { result } = renderHook(() => useStateHandler(data))
		const { formData } = result.current;
		expect(formData).toEqual(data);
	});
	it('handles parameter change', () => {
		const { result } = renderHook(() => useStateHandler(data))
		const { handleInput } = result.current;
		// @ts-expect-error test typing
		act(() => handleInput({ target: { name: 'amount', value: '20' } }));
		expect(result.current.formData.amount).toEqual('20');
	});
	it('handles bulk formData change', () => {
		const { result } = renderHook(() => useStateHandler(data));
		const { changeFormData } = result.current;
		act(() => changeFormData({ changed: true }));
		expect(result.current.formData).to.deep.equal({ changed: true });
	});
	it('handles form clearance', () => {
		const { result } = renderHook(() => useStateHandler(data));
		const { clearForm, changeFormData } = result.current;
		act(() => changeFormData({}));
		expect(result.current.formData).toEqual({});
		act(() => clearForm());
		expect(result.current.formData).to.deep.equal(data);
	});
	it('handles adding to an array', () => {
		const { result } = renderHook(() => useStateHandler({
			...data,
			items: []
		}));
		const { addArrayItem } = result.current;
		// @ts-expect-error test typing
		act(() => addArrayItem({ preventDefault: () => null, currentTarget: { name: 'items' } }));
		expect(result.current.formData.items).to.deep.equal([
			{ key: 1, amount: 0, tags: [''] }
		])
	});
	it('handles removal from array', () => {
		const { result } = renderHook(() => useStateHandler({
			...data,
			items: [
				{ key: 1, amount: 100, tags: ['test1'] },
				{ key: 2, amount: 200, tags: ['test2'] },
				{ key: 3, amount: 300, tags: ['test3'] }
			]
		}));
		const { removeArrayItem } = result.current;
		// @ts-expect-error test typing
		act(() => removeArrayItem({ preventDefault: () => null, currentTarget: { name: 'items' } }, 1));
		expect(result.current.formData.items.length).toBe(2);
		expect(result.current.formData.items[1]).to.deep.equal({ key: 3, amount: 300, tags: ['test3'] });
	});
	it('handles param change in array item', () => {
		const { result } = renderHook(() => useStateHandler({
			...data,
			items: [
				{ key: 1, amount: 100, tags: ['test1'] },
				{ key: 2, amount: 200, tags: ['test2'] },
				{ key: 3, amount: 300, tags: ['test3'] }
			]
		}));
		const { changeArrayItem } = result.current;

		act(() => changeArrayItem(
			// @ts-expect-error test typing
			{ preventDefault: () => null, target: { name: 'amount-1', value: 150 } }, 1));
		act(() => changeArrayItem(
			// @ts-expect-error test typing
			{ preventDefault: () => null, target: { name: 'tags-1', value: ['edit'] } }, 1));
		expect(result.current.formData.items[1]).to.deep.equal({ key: 2, amount: 150, tags: ['edit'] });
	});
})