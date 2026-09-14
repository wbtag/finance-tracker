'use client'
import { useEffect, useState, type MouseEvent } from "react";
import AnimateValue from "../ui/AnimateValue";
import { Input } from "../ui/elements/formElements";
import { useStateHandler } from "../lib/useStateHandler";
import {request} from "@/components/lib/request";

interface BalanceDTO {
    estimated_balance: number;
    income_since: number;
    spend_since: number;
    balance: number;
    balance_date: string;
}

export interface BalanceData {
    lastBalance: number;
    lastBalanceDate: number | Date;
    estimatedBalance: number;
    spendSinceLastBalance: number;
    incomeSinceLastBalance?: number;
}

export default function Balance() {

    const [balanceData, setBalanceData] = useState<BalanceData>({
        lastBalance: 0,
        lastBalanceDate: 0,
        estimatedBalance: 0,
        spendSinceLastBalance: 0,
        incomeSinceLastBalance: 0
    });

    const [saving, setSaving] = useState(false);

    const lastBalance = AnimateValue(balanceData.lastBalance);
    const estimatedBalance = AnimateValue(balanceData.estimatedBalance);
    const spendSinceLastBalance = AnimateValue(balanceData.spendSinceLastBalance);
    const incomeSinceLastBalance = AnimateValue(balanceData.incomeSinceLastBalance ?? 0);

    const formattedBalanceDate = () => {
        const lastBalanceDate = balanceData.lastBalanceDate === 0 ? Date.now() : balanceData.lastBalanceDate;
        const date = new Date(lastBalanceDate).toLocaleString('cs-CZ');
        return date.substring(0, date.length - 3);
    };

    const fetchBalance = async () => {
        const balanceData: BalanceDTO = await request('balance/');
        setBalanceData({
            lastBalance: balanceData.balance,
            lastBalanceDate: new Date(balanceData.balance_date),
            estimatedBalance: balanceData.estimated_balance,
            spendSinceLastBalance: balanceData.spend_since,
            incomeSinceLastBalance: balanceData.income_since,
        });
    };

    useEffect(() => {
        fetchBalance();
    }, []);

    const balanceInitialState = {
        balance: 0
    };

    const balanceStateHandler = useStateHandler(balanceInitialState);

    const incomeInitialState = {
        amount: 0,
        description: '',
    };

    const incomeStateHandler = useStateHandler(incomeInitialState);

    const submitForm = async (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        setSaving(true);

        const formId = (e.target as HTMLButtonElement).form?.id;

        if (formId === 'balance') {
            const newBalanceData = await request('balance/', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'balance',
                    balance: balanceStateHandler.formData.balance,
                })
            })
            setBalanceData({
                lastBalance: newBalanceData.balance,
                lastBalanceDate: new Date(),
                spendSinceLastBalance: 0,
                estimatedBalance: newBalanceData.balance,
                incomeSinceLastBalance: 0
            });
            balanceStateHandler.clearForm();
        } else if (formId === 'income') {
            const formData = incomeStateHandler.formData;
            const response = await request('balance/', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'income',
                    ...formData
                }),
            })
            setBalanceData((prevState) => ({
                ...prevState,
                incomeSinceLastBalance: Number(balanceData.incomeSinceLastBalance) + Number(formData.amount),
                estimatedBalance: Number(balanceData.estimatedBalance) + Number(formData.amount)
            }));
            incomeStateHandler.clearForm();
        };

        setSaving(false);
    };

    const incomeTypes = ["Výplata", "Dar", "Přeplatek", "Úroky", "Jiné"];

    return (
        <>
            <div className="mt-4">
                <div className="flex flex-wrap gap-2 w-full justify-center">
                    <div className="w-80 text-center">
                        <p className="text-3xl">{estimatedBalance.toFixed()} Kč</p>
                        <p className="">Aktuální odhadovaný zůstatek</p>
                    </div>
                    <div className="w-80 text-center">
                        <p className="text-3xl">{incomeSinceLastBalance.toFixed()} Kč</p>
                        <p className="">Příjmy od poslední aktualizace</p>
                    </div>
                    <div className="w-80 text-center">
                        <p className="text-3xl">{spendSinceLastBalance.toFixed()} Kč</p>
                        <p className="">Útrata od poslední aktualizace</p>
                    </div>
                    <div className="w-80 text-center">
                        <p className="text-3xl">{lastBalance.toFixed()} Kč</p>
                        <p className="">Zůstatek k {formattedBalanceDate()}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4 ml-12 w-full md:justify-center">
                    <form className="my-3 w-100" id="income">
                        <p className="text-xl">Nový příjem</p>
                        <Input label="Popis" name="description" handler={incomeStateHandler} />
                        <Input label="Částka" name="amount" type="number" handler={incomeStateHandler} />
                        <button
                            className="button button--active mt-3"
                            onClick={submitForm}
                            disabled={saving}
                        >{saving ? 'Ukládá se...' : 'Uložit'}</button>
                    </form>
                    <form className="my-3 w-80" id="balance">
                        <p className="text-xl">Aktualizace zůstatku</p>
                        <Input label="Nový zůstatek" type="number" name="balance" handler={balanceStateHandler} />
                        <button
                            className="button button--active mt-3"
                            onClick={submitForm}
                            disabled={saving}
                        >{saving ? 'Ukládá se...' : 'Uložit'}</button>
                    </form>
                </div>
            </div>
        </>
    )
}
