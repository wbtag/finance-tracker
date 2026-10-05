import Weeks from "@/components/interfaces/Weeks";
import { serverRequest } from "@/components/lib/serverRequest";
import { WeekSpendDTO } from "@/app/types/spend";

export default async function WeeklySummaryPage({ searchParams }: { searchParams: Promise<{ year?: string }>}) {

    let { year } = await searchParams;
    year = year || String(new Date().getFullYear());
    const { years, weeks }: { years: number[]; weeks: WeekSpendDTO[] } = await serverRequest(`weekly-summary/?year=${year}`);

    return (
        <div>
            <Weeks year={year} years={years} weeks={weeks} />
        </div>
    )
}
