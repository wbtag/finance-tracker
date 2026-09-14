'use client'

import { useEffect, useState } from "react";
import ReceiptRenderer from "../ui/ReceiptRenderer";
import CategoryPicker from "../ui/CategoryPicker";
import { request } from "@/components/lib/request";
import { Receipt } from "@/app/types/receipt";

interface WeekDetailProps {
    week: number | string;
    year: number | string;
}

export default function WeekDetail({ week, year }: WeekDetailProps) {
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [visibleReceipts, setVisibleReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);

    const [categories, setCategories] = useState<string[]>([]);
    const [activeCategories, setActiveCategories] = useState<string[]>(categories);

    const filterVisibleReceipts = (categories: string[]) => {
        const filteredReceipts = receipts.filter((receipt) => categories.includes(receipt.category));
        setVisibleReceipts(filteredReceipts);
    };

    const fetchCategories = async () => {
        const categories = await request('categories/');
        // categories.push('Mandatorní');
        setCategories(categories);
        setActiveCategories(categories);
    };

    useEffect(() => {
        filterVisibleReceipts(activeCategories);
    }, [activeCategories]);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await request(`weekly-summary/${year}/${week}/`);
                setReceipts(data);
                setVisibleReceipts(data);
                fetchCategories();
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [week, year]);

    const total = visibleReceipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    return (
        <>
            <div>
                {!loading ? (
                    <div className="w-full max-w-2xl mx-auto px-4 sm:px-0 py-2">
                        <h1 className="text-2xl pt-4 pb-2">{week}. týden roku {year}</h1>
                        <CategoryPicker
                            categories={categories}
                            activeCategories={activeCategories}
                            setActiveCategories={setActiveCategories}
                        />
                    </div>
                ) : null}
                {loading ? (
                    <p className="text-white/40 text-sm sm:text-base italic text-center py-6">Načítá se...</p>
                ) : receipts.length === 0 ? (
                    <p className="text-white/40 text-sm sm:text-base italic text-center py-6">Žádné účtenky.</p>
                ) : (
                    <div className="w-full max-w-xl mx-auto px-4 sm:px-0 py-2">
                        <ReceiptRenderer receipts={visibleReceipts} categories={categories} />
                        {!loading && visibleReceipts.length > 0 && (
                            <div className="flex justify-between border-t border-white/40 py-4">
                                <p className="text-md sm:text-md">Celkem</p>
                                <span className="text-white/80 text-sm sm:text-base tabular-nums pr-6 sm:pr-7">
                                    {total.toLocaleString("cs-CZ")} Kč
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
