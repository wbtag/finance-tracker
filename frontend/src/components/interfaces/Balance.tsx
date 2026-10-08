'use client'
import { type MouseEvent, useState } from "react";
import useAnimatedValue from "../ui/useAnimatedValue";
import { FieldError, Input } from "../ui/elements/formElements";
import { useStateHandler } from "../lib/useStateHandler";
import { isBlank, isInteger, isPositiveInteger, useValidation } from "../lib/useValidation";
import { request } from "@/components/lib/request";
import { BalanceDTO } from "@/app/types/balance";
import { useRouter } from "next/navigation";

interface BalanceFormData {
    lastBalance: number;
    lastBalanceDate: string | Date;
    estimatedBalance: number;
    spendSinceLastBalance: number;
    incomeSinceLastBalance?: number;
}

export default function Balance({ balanceData }: { balanceData: BalanceDTO }) {

    const [balanceFormData, setBalanceFormData] = useState<BalanceFormData>({
        lastBalance: 0,
        lastBalanceDate: new Date(),
        estimatedBalance: 0,
        spendSinceLastBalance: 0,
        incomeSinceLastBalance: 0
    });

    const router = useRouter();

    const [saving, setSaving] = useState(false);

    const lastBalance = useAnimatedValue(balanceData.balance);
    const estimatedBalance = useAnimatedValue(balanceData.estimated_balance);
    const spendSinceLastBalance = useAnimatedValue(balanceData.spend_since);
    const incomeSinceLastBalance = useAnimatedValue(balanceData.income_since ?? 0);

    const formattedBalanceDate = () => {
        const date = new Date(balanceData.balance_date).toLocaleString('cs-CZ');
        return date.substring(0, date.length - 3);
    };

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
                const newBalanceData: { balance: number } = await request('balance/', {
                    method: 'POST',
                    body: JSON.stringify({
                        type: 'balance',
                        balance: balanceStateHandler.formData.balance,
                    })
                })
                setBalanceFormData({
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
                setBalanceFormData((prevState) => ({
                    ...prevState,
                    incomeSinceLastBalance: Number(balanceFormData.incomeSinceLastBalance) + Number(formData.amount),
                    estimatedBalance: Number(balanceFormData.estimatedBalance) + Number(formData.amount)
                }));
                incomeStateHandler.clearForm();
            }
        } catch (e: unknown) {
            if (e instanceof Error) {
                window.alert('Chyba: ' + e.message)
            }
        } finally {
            setSaving(false);
            router.refresh();
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
