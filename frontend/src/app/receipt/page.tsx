'use client';
import { useEffect, useState } from "react";
import NewReceipt from "@/components/interfaces/NewReceipt";
import { request } from "@/components/lib/request";

export default function ReceiptPage() {

    const [categories, setCategories] = useState<string[] | null>(null);

    useEffect(() => {
        request('categories/').then(setCategories);
    }, []);

    if (!categories) return null;

    return (
        <>
            <div>
                <NewReceipt categories={categories} />
            </div>
        </>
    )
}
