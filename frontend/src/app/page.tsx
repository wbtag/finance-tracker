import Spend from "@/components/interfaces/Spend";
import { getConfig } from "@/components/lib/config";
import { serverRequest } from "@/components/lib/serverRequest";
import { SpendDTO } from "@/app/types/spend";

export default async function Page() {
    const spendData: SpendDTO = await serverRequest('overview/');
    return (
        <>
            <div>
                <Spend sundayWeekStart={getConfig().sundayWeekStart} spendData={spendData} />
            </div>
        </>
    );
}
