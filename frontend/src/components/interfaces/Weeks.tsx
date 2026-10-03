'use client'

import { useEffect, useState } from "react";
import Link from "next/link";
import { Select } from "../ui/elements/formElements";
import {request} from "../lib/request";

export interface WeekSpend {
    number: number;
    amount: number;
}

export default function Weeks() {
    const [weeks, setWeeks] = useState<WeekSpend[]>([]);
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [years, setYears] = useState<number[]>([]);

    const fetchData = async (year: number) => {
        const data = await request(`weekly-summary/?year=${year}`);
        setYears(data.years);
        setWeeks(data.weeks)
    }

    useEffect(() => {
        fetchData(year)
    }, [year]);

    return (
        <div className="pad pad-vertical max-w-150">
            <h1 className="text-2xl">Týdenní přehled {year}</h1>
            <Select
                value={year}
                changeHandler={(e) => setYear(parseInt(e.target.value))}
                name="year"
                label="Rok"
                options={years}
            />
            <div className="pt-4">
                {weeks.map(week => (
                    <div
                        key={week.number}
                        className="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-4 py-3 sm:py-3.5 border-b border-white/10"
                    >
                        <p className="text-white/50 text-xs sm:text-sm tabular-nums whitespace-nowrap tracking-wide">
                            {week.number.toString().padStart(2, '0')}. týden
                        </p>
                        <span className="text-white/90 text-sm sm:text-base tabular-nums whitespace-nowrap">
                            {week.amount.toLocaleString("cs-CZ")} Kč
                        </span>
                        <Link
                            href={`/weekly-summary/${year}/${week.number}`}
                            className="text-white/40 hover:text-white/75 text-xs sm:text-sm tracking-wide transition-colors"
                        >
                            Detail →
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
