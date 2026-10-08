import Balance from "@/components/interfaces/Balance"
import { BalanceDTO } from "@/app/types/balance";
import { serverRequest } from "@/components/lib/serverRequest";

export default async function BalancePage() {

    const balanceData: BalanceDTO = await serverRequest('balance/');

    return (
        <>
            <div>
                <Balance balanceData={balanceData} />
            </div>
        </>
    )
}
