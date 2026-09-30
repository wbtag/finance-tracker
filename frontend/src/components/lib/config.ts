import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse, TomlError } from 'smol-toml';

export interface AppConfig {
    appName: string;
    fiscalMonthStart: number;
    sundayWeekStart: boolean;
}

const CONFIG_PATH = process.env.CONFIG_PATH ?? path.resolve(process.cwd(), '..', 'config.toml');

type RawConfig = { App?: { name?: string }, Budgets?: { month_start?: unknown, sunday_week_start?: unknown } };

let config: AppConfig | undefined;

function loadConfig(): AppConfig {
    let raw: RawConfig;
    try {
        raw = parse(readFileSync(/*turbopackIgnore: true*/ CONFIG_PATH, 'utf8')) as RawConfig;
    } catch (e) {
        if (e instanceof TomlError) {
            throw new Error(`Malformed TOML in ${CONFIG_PATH}: ${e.message}`);
        }
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
            throw new Error(`No config file at ${CONFIG_PATH}. Copy config.example.toml to config.toml.`);
        }
        throw e;
    }

    const fiscalMonthStart = raw.Budgets?.month_start;
    if (typeof fiscalMonthStart !== 'number' || !Number.isInteger(fiscalMonthStart) || fiscalMonthStart < 1 || fiscalMonthStart > 28) {
        throw new Error(`month_start must be between 1 and 28, got ${fiscalMonthStart}`);
    }

    const sundayWeekStart = raw.Budgets?.sunday_week_start;
    if (typeof sundayWeekStart !== 'boolean') {
        throw new Error(`sunday_week_start must be a boolean, got ${sundayWeekStart}`);
    }

    const appName = raw.App?.name;
    if (typeof appName !== 'string' || !appName) {
        throw new Error(`App.name must be a non-empty string, got ${appName}`);
    }

    return { fiscalMonthStart, sundayWeekStart, appName };
}

export function getConfig(): AppConfig {
    config ??= loadConfig();
    return config;
}
