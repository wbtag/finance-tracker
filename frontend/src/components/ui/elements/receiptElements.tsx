import { Input, Select, Label } from "./formElements";
import Tagify from "@yaireo/tagify";
import { useRef, useEffect } from "react";
import type { StateHandler } from "../../lib/useStateHandler";

interface ReceiptParamsProps {
    handler: StateHandler<any>;
    categories: string[];
    tags: string[];
    type?: string;
}

export function ReceiptParams({ handler, categories, tags, type }: ReceiptParamsProps) {

    const { formData } = handler;

    return (
        <>
            <Input label="Datum" type="date" name="date" value={formData.date} handler={handler} />
            {type != "mandatory" ?
                <div>
                    <Select label="Kategorie" name="category" blankOption={true} options={categories} value={formData.category} handler={handler} />
                </div> :
                <div />
            }
            <Input label="Popis" name="description" value={formData.description} handler={handler} />
            <Input label="Částka" name="amount" value={formData.amount} handler={handler} />
            <TagInput handler={handler} tags={tags} />
        </>
    )
}

interface ReceiptItemsProps {
    handler: StateHandler<any>;
    tags: string[];
}

export function ReceiptItems({ handler, tags }: ReceiptItemsProps) {

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

    return (
        <>
            <div className="flex flex-col">
                <Label label="Značky" />
                <input
                    ref={inputRef}
                    className="input px-[10px] py-[11px] border-1 rounded-[5px] md:w-[210px] w-[180px] focus:outline-none placeholder:text-black/25"
                    name={inputName}
                    value={idx ? formData.items[idx].tags : formData[inputName]}
                    onChange={idx ? (e) => changeArrayItem(e, index!) : handleInput}>
                </input>
            </div>
        </>
    )
}
