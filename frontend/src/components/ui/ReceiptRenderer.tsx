import { useState, type MouseEvent } from "react";
import { ReceiptParams, ReceiptItems } from "./elements/receiptElements";
import { useStateHandler } from "../lib/useStateHandler";
import { useValidation } from "../lib/useValidation";
import { receiptRules } from "../lib/receiptValidation";
import { normalizeItems, normalizeTags } from "../lib/tags";
import { useEffect } from "react";
import { request } from "@/components/lib/request";
import { Receipt, RawReceiptItem } from "@/app/types/receipt";
import { RawTags } from "@/app/types/tags";

interface ReceiptRendererProps {
    receipts: Receipt[];
    categories: string[];
}

export default function ReceiptRenderer({ receipts, categories }: ReceiptRendererProps) {

    const [tags, setTags] = useState<string[]>([]);

    const fetchTags = async () => {
        const tags = await request('tags/');
        setTags(tags);
    };

    useEffect(() => {
        fetchTags();
    }, []);

    return (
        <>
            {
                receipts.map((receipt, i) => (
                    <ReceiptRow key={receipt.id ?? i} receipt={receipt} categories={categories} tags={tags} />
                ))
            }
        </>
    )
}

interface ReceiptRowProps {
    receipt: Receipt;
    categories: string[];
    tags: string[];
}

