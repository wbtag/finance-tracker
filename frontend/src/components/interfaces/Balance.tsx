'use client'
import { useEffect, useState, type MouseEvent } from "react";
import useAnimatedValue from "../ui/useAnimatedValue";
import { Input, FieldError } from "../ui/elements/formElements";
import { useStateHandler } from "../lib/useStateHandler";
import { useValidation, isBlank, isInteger, isPositiveInteger } from "../lib/useValidation";
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

    const lastBalance = useAnimatedValue(balanceData.lastBalance);
    const estimatedBalance = useAnimatedValue(balanceData.estimatedBalance);
    const spendSinceLastBalance = useAnimatedValue(balanceData.spendSinceLastBalance);
    const incomeSinceLastBalance = useAnimatedValue(balanceData.incomeSinceLastBalance ?? 0);

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

    const balanceValidation = useValidation({
        balance: ({ balance }: typeof balanceInitialState) => !isInteger(balance),
    });

    const incomeValidation = useValidation({
        amount: ({ amount }: typeof incomeInitialState) => !isPositiveInteger(amount),
        description: ({ description }: typeof incomeInitialState) => isBlank(description),
    });

    const submitForm = async (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        const formId = (e.target as HTMLButtonElement).form?.id;

        if (formId === 'balance' && !balanceValidation.validate(balanceStateHandler.formData)) return;
        if (formId === 'income' && !incomeValidation.validate(incomeStateHandler.formData)) return;

        setSaving(true);

        try {
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
                await request('balance/', {
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
            }
        } catch (e: unknown) {
            if (e instanceof Error) {
                window.alert('Chyba: ' + e.message)
            }
        } finally {
            setSaving(false);
        }
    };

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
                        <FieldError show={incomeValidation.errors.description}>Popis chybí</FieldError>
                        <Input label="Částka" name="amount" type="number" handler={incomeStateHandler} />
                        <FieldError show={incomeValidation.errors.amount}>Neplatná částka</FieldError>
                        <button
                            className="button button--active mt-3"
                            onClick={submitForm}
                            disabled={saving}
                        >{saving ? 'Ukládá se...' : 'Uložit'}</button>
                    </form>
                    <form className="my-3 w-80" id="balance">
                        <p className="text-xl">Aktualizace zůstatku</p>
                        <Input label="Nový zůstatek" type="number" name="balance" handler={balanceStateHandler} />
                        <FieldError show={balanceValidation.errors.balance}>Neplatný zůstatek</FieldError>
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
