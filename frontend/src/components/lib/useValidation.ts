import { useState } from "react";

// A rule returns true when the field is invalid.
export type Rules<T, K extends string> = Record<K, (data: T) => boolean>;
export type ValidationErrors<K extends string> = Partial<Record<K, boolean>>;

export function useValidation<T, K extends string>(rules: Rules<T, K>) {

    const [errors, setErrors] = useState<ValidationErrors<K>>({});

    const validate = (data: T) => {
        const next: ValidationErrors<K> = {};
        for (const key in rules) {
            next[key] = rules[key](data);
        }
        setErrors(next);
        return !Object.values(next).some(Boolean);
    };

    return { errors, validate };
}

export const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
export const isInteger = (value: unknown) => String(value).trim() !== '' && Number.isInteger(Number(value));
export const isPositiveInteger = (value: unknown) => isInteger(value) && Number(value) > 0;
export const isBlank = (value: string | undefined) => !value || value.trim() === '';