function ReceiptRow({ receipt, categories, tags }: ReceiptRowProps) {
    const [expanded, setExpanded] = useState(false);
    const [editing, setEditing] = useState(false);
    const hasItems = Array.isArray(receipt.items) && receipt.items.length > 0;

    const handleDeleteReceipt = async (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        if (window.confirm("Opravdu smazat tuto účtenku?")) {
            try {
                await request('receipt/', {method: 'DELETE'}, {
                    id: receipt.id,
                })
                window.alert("Účtenka smazána");
                window.location.reload();
            } catch (e: unknown) {
                if (e instanceof Error) {
                    window.alert('Chyba: ' + e.message)
                }
            }
        }
    };

    const handleEditClick = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setEditing(true);
    };

    return (
        <div
            onClick={() => setExpanded(e => !e)}
            className="border-b border-white/10"
        >
            <div className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 sm:gap-4 py-3 sm:py-3.5 cursor-pointer`}>

                <div className="min-w-0">
                    <p className="text-white/90 text-sm sm:text-base truncate tracking-wide">
                        {receipt.description}
                    </p>
                    <p className="text-xs italic mt-0.5 tracking-wide">
                        {receipt.category}
                    </p>
                </div>

                <span className="text-white/85 text-sm sm:text-base tabular-nums whitespace-nowrap">
                    {Number(receipt.amount).toLocaleString("cs-CZ")} Kč
                </span>

                <div
                    className={`text-white/25 transition-transform duration-200 flex items-center w-3 sm:w-3.5 ${expanded ? "rotate-180" : "rotate-0"}`}
                >
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M2 4.5L6 8L10 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>

            {expanded && (
                <div>
                    {editing ? (
                        <ReceiptEditForm
                            receipt={receipt}
                            tags={tags ?? []}
                            categories={categories}
                            onCancel={() => setEditing(false)}
                            onSaved={() => { setEditing(false); window.location.reload(); }}
                        />
                    ) : (
                        <>
                            <div>
                                <div className="flex flex-row">
                                    <p className="text-white/90 min-w-20 text-sm sm:text-base truncate tracking-wide">
                                        Datum:
                                    </p>
                                    <p className="text-white/90 text-sm sm:text-base truncate tracking-wide">
                                        {new Date(receipt.date).toLocaleDateString('cs-CZ')}
                                    </p>
                                </div>
                                <div className="flex flex-row">
                                    <p className="text-white/90 min-w-20 text-sm sm:text-base truncate tracking-wide">
                                        Značky:
                                    </p>
                                    <p className="text-white/90 text-sm sm:text-base truncate tracking-wide">
                                        {receipt.tags.join(", ")}
                                    </p>
                                </div>
                            </div>
                            {hasItems && (
                                <div>
                                    <p className="text-white/90 text-sm sm:text-base pb-2">Položky:</p>
                                    {
                                        receipt.items!.map((item, i) => (
                                            <div
                                                key={i}
                                                className="flex justify-between items-baseline gap-3 sm:gap-4 py-1 pl-3 sm:pl-4 pr-7 sm:pr-10"
                                            >
                                                <span className="text-white/75 text-xs sm:text-sm italic">
                                                    {Array.isArray(item.tags) && item.tags.length > 0 ? item.tags.join(", ") : "—"}
                                                </span>
                                                <span className="text-white/75 text-xs sm:text-sm tabular-nums whitespace-nowrap shrink-0">
                                                    {Number(item.amount).toLocaleString("cs-CZ")} Kč
                                                </span>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                            <div className="py-5 px-5 flex gap-1 justify-end">
                                <span>
                                    <button className="button button--active" onClick={handleEditClick}>Upravit</button>
                                </span>
                                <span>
                                    <button className="button button--active" onClick={handleDeleteReceipt}>Smazat</button>
                                </span>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div >
    )
}

function toDateInputValue(date: number | string) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface ReceiptEditFormProps {
    receipt: Receipt;
    tags: string[];
    categories: string[];
    onCancel: () => void;
    onSaved: () => void;
}

function ReceiptEditForm({ receipt, tags, categories, onCancel, onSaved }: ReceiptEditFormProps) {

    const {date, items, ...rest} = receipt;

    const stateHandler = useStateHandler({
        date: toDateInputValue(date),
        ...rest,
        ...(items ? { items: items.map(item => ({ ...item, tags: [...item.tags] })) } : {}),
    });

    const { formData } = stateHandler;

    const [saving, setSaving] = useState(false);
    const { errors, validate } = useValidation(receiptRules(receipt.type));

    const handleSave = async (e: MouseEvent<HTMLButtonElement>) => {

        e.stopPropagation();
        if (!validate(formData)) return;
        setSaving(true);

        try {

            const editPayload: Record<string, unknown> = {};
            const original = receipt as unknown as Record<string, unknown>;
            const form = formData as Record<string, unknown>;

            for (const [key, value] of Object.entries(form)) {
                switch (key) {
                    case 'date':
                        if (value != toDateInputValue(receipt.date)) {
                            editPayload.date = value;
                        }
                        break;
                    case 'tags': {
                        const formTags = normalizeTags(value as RawTags);
                        if (JSON.stringify(formTags) != JSON.stringify(normalizeTags(receipt.tags))) {
                            editPayload.tags = formTags;
                        }
                        break;
                    }
                    case 'items': {
                        const formItems = normalizeItems(value as RawReceiptItem[]);
                        if (JSON.stringify(formItems) != JSON.stringify(normalizeItems(receipt.items))) {
                            editPayload.items = formItems;
                        }
                        break;
                    }
                    case 'id':
                        break;
                    default:
                        if (value != original[key]) {
                            editPayload[key] = value;
                        }
                }
            }

            if (Object.keys(editPayload).length > 0) {
                editPayload['id'] = receipt.id
                await request('receipt/', {
                    method: 'PUT',
                    body: JSON.stringify(editPayload),
                })
                window.alert('Změny úspěšně uloženy')
                onSaved();
            } else {
                onCancel();
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="py-3 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
        >
            <ReceiptParams handler={stateHandler} categories={categories} tags={tags} validationErrors={errors} />

            {receipt.type === 'extended' && (
                <ReceiptItems handler={stateHandler} tags={tags} validationErrors={errors} />
            )}

            <div className="flex gap-2 justify-end pt-2">
                <button
                    type="button"
                    className="button button--active"
                    onClick={(e) => { e.stopPropagation(); onCancel(); }}
                >
                    Zrušit
                </button>
                <button
                    type="button"
                    className="button button--active"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? "Ukládá se…" : "Uložit"}
                </button>
            </div>
        </div>
    );
}
