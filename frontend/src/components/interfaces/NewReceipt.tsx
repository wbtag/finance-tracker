'use client'
import React, { useEffect, useRef, useState, type MouseEvent } from "react";
import { useStateHandler } from "../lib/useStateHandler";
import { ReceiptType, RawReceiptItem } from "@/app/types/receipt";
import { RawTags } from "@/app/types/tags";
import Switcher from "../ui/Switcher";
import { ReceiptParams, ReceiptItems } from "../ui/elements/receiptElements";
import {request} from "@/components/lib/request";

interface NewReceiptFormState {
    date: string;
    amount: number | string;
    description: string;
    category: string;
    tags: RawTags;
    items: RawReceiptItem[];
}

export default function NewReceipt() {

    const [receiptType, setReceiptType] = useState<ReceiptType>('simple');
    const [tags, setTags] = useState<string[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const handleReceiptTypeChange = (e: MouseEvent<HTMLButtonElement>) => {
        const name = (e.target as HTMLButtonElement).name as ReceiptType;
        if (name === 'extended') {
            if (!stateHandler.formData.items) {
                stateHandler.changeFormData({
                    ...stateHandler.formData,
                    items: [{ amount: 0, tags: [''] }]
                });
            }
        } else if (name === 'mandatory') {
            stateHandler.changeFormData({
                ...stateHandler.formData,
                category: 'Mandatorní'
            });
        }
        setReceiptType(name);
    };

    const initialState: NewReceiptFormState = {
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        description: '',
        category: '',
        tags: [],
        items: [{ amount: 0, tags: [''] }]
    }

    const stateHandler = useStateHandler(initialState);
    const { formData } = stateHandler;

    const submitForm = async (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        setSaving(true);

        if (
            receiptType != "extended" ||
            Number(formData.amount) - formData.items.reduce((acc, curr) => acc + Number(curr.amount), 0) === 0
        ) {

            const receiptBody = {
                ...formData,
                type: receiptType
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
                };

                stateHandler.clearForm();
            } catch (e) {
                window.alert(e instanceof Error ? e.message : String(e));
            }
        } else {
            window.alert("Chyba: Součet položek v rozšířené účtence se musí rovnat celkové hodnotě účtenky.");
        }

        setSaving(false);
    };

    const fetchTags = async () => {
        const tags = await request('tags/');
        setTags(tags);
    };

    const fetchCategories = async () => {
        const response = await request('categories/');
        setCategories(response);
    }


    useEffect(() => {
        fetchTags();
        fetchCategories();
    }, []);

    return (
        <>
            <div className="mt-4">
                <div className="ml-12 space-y-5">
                    <h1 className="text-2xl">Nová útrata</h1>
                    <div className='inline-flex gap-1'>
                        <Switcher name='simple' text='Základní' stateTracker={receiptType} changeHandler={handleReceiptTypeChange} />
                        <Switcher name='extended' text='Rozšířená' stateTracker={receiptType} changeHandler={handleReceiptTypeChange} />
                        <Switcher name='mandatory' text='Mandatorní' stateTracker={receiptType} changeHandler={handleReceiptTypeChange} />
                    </div>
                    <div className="">
                        <ReceiptParams handler={stateHandler} tags={tags} categories={categories} type={receiptType} />
                        {
                            receiptType === "extended" ?
                                <div className="mb-2">
                                    <ReceiptItems handler={stateHandler} tags={tags} />
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
