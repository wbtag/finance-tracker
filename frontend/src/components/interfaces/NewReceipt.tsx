'use client'
import React, { type MouseEvent, useState } from "react";
import { format } from "date-fns";
import { useStateHandler } from "../lib/useStateHandler";
import { RawReceiptItem, ReceiptType } from "@/app/types/receipt";
import { RawTags } from "@/app/types/tags";
import Switcher from "../ui/Switcher";
import { ReceiptItems, ReceiptParams } from "../ui/elements/receiptElements";
import { request } from "@/components/lib/request";
import { useValidation } from "../lib/useValidation";
import { receiptRules } from "../lib/receiptValidation";
import { emptyItem, normalizeItems, normalizeTags } from "../lib/tags";

interface NewReceiptFormState {
    date: string;
    amount: number | string;
    description: string;
    category: string;
    tags: RawTags;
    items?: RawReceiptItem[];
}

export default function NewReceipt({ categories, tags }: { categories: string[]; tags: string[]; }) {

    const [receiptType, setReceiptType] = useState<ReceiptType>('simple');
    const [saving, setSaving] = useState(false);
    const { errors, validate } = useValidation(receiptRules(receiptType));

    const handleReceiptTypeChange = (e: MouseEvent<HTMLButtonElement>) => {
        const name = (e.target as HTMLButtonElement).name as ReceiptType;
        if (name === 'extended') {
            if (!stateHandler.formData.items) {
                stateHandler.changeFormData({
                    ...stateHandler.formData,
                    items: [emptyItem()]
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
        items: [emptyItem()]
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
                await request('receipt/', {
                    method: 'POST',
                    body: JSON.stringify(receiptBody),
                });

                window.alert('Účtenka úspěšně zaevidována');
                stateHandler.clearForm();
            } catch (e) {
                window.alert('Chyba: ' + (e instanceof Error ? e.message : String(e)));
            } finally {
                setSaving(false);
            }
        }
    };

    return (
        <>
            <div className="mt-4">
                <div className="ml-12 space-y-5">
                    <h1 className="text-2xl">Nová útrata</h1>
                    <div className='inline-flex gap-1'>
                        <Switcher name='simple' text='Základní' stateTracker={receiptType}
                                  changeHandler={handleReceiptTypeChange}/>
                        <Switcher name='extended' text='Rozšířená' stateTracker={receiptType}
                                  changeHandler={handleReceiptTypeChange}/>
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
                                    <ReceiptItems handler={stateHandler} tags={tags} validationErrors={errors}/>
                                </div>
                                : <div/>
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
