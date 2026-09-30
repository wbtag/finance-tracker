import Query from "@/components/interfaces/Query";
import { getConfig } from "@/components/lib/config";

export default async function ReceiptPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {

    const params = await searchParams;

    return (
        <>
            <div>
                <Query period={params.period} fiscalMonthStart={getConfig().fiscalMonthStart} sundayWeekStart={getConfig().sundayWeekStart} />
            </div>
        </>
    )
}
