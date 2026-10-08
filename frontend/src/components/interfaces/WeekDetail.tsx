'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReceiptRenderer from "../ui/ReceiptRenderer";
import CategoryPicker from "../ui/CategoryPicker";
import { Receipt } from "@/app/types/receipt";

export default function WeekDetail(
    { receipts, categories, tags, week, year }:
    { receipts: Receipt[]; categories: string[]; tags: string[]; week: number | string; year: number | string; }
) {
    const [activeCategories, setActiveCategories] = useState<string[]>(categories);
    const router = useRouter();

    const visibleReceipts = receipts.filter(r => activeCategories.includes(r.category));
    const total = visibleReceipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    return (
        <>
            <div>
                <div className="w-full max-w-2xl mx-auto px-4 sm:px-0 py-2">
                    <h1 className="text-2xl pt-4 pb-2">{week}. týden roku {year}</h1>
                    <CategoryPicker
                        categories={categories}
                        activeCategories={activeCategories}
                        setActiveCategories={setActiveCategories}
                    />
                </div>
                {visibleReceipts.length === 0 ? (
                    <p className="text-white/40 text-sm sm:text-base italic text-center py-6">Žádné účtenky.</p>
                ) : (
                    <div className="w-full max-w-xl mx-auto px-4 sm:px-0 py-2">
                        <ReceiptRenderer receipts={visibleReceipts} categories={categories} tags={tags} onChanged={() => router.refresh()} />

                            <div className="flex justify-between border-t border-white/40 py-4">
                                <p className="text-md sm:text-md">Celkem</p>
                                <span className="text-white/80 text-sm sm:text-base tabular-nums pr-6 sm:pr-7">
                                    {total.toLocaleString("cs-CZ")} Kč
                                </span>
                            </div>
                    </div>
                )}
            </div>
        </>
    );
}
