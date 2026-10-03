'use client'

import { useEffect, useState, type MouseEvent } from "react";
import { addDays, getISOWeek, getISOWeekYear } from "date-fns";
import useAnimatedValue from "../ui/useAnimatedValue";
import SpendTable from "../ui/SpendTable";
import Switcher from "../ui/Switcher";
import {request} from "../lib/request";
import Link from "next/link";

export interface CategorySpend {
    spend: number;
    limit: number;
}

export default function Spend({ sundayWeekStart }: { sundayWeekStart: boolean }) {

    const weekDate = addDays(new Date(), sundayWeekStart ? 1 : 0);

    const [weeklySpend, setWeeklySpend] = useState(0);
    const [weeklyOtherSpend, setWeeklyOtherSpend] = useState(0);
    const [weeklySpendByCategory, setWeeklySpendByCategory] = useState<Record<string, CategorySpend>>({});

    const [monthlySpend, setMonthlySpend] = useState(0);
    const [monthlyOtherSpend, setMonthlyOtherSpend] = useState(0);
    const [monthlySpendByCategory, setMonthlySpendByCategory] = useState<Record<string, CategorySpend>>({});

    const [balance, setBalance] = useState(0);

    const animatedBalance = useAnimatedValue(balance);
    const animatedWeeklySpend = useAnimatedValue(weeklySpend);
    const animatedMonthlySpend = useAnimatedValue(monthlySpend);

    const [spendPeriod, setSpendPeriod] = useState('week');

    const fetchData = async () => {
        const data = await request('overview/');
        setBalance(data.balance)
        setWeeklySpend(data.weekly_spend)
        setWeeklySpendByCategory(data.weekly_spend_categories)
        setMonthlySpend(data.monthly_spend)
        setMonthlySpendByCategory(data.monthly_spend_categories)
        setWeeklyOtherSpend(data.other.week)
        setMonthlyOtherSpend(data.other.month)
    }

    useEffect(() => {
        fetchData()
    }, []);

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
                                <SpendTable source={weeklySpendByCategory} other={weeklyOtherSpend} />
                            </div> :
                            <div>
                                <SpendTable source={monthlySpendByCategory} other={monthlyOtherSpend} />
                            </div>
                        }
                    </div>
                </div>
            </div>
        </>
    )
}
