'use client'

// TODO: Visibly show data reload on re-fetch

import { RawTags } from "@/app/types/tags";
import { Receipt } from "@/app/types/receipt";

import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useStateHandler } from "../lib/useStateHandler";
import { Input, Select } from "../ui/elements/formElements";
import { TagInput } from "../ui/elements/receiptElements";
import ReceiptRenderer from "../ui/ReceiptRenderer";
import CategoryPicker from "../ui/CategoryPicker";
import { request } from "@/components/lib/request";
import { normalizeTags } from "../lib/tags";

interface QueryParams {
    from: string;
    to: string;
    tags: RawTags;
}

type QueryFormState = QueryParams & { timeframe: string; }

// Start of the fiscal month containing `date`. A month of -1 rolls back a year
// on its own.
function fiscalMonthStartDate(date: Date, fiscalMonthStart: number): Date {
    return new Date(
        date.getFullYear(),
        date.getDate() >= fiscalMonthStart ?
            date.getMonth() : date.getMonth() - 1,
        fiscalMonthStart
    );
}

export default function Query({ categories, tags, fiscalMonthStart, sundayWeekStart }: { categories: string[]; tags: string[]; fiscalMonthStart: number; sundayWeekStart: boolean }) {

    const initialState: QueryFormState = {
        timeframe: 'fiscalMonth',
        from: format(fiscalMonthStartDate(new Date(), fiscalMonthStart), 'yyyy-MM-dd'),
        to: format(new Date(), 'yyyy-MM-dd'),
        tags: []
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
                    fromDate.setDate(date.getDate() - (date.getDay() + (sundayWeekStart ? 0 : 6)) % 7);
                    break;
                case "weekToDate":
                    fromDate.setDate(date.getDate() - 6);
                    break;
                case "fiscalMonth":
                    fromDate.setTime(fiscalMonthStartDate(date, fiscalMonthStart).getTime());
                    break;
                case "month":
                    fromDate.setDate(1);
                    break;
                case "monthToDate":
                    fromDate.setMonth(date.getMonth() - 1);
                    break;
                case "allTime":
                    fromDate.setFullYear(2000,0,1)
            }

            from = format(fromDate, 'yyyy-MM-dd');
            to = format(date, 'yyyy-MM-dd');
        } else {
            from = formData.from;
            to = formData.to;
        }

        changeFormData({
            from,
            to,
            timeframe,
            tags: formData.tags,
        });
    };

    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [activeCategories, setActiveCategories] = useState<string[]>(categories);

    function queryReceipts({ from, to, tags }: QueryParams): Promise<Receipt[]> {
        return request('query/', {
            method: 'POST',
            body: JSON.stringify({ from, to, tags: normalizeTags(tags) }),
        });
    }

    useEffect(() => {
        let ignore = false;
        const from = format(fiscalMonthStartDate(new Date(), fiscalMonthStart), 'yyyy-MM-dd');
        const to = format(new Date(), 'yyyy-MM-dd');
        queryReceipts({ from, to, tags: [] }).then(r => { if (!ignore) setReceipts(r); });
        return () => { ignore = true; };
    }, [fiscalMonthStart]);

    const rerunQuery = async () => {
        setReceipts(await queryReceipts({ from: formData.from, to: formData.to, tags: formData.tags }));
    };

    const handleQuery = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        await rerunQuery();
    };

    const filteredReceipts = useMemo(() =>
        receipts.filter((receipt) => activeCategories.includes(receipt.category)),
        [receipts, activeCategories]);

    const timeframeOptions = [
        { name: "Tento týden", value: "week" },
        { name: "Posledních 7 dní", value: "weekToDate" },
        { name: "Tento měsíc", value: "month" },
        { name: "Fiskální měsíc", value: "fiscalMonth" },
        { name: "Poslední měsíc", value: "monthToDate" },
        { name: "Od počátku věků", value: "allTime" },
        { name: "Vlastní", value: "custom" },
    ];

    return (
        <>
            <div className="md:mt-4">
                <form className="form" onSubmit={handleQuery}>
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
                                <TagInput handler={stateHandler} tags={tags} />
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
            <p className="mt-4 text-lg text-center">Celková útrata: {filteredReceipts.reduce((a, c) => a + (c.filtered_amount ?? c.amount), 0)} Kč</p>
            {filteredReceipts.length > 0 ?
                <div>
                    <div className="w-full max-w-2xl mx-auto px-4 sm:px-0 py-2">
                        <ReceiptRenderer receipts={filteredReceipts} categories={categories} tags={tags} onChanged={rerunQuery} />
                    </div>
                </div> :
                <div>
                    <p className="py-5 text-center">Žádné výsledky.</p>
                </div>
            }
        </>
    )
}
