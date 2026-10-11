import { expect, beforeEach, describe, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('node:fs', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:fs')>();
	const readFileSync = vi.fn();
	return { ...actual, readFileSync, default: { ...actual, readFileSync } };
});

const toml = (monthStart: unknown = 1, sundayStart: unknown = false, name: unknown = '"App"') => `
  [App]
  name = ${name}

  [Budgets]
  month_start = ${monthStart}
  sunday_week_start = ${sundayStart}
`;

beforeEach(() => vi.resetModules());

describe('config', () => {
	it('parses toml values correctly', async () => {
		vi.mocked(readFileSync).mockReturnValue(toml(10,false,'"Finance tracker"'));
		const { getConfig } = await import("@/components/lib/config");
		const config = getConfig();
		expect(config.fiscalMonthStart).toBe(10);
		expect(config.sundayWeekStart).toBe(false);
		expect(config.appName).toBe("Finance tracker");
	});
	it('caches the config for future reads', async () => {
		vi.mocked(readFileSync).mockReturnValue(toml(10,false,'"Finance tracker"'));
		const { getConfig } = await import("@/components/lib/config");
		getConfig();
		getConfig();
		expect(readFileSync).toHaveBeenCalledTimes(1);
	})
	it.each([
		{ monthStart: 29, sundayStart: false, name: '"App"', id: 'monthStart > 28', error: 'month_start must be between 1 and 28, got 29' },
		{ monthStart: -1, sundayStart: false, name: '"App"', id: 'monthStart < 1', error: 'month_start must be between 1 and 28, got -1' },
		{ monthStart: 0, sundayStart: false, name: '"App"', id: 'monthStart is 0', error: 'month_start must be between 1 and 28, got 0' },
		{ monthStart: 8.5, sundayStart: false, name: '"App"', id: 'monthStart is float', error: 'month_start must be between 1 and 28, got 8.5' },
		{ monthStart: '"10"', sundayStart: false, name: '"App"', id: 'monthStart is string', error: 'month_start must be between 1 and 28, got 10' },
		{ monthStart: 10, sundayStart: '"false"', name: '"App"', id: 'sundayWeekStart is string', error: 'sunday_week_start must be a boolean, got false' },
		{ monthStart: 10, sundayStart: 1, name: '"App"', id: 'sundayWeekStart is 1', error: 'sunday_week_start must be a boolean, got 1' },
		{ monthStart: 10, sundayStart: false, name: '""', id: 'appName is empty string', error: 'App.name must be a non-empty string, got ' },
	])('throws contextual error when $id', async ({ monthStart, sundayStart, name, error }) => {
		vi.mocked(readFileSync).mockReturnValue(toml(monthStart, sundayStart, name));
		const { getConfig } = await import("@/components/lib/config");
		expect(() => getConfig()).toThrow(error);
	});
	it.each([
		{monthStart: null, sundayStart: false, name: '"App"', id: 'monthStart'},
		{monthStart: 10, sundayStart: null, name: '"App"', id: 'sundayStart'},
		{monthStart: 10, sundayStart: false, name: null, id: 'appName'},
	])('throws "malformed TOML" on null $id', async ( { monthStart, sundayStart, name } ) => {
		vi.mocked(readFileSync).mockReturnValue(toml(monthStart, sundayStart, name));
		const { getConfig } = await import("@/components/lib/config");
		expect(() => getConfig()).toThrow(/^Malformed TOML/)
	});
	it.each([
		{ file: '[App]\nname = "App"\n[Budgets]\nsunday_week_start = false', id: 'month_start', error: 'month_start must be between 1 and 28, got undefined' },
		{ file: '[App]\nname = "App"\n[Budgets]\nmonth_start = 10', id: 'sunday_week_start', error: 'sunday_week_start must be a boolean, got undefined' },
		{ file: '[App]\n[Budgets]\nmonth_start = 10\nsunday_week_start = false', id: 'App.name', error: 'App.name must be a non-empty string, got undefined' },
		{ file: '[App]\nname = "App"', id: 'Budgets section', error: 'month_start must be between 1 and 28, got undefined' },
	])('throws contextual error when $id is missing', async ({ file, error }) => {
		vi.mocked(readFileSync).mockReturnValue(file);
		const { getConfig } = await import("@/components/lib/config");
		expect(() => getConfig()).toThrow(error);
	});
	it('throws "no config file" error on ENOENT error', async () => {
		vi.mocked(readFileSync).mockThrow(Object.assign(new Error(), { code: 'ENOENT' }));
		const { getConfig } = await import("@/components/lib/config");
		expect(() => getConfig()).toThrow(/^No config file/)
	});
	it('throws error message on generic error', async () => {
		vi.mocked(readFileSync).mockThrow(new Error('Something went wrong'));
		const { getConfig } = await import("@/components/lib/config");
		expect(() => getConfig()).toThrow("Something went wrong");
	});

})