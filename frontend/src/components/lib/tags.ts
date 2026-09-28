import type { RawTags } from "@/app/types/tags";
import type { RawReceiptItem } from "@/app/types/receipt";

// Tags go to the API as string[]. Tagify hands out a JSON string of {value} objects,
// and receipts from the API can carry null for untagged rows.
export function normalizeTags(tags: RawTags | undefined): string[] {
    if (!tags) return [];
    if (typeof tags === 'string') {
        const trimmed = tags.trim();
        if (!trimmed) return [];
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return normalizeTags(parsed);
        } catch {
            return trimmed.split(',').map(t => t.trim()).filter(Boolean);
        }
        return [trimmed];
    }
    return tags
        .map(t => (typeof t === 'string' ? t : t?.value ?? ''))
        .map(t => t.trim())
        .filter(Boolean);
}

export function normalizeItems(items: RawReceiptItem[] | undefined) {
    return (items ?? []).map(({ id, amount, tags }) => ({
        id,
        amount: Number(amount),
        tags: normalizeTags(tags),
    }));
}
