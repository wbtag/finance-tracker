import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse, TomlError } from 'smol-toml';

export interface AppConfig {
    fiscalMonthStart: number;
}

const CONFIG_PATH = process.env.CONFIG_PATH ?? path.resolve(process.cwd(), '..', 'config.toml');

type RawConfig = { Budgets?: { month_start?: unknown } };

let config: AppConfig | undefined;

function loadConfig(): AppConfig {
    let raw: RawConfig;
    try {
        raw = parse(readFileSync(CONFIG_PATH, 'utf8')) as RawConfig;
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

    return { fiscalMonthStart };
}

export function getConfig(): AppConfig {
    config ??= loadConfig();
    return config;
}
