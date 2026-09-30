'use client'
import React, {useEffect, useState, type MouseEvent } from "react";
import { format } from "date-fns";
import { useStateHandler } from "../lib/useStateHandler";
import { ReceiptType, RawReceiptItem } from "@/app/types/receipt";
import { RawTags } from "@/app/types/tags";
import Switcher from "../ui/Switcher";
import { ReceiptParams, ReceiptItems } from "../ui/elements/receiptElements";
import {request} from "@/components/lib/request";
import { useValidation } from "../lib/useValidation";
import { receiptRules } from "../lib/receiptValidation";
import { normalizeItems, normalizeTags } from "../lib/tags";

interface NewReceiptFormState {
    date: string;
    amount: number | string;
    description: string;
    category: string;
    tags: RawTags;
    items?: RawReceiptItem[];
}

export default function NewReceipt( { categories }: { categories: string[] } ) {

    const [receiptType, setReceiptType] = useState<ReceiptType>('simple');
    const [tags, setTags] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const { errors, validate } = useValidation(receiptRules(receiptType));

    const handleReceiptTypeChange = (e: MouseEvent<HTMLButtonElement>) => {
        const name = (e.target as HTMLButtonElement).name as ReceiptType;
        if (name === 'extended') {
            if (!stateHandler.formData.items) {
                stateHandler.changeFormData({
                    ...stateHandler.formData,
                    items: [{ amount: 0, tags: [''] }]
                });
            }
        }
        setReceiptType(name);
    };

    const initialState: NewReceiptFormState = {
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: '',
        description: '',
        category: categories[0] ?? '',
        tags: [],
        items: [{ amount: 0, tags: [''] }]
    }

    const stateHandler = useStateHandler(initialState);
    const { formData } = stateHandler;

    const submitForm = async (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        if (validate(formData)) {
            setSaving(true);

            const receiptBody = {
                ...formData,
                type: receiptType,
                tags: normalizeTags(formData.tags),
                items: receiptType === "extended" ? normalizeItems(formData.items) : undefined,
            };

            try {
                const response = await request('receipt/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(receiptBody),
                });

                if (response.error) {
                    window.alert(`Chyba: ${response.error}`);
                } else {
                    window.alert('Účtenka úspěšně zaevidována');
                    stateHandler.clearForm();
                }

            } catch (e) {
                window.alert(e instanceof Error ? e.message : String(e));
            }

            setSaving(false);
        }
    };

    const fetchTags = async () => {
        const tags = await request('tags/');
        setTags(tags);
    };

    useEffect(() => {
        fetchTags();
    }, []);

    return (
        <>
            <div className="mt-4">
                <div className="ml-12 space-y-5">
                    <h1 className="text-2xl">Nová útrata</h1>
                    <div className='inline-flex gap-1'>
                        <Switcher name='simple' text='Základní' stateTracker={receiptType} changeHandler={handleReceiptTypeChange} />
                        <Switcher name='extended' text='Rozšířená' stateTracker={receiptType} changeHandler={handleReceiptTypeChange} />
                    </div>
                    <div className="">
                        <ReceiptParams
                            handler={stateHandler}
                            tags={tags}
                            categories={categories}
                            type={receiptType}
                            validationErrors={errors}
                        />
                        {
                            receiptType === "extended" ?
                                <div className="mb-2">
                                    <ReceiptItems handler={stateHandler} tags={tags} validationErrors={errors} />
                                </div>
                                : <div />
                        }
                    </div>
                    <div className="w-full flex mt-2 pr-12 justify-center md:justify-start">
                        <button
                            className="button button--active"
                            onClick={submitForm}
                            disabled={saving}
                        >{saving ? 'Odesílá se...' : 'Odeslat'}</button>
                    </div>
                </div>

            </div>
        </>
    )
}
