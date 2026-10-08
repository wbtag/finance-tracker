'use client'

import { useState, type MouseEvent } from "react";
import { addDays, getISOWeek, getISOWeekYear } from "date-fns";
import useAnimatedValue from "../ui/useAnimatedValue";
import SpendTable from "../ui/SpendTable";
import Switcher from "../ui/Switcher";
import { SpendDTO } from "@/app/types/spend";
import Link from "next/link";

export default function Spend({ sundayWeekStart, spendData }: { sundayWeekStart: boolean; spendData: SpendDTO }) {

    const weekDate = addDays(new Date(), sundayWeekStart ? 1 : 0);

    const animatedBalance = useAnimatedValue(spendData.balance);
    const animatedWeeklySpend = useAnimatedValue(spendData.weekly_spend);
    const animatedMonthlySpend = useAnimatedValue(spendData.monthly_spend);

    const [spendPeriod, setSpendPeriod] = useState('week');


    const handleSpendPeriodChange = (e: MouseEvent<HTMLButtonElement>) => { setSpendPeriod((e.target as HTMLButtonElement).name) }

    return (
        <>
            <div>
                <div className="flex flex-wrap md:my-4 justify-center">
                    <div className="my-2 w-80 text-center">
                        <Link href={
                            `/weekly-summary/${getISOWeekYear(weekDate)}/${getISOWeek(weekDate)}`
                        }>
                            <p className="text-3xl">{animatedWeeklySpend.toFixed()} Kč</p>
                            <p>Útrata tento týden</p>
                        </Link>
                    </div>
                    <div className="my-2 w-80 text-center">
                        <Link href="/query">
                            <p className="text-3xl">{animatedMonthlySpend.toFixed()} Kč</p>
                            <p>Útrata tento měsíc</p>
                        </Link>
                    </div>
                    <div className="my-2 w-80 text-center">
                        <Link href="/balance">
                            <p className="text-3xl">{animatedBalance.toFixed()} Kč</p>
                            <p className="">Aktuální odhadovaný zůstatek</p>
                        </Link>
                    </div>
                </div>
                <div className="grid justify-center">
                    <div className='inline-flex py-5 gap-x-1 w-80 justify-center'>
                        <Switcher name='week' text='Týden' stateTracker={spendPeriod} changeHandler={handleSpendPeriodChange} />
                        <Switcher name='month' text='Měsíc' stateTracker={spendPeriod} changeHandler={handleSpendPeriodChange} />
                    </div>
                    <div className="pb-4">
                        {spendPeriod === 'week' ?
                            <div>
                                <SpendTable source={spendData.weekly_spend_categories} other={spendData.other.week} />
                            </div> :
                            <div>
                                <SpendTable source={spendData.monthly_spend_categories} other={spendData.other.month} />
                            </div>
                        }
                    </div>
                </div>
            </div>
        </>
    )
}
