import Query from "@/components/interfaces/Query";
import { getConfig } from "@/components/lib/config";

export default function ReceiptPage() {
    return (
        <>
            <div>
                <Query fiscalMonthStart={getConfig().fiscalMonthStart} sundayWeekStart={getConfig().sundayWeekStart} />
            </div>
        </>
    )
}
