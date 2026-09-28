import { Input, Select, Label, FieldError } from "./formElements";
import Tagify from "@yaireo/tagify";
import { useRef, useEffect } from "react";
import type { StateHandler } from "../../lib/useStateHandler";
import type { ReceiptErrors } from "../../lib/receiptValidation";

interface ReceiptParamsProps {
    handler: StateHandler<any>;
    categories: string[];
    tags: string[];
    type?: string;
    validationErrors?: ReceiptErrors
}

export function ReceiptParams({ handler, categories, tags, validationErrors }: ReceiptParamsProps) {

    const { formData } = handler;

    return (
        <>
            <div>
                <Input label="Datum" type="date" name="date" value={formData.date} handler={handler} />
                <FieldError show={validationErrors?.date}>Datum není v platném formátu</FieldError>
            </div>
            <Select label="Kategorie" name="category" options={categories} value={formData.category} handler={handler} />
            <div>
                <Input label="Popis" name="description" value={formData.description} handler={handler} />
                <FieldError show={validationErrors?.description}>Popis chybí</FieldError>
            </div>
            <div>
                <Input label="Částka" name="amount" value={formData.amount} handler={handler} />
                <FieldError show={validationErrors?.amount}>Neplatná částka</FieldError>
            </div>
            <div>
                <TagInput handler={handler} tags={tags} />
            </div>
        </>
    )
}

interface ReceiptItemsProps {
    handler: StateHandler<any>;
    tags: string[];
    validationErrors?: ReceiptErrors;
}

export function ReceiptItems({ handler, tags, validationErrors }: ReceiptItemsProps) {

    const { formData, changeArrayItem, addArrayItem, removeArrayItem } = handler;

    return (
        <>
            <div>
                <h2 className="mt-3 text-xl">Položky</h2>
                <div>
                    {formData.items.length <= 10 ?
                        <div>
                            <button className="button button--active mt-2" name="items" onClick={(e) => addArrayItem(e)}>Přidat další položku</button>
                        </div> :
                        <div />
                    }
                </div>
                {formData?.items.map((i: unknown, index: number) => (
                    <div key={index} className="flex flex-row">
                        <div className="flex flex-wrap f gap-2">
                            <div className="input flex flex-col w-fit static">
                                <Label label="Částka" />
                                <input
                                    type="number"
                                    name={`amount-${index}`}
                                    value={formData.items[index].amount}
                                    onChange={(e) => changeArrayItem(e, index)}
                                    className="input px-[10px] py-[11px] border-1 border-white/50 rounded-[5px] w-[65px] md:w-[180px] focus:outline-none placeholder:text-black/25"
                                />
                            </div>
                            <div>
                                <TagInput handler={handler} tags={tags} index={index} />
                            </div>
                        </div>
                        {
                            index != 0 ?
                                <div className="py-[25px] px-2">
                                    <button type="button" name="items" className="h-8 pl-2 button" onClick={(e) => removeArrayItem(e, index)}>-</button>
                                </div> :
                                <div />
                        }
                    </div>
                ))}
                <div className="py-2">
                    <FieldError show={validationErrors?.itemsAmount}>Hodnota každé položky musí být kladné číslo a součet hodnot položek musí být roven celkové hodnotě účtenky.</FieldError>
                    <FieldError show={validationErrors?.itemsTags}>Každá položka musí mít alespoň jednu značku.</FieldError>
                </div>
                <p>Zbývá do celkové částky: {formData.amount - formData.items.reduce((acc: number, curr: { amount: number | string }) => acc + Number(curr.amount), 0)}</p>
            </div>
        </>
    )
}

interface TagInputProps {
    handler: StateHandler<any>;
    tags: string[];
    index?: number;
    name?: string;
}

export function TagInput({ handler, tags, index, name }: TagInputProps) {

    const {
        handleInput,
        formData,
        changeArrayItem
    } = handler;

    const inputRef = useRef<HTMLInputElement>(null);
    const tagify = useRef<Tagify | null>(null);

    const idx = index || index === 0 ? index.toString() : null;

    const inputName = name || (idx ? `tags-${idx}` : "tags");

    const value = idx ? formData.items[idx].tags : formData[inputName];

    useEffect(() => {
        tagify.current = new Tagify(inputRef.current!, {
            whitelist: tags,
            dropdown: {
                enabled: 0,
                maxItems: 5,
                position: "text",
                closeOnSelect: false,
                highlightFirst: true
            }
        }
        );
        return () => {
            tagify.current?.destroy();
            tagify.current = null;
        };
    }, []);

    useEffect(() => {
        if (tagify.current) {
            tagify.current.whitelist = tags;
        }
    }, [tags]);

    useEffect(() => {
        const isEmpty = !value || (Array.isArray(value) && value.every(tag => !tag));
        if (tagify.current && isEmpty) {
            tagify.current.removeAllTags({ withoutChangeEvent: true });
        }
    }, [value]);

    return (
        <>
            <div className="flex flex-col">
                <Label label="Značky" />
                <input
                    ref={inputRef}
                    className="input px-[10px] py-[11px] border-1 rounded-[5px] md:w-[210px] w-[180px] focus:outline-none placeholder:text-black/25"
                    name={inputName}
                    value={value}
                    onChange={idx ? (e) => changeArrayItem(e, index!) : handleInput}>
                </input>
            </div>
        </>
    )
}
