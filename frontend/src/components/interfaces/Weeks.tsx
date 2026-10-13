"use client";

import Link from "next/link";
import { Select } from "../ui/elements/formElements";
import { WeekSpendDTO } from "@/app/types/spend";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function Weeks({
	year,
	weeks,
	years,
}: {
	year: string;
	weeks: WeekSpendDTO[];
	years: number[];
}) {
	const [, startTransition] = useTransition();
	const router = useRouter();

	return (
		<div className="pad pad-vertical max-w-150">
			<h1 className="text-2xl">Týdenní přehled {year}</h1>
			<Select
				value={year}
				changeHandler={(e) =>
					startTransition(() => {
						router.push(`/weekly-summary/?year=${e.target.value}`);
					})
				}
				name="year"
				label="Rok"
				options={years}
			/>
			<div className="pt-4">
				{weeks.map((week) => (
					<div
						key={week.number}
						className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-white/10 py-3 sm:gap-4 sm:py-3.5"
					>
						<p className="text-xs tracking-wide whitespace-nowrap text-white/50 tabular-nums sm:text-sm">
							{week.number.toString().padStart(2, "0")}. týden
						</p>
						<span className="text-sm whitespace-nowrap text-white/90 tabular-nums sm:text-base">
							{week.amount.toLocaleString("cs-CZ")} Kč
						</span>
						<Link
							href={`/weekly-summary/${year}/${week.number}`}
							className="text-xs tracking-wide text-white/40 transition-colors hover:text-white/75 sm:text-sm"
						>
							Detail →
						</Link>
					</div>
				))}
			</div>
		</div>
	);
}
