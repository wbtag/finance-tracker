import { fiscalMonthStartDate } from '@/components/interfaces/Query';
import { describe, it, expect } from 'vitest';

const fiscalMonthStart = 10;

describe('fiscalMonthStartDate', () => {
	it('gives current month for later dates', () => {
		expect(fiscalMonthStartDate(
			new Date(2026,9,15), fiscalMonthStart)
		).toStrictEqual(new Date(2026,9,fiscalMonthStart));
	});
	it('gives current month for day of month start', () => {
		expect(fiscalMonthStartDate(
			new Date(2026,9,fiscalMonthStart), fiscalMonthStart)
		).toStrictEqual(new Date(2026,9,fiscalMonthStart));
	})
	it('gives current month for day after month start', () => {
		expect(fiscalMonthStartDate(
			new Date(2026,9,fiscalMonthStart+1), fiscalMonthStart)
		).toStrictEqual(new Date(2026,9,fiscalMonthStart));
	});
	it('falls back to last month for day before month start', () => {
		expect(fiscalMonthStartDate(
			new Date(2026,9,fiscalMonthStart-1), fiscalMonthStart)
		).toStrictEqual(new Date(2026,8,fiscalMonthStart));
	})
	it('falls back to last month if date is before fiscal month start', () => {
		expect(fiscalMonthStartDate(
			new Date(2026,9,1), fiscalMonthStart)
		).toStrictEqual(new Date(2026,8,fiscalMonthStart));
	});
	it('falls back to last year in January before fiscal month start', () => {
		expect(fiscalMonthStartDate(
			new Date(2026,0,8), fiscalMonthStart)
		).toStrictEqual(new Date(2025,11, fiscalMonthStart));
	})
})