import type { RawReceiptItem, ReceiptType } from "@/app/types/receipt";
import { isBlank, isPositiveInteger, isValidDate, type Rules, type ValidationErrors } from "./useValidation";
import { normalizeTags } from "./tags";

export interface ReceiptFormData {
    date: string;
    amount: number | string;
    description: string;
    items?: RawReceiptItem[];
}

export type ReceiptField = 'date' | 'amount' | 'description' | 'itemsAmount' | 'itemsTags';
export type ReceiptErrors = ValidationErrors<ReceiptField>;

const itemsSum = (items: RawReceiptItem[]) => items.reduce((acc, curr) => acc + Number(curr.amount), 0);

export const receiptRules = (type: ReceiptType): Rules<ReceiptFormData, ReceiptField> => ({
    date: ({ date }) => !isValidDate(date),
    amount: ({ amount }) => !isPositiveInteger(amount),
    description: ({ description }) => isBlank(description),
    itemsAmount: ({ amount, items = [] }) => type === 'extended' && (
        items.some((item) => !isPositiveInteger(item.amount)) || Number(amount) - itemsSum(items) != 0
    ),
    itemsTags: ({ items = [] }) => type === 'extended'
        && items.some((item) => normalizeTags(item.tags).length === 0),
});
