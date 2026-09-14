import { useState, type ChangeEvent, type Dispatch, type MouseEvent, type SetStateAction } from "react";

export type FormControlElement = HTMLInputElement | HTMLSelectElement;

export interface StateHandler<T> {
    clearForm: () => void;
    formData: T;
    handleInput: (e: ChangeEvent<FormControlElement>) => void;
    changeFormData: Dispatch<SetStateAction<T>>;
    addArrayItem: (e: MouseEvent<HTMLButtonElement>) => void;
    removeArrayItem: (e: MouseEvent<HTMLButtonElement>, index: number) => void;
    changeArrayItem: (e: ChangeEvent<FormControlElement>, index: number) => void;
}

export const useStateHandler = <T extends Record<string, any>>(initialState: T): StateHandler<T> => {

    const [formData, setFormData] = useState<T>(initialState);

    // Absolutely generic methods

    const handleInput = (e: ChangeEvent<FormControlElement>) => {
        const { name, value } = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [name]: value
        }));
    };

    const clearForm = () => {
        setFormData(initialState);
    };

    const changeFormData: Dispatch<SetStateAction<T>> = (formData) => {
        setFormData(formData);
    };

    const addArrayItem = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const { name } = e.currentTarget;
        setFormData((prevState) => ({
            ...prevState,
            [name]: [...prevState[name], { amount: 0, tags: [''] }],
        }));
    };

    const removeArrayItem = (e: MouseEvent<HTMLButtonElement>, index: number) => {
        e.preventDefault();
        const { name } = e.currentTarget;
        setFormData((prev) => ({
            ...prev,
            [name]: prev[name].filter((_: unknown, i: number) => i !== index),
        }));
    };

    const changeArrayItem = (e: ChangeEvent<FormControlElement>, index: number) => {
        e.preventDefault();
        const { name, value } = e.target;
        const itemName = name.split('-')[0];
        const items = formData.items;
        items[index][itemName] = value;
        setFormData((prev) => ({
            ...prev,
            items,
        }));
    };

    return {
        clearForm,
        formData,
        handleInput,
        changeFormData,
        addArrayItem,
        removeArrayItem,
        changeArrayItem,
        // handleCheckboxChange,
        // handleSelectChange,
    }
}
