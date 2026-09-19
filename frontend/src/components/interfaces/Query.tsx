'use client'

import { RawTags } from "@/app/types/tags";
import { Receipt } from "@/app/types/receipt";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useStateHandler } from "../lib/useStateHandler";
import { Select, Input } from "../ui/elements/formElements";
import { TagInput } from "../ui/elements/receiptElements";
import ReceiptRenderer from "../ui/ReceiptRenderer";
import CategoryPicker from "../ui/CategoryPicker";
import { request } from "@/components/lib/request";

interface QueryFormState {
    timeframe: string;
    from: string;
    to: string;
    queryTags: RawTags;
    categories: string[];
}

export default function Query({ period }: { period?: string }) {

    const date = new Date();

    const fiscalMonthStart = parseInt(process.env['NEXT_PUBLIC_FiscalMonthStart'] || '1');

    const initialState: QueryFormState = {
        timeframe: 'fiscalMonth',
        from: new Date(
            date.getFullYear(),
            date.getDate() >= fiscalMonthStart ?
                date.getMonth() : date.getMonth() - 1,
            fiscalMonthStart + 1
        ).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
        queryTags: [],
        categories: []
    };

    const stateHandler = useStateHandler(initialState);
    const { formData, changeFormData } = stateHandler;

    const changeTimeframe = (e: ChangeEvent<HTMLSelectElement>) => {

        const timeframe = e.target.value;

        let from: string, to: string;

        if (timeframe != 'custom') {

            const date = new Date();
            const fromDate = new Date();

            switch (timeframe) {
                case "week":
                    fromDate.setDate(date.getDate() - date.getDay());
                    break;
                case "weekToDate":
                    fromDate.setDate(date.getDate() - 6);
                    break;
                case "fiscalMonth":
                    // Day goes to 1 first: setMonth() on the 29th-31st can roll
                    // into the following month.
                    fromDate.setDate(1);
                    if (date.getDate() < fiscalMonthStart) {
                        fromDate.setMonth(date.getMonth() - 1);
                    }
                    fromDate.setDate(fiscalMonthStart + 1);
                    break;
                case "month":
                    fromDate.setDate(1);
                    break;
                case "monthToDate":
                    fromDate.setMonth(date.getMonth() - 1);
                    break;
            };

            from = fromDate.toISOString().split('T')[0];
            to = date.toISOString().split('T')[0];
        } else {
            from = formData.from;
            to = formData.to;
        };

        changeFormData({
            from,
            to,
            timeframe,
            queryTags: formData.queryTags,
            categories: formData.categories
        });
    };

    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [activeCategories, setActiveCategories] = useState<string[]>([]);
    const [tags, setTags] = useState<string[]>([]);

    const fetchTags = async () => {
        const tags = await request('tags/');
        setTags(tags);
    }

    const fetchCategories = async () => {
        const response = await request('categories/');
        categories.push('Mandatorní');
        setCategories(response);
        changeFormData((prevState) => ({
            ...prevState,
            categories
        }));
    }

    useEffect(() => {
        fetchTags();
        fetchCategories();
        query({ from: formData.from, to: formData.to });
    }, []);

    useEffect(() => {
        filterReceipts(receipts, activeCategories);
    }, [activeCategories]);

    const query = async (input?: FormEvent<HTMLFormElement> | { from: string; to: string }) => {

        let from = formData.from;
        let to = formData.to;

        if (input && 'preventDefault' in input) {
            input.preventDefault();
        } else if (input && input.from && input.to) {
            from = input.from;
            to = input.to;
        };

        const receipts = await request('query/', {
            method: 'POST',
            body: JSON.stringify({
                from,
                to,
                tags: formData.queryTags,
                offset: 0,
                limit: 200,
            })
        })
        setReceipts(receipts);
        setFilteredReceipts(receipts);
    };

    const filterReceipts = (receipts: Receipt[], categories: string[]) => {
        const receiptsToShow = receipts.filter((receipt) => categories.includes(receipt.category));
        setFilteredReceipts(receiptsToShow);
    };

    const timeframeOptions = [
        { name: "Tento týden", value: "week" },
        { name: "Posledních 7 dní", value: "weekToDate" },
        { name: "Tento měsíc", value: "month" },
        { name: "Fiskální měsíc", value: "fiscalMonth" },
        { name: "Posledních 30 dní", value: "monthToDate" },
        { name: "Vlastní", value: "custom" },
    ];

    return (
        <>
            <div className="md:mt-4">
                <form className="form" onSubmit={query}>
                    <div>
                        <div className="flex flex-col w-full max-w-120 mx-auto px-4 sm:px-0 py-2">
                            <Select
                                options={timeframeOptions}
                                handler={stateHandler}
                                changeHandler={changeTimeframe}
                                name="timeframe"
                                label="Časový úsek"
                            />
                            {formData.timeframe === 'custom' ?
                                <div className="flex flex-wrap gap-x-2">
                                    <Input
                                        label="Datum od"
                                        type="date"
                                        name="from"
                                        value={formData.from}
                                        handler={stateHandler}
                                    />
                                    <Input
                                        label="Datum do"
                                        type="date"
                                        name="to"
                                        value={formData.to}
                                        handler={stateHandler}
                                    />
                                </div> : <div />
                            }
                            <div className="flex flex-row">
                                <TagInput handler={stateHandler} tags={tags} name="queryTags" />
                            </div>
                            <div className="w-full flex justify-center md:justify-start mt-4">
                                <button className="button button--ux" type="submit">Aktualizovat</button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <CategoryPicker
                categories={categories}
                activeCategories={activeCategories}
                setActiveCategories={setActiveCategories}
            />
            <p className="mt-4 text-lg text-center">Celková útrata: {filteredReceipts.reduce((a, c) => a + c.amount, 0)} Kč</p>
            {filteredReceipts.length > 0 ?
                <div>
                    <div className="w-full max-w-2xl mx-auto px-4 sm:px-0 py-2">
                        <ReceiptRenderer receipts={filteredReceipts} categories={categories}  />
                    </div>
                </div> :
                <div>
                    <p className="py-5 text-center">Žádné výsledky.</p>
                </div>
            }
        </>
    )
}
