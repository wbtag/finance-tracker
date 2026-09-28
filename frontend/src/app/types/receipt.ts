import { RawTags } from "./tags";

export type ReceiptType = 'simple' | 'extended' | 'mandatory';

export interface Receipt {
    id: number;
    type: ReceiptType;
    category: string;
    date: number;
    dateCreated: number;
    week: number;
    year: number;
    tags: string[];
    amount: number;
    description: string;
    items?: ReceiptItem[];
}

export interface RawReceiptItem {
    id?: number;
    amount: number | string;
    tags: string | string[];
}

export interface ReceiptItem {
    id: number;
    amount: number;
    tags: string[];
}

export interface NewReceiptInput {
    receiptType?: ReceiptType;
    date?: string;
    amount?: number | string;
    description?: string;
    category?: string;
    tags?: RawTags;
    items?: RawReceiptItem[];
}

export interface UpdateReceiptInput {
    id: string;
    amount: number | string;
    description: string;
    category: string;
    type?: string;
    date: string | number;
    tags?: RawTags;
    items?: RawReceiptItem[];
}