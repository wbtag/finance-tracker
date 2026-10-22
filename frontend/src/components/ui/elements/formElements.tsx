import { useId, type ChangeEventHandler, type ReactNode } from "react";
import type { StateHandler } from "../../lib/useStateHandler";

type FieldValue = string | number | undefined;

interface InputProps<T> {
	label: string;
	handler: StateHandler<T>;
	type?: string;
	name: keyof T & string;
	value?: string | number;
	options?: {
		inputMode?: "search" | "text" | "email" | "tel" | "url" | "none" | "numeric" | "decimal";
		autoComplete?: "on" | "off";
	}
}

export function Input<T extends object>({ label, handler, type, name, value, options }: InputProps<T>) {

	const {
		handleInput,
		formData
	} = handler;

	const id = useId();

	return (
		<>
			<div className="input flex flex-col w-fit static">
				<Label label={label} htmlFor={id}/>
				<input
					id={id}
					type={type ? type : "text"}
					name={name}
					value={value ?? formData[name] as FieldValue}
					onChange={handleInput}
					className="input px-[10px] py-[11px] border-1 border-white/50 rounded-[5px] w-[210px] focus:outline-none placeholder:text-black/25"
					inputMode={options?.inputMode ?? 'text'}
					autoComplete={options?.autoComplete ?? "on"}
				/>
			</div>
		</>
	)
}

type SelectOption = string | number | { name: string; value: string };

interface SelectProps<T> {
	label: string;
	handler?: StateHandler<T>;
	name: keyof T & string;
	options: SelectOption[];
	blankOption?: boolean;
	changeHandler?: ChangeEventHandler<HTMLSelectElement>;
	value?: string | number;
}

export function Select<T extends object = Record<string, unknown>>({
	label,
	handler,
	name,
	options,
	blankOption,
	changeHandler,
	value
}: SelectProps<T>) {

	const {
		handleInput,
		formData
	} = handler ?? {};

	const id = useId();

	return (
		<>
			<div className="input flex flex-col w-fit static">
				<Label label={label} htmlFor={id}/>
				<select
					id={id}
					name={name}
					value={value ?? formData?.[name] as FieldValue}
					onChange={changeHandler ?? handleInput}
					className="input px-[10px] py-[11px] border-1 border-white/50 rounded-[5px] w-[210px] focus:outline-none placeholder:text-black/25 bg-[#09002f]"
				>
					{
						blankOption ?
							<option value=""></option> :
							null
					}
					{
						options.map((option) => (
							typeof option === "object" ?
								<option key={option.name} value={option.value}>
									{option.name}
								</option>
								:
								<option key={option} value={option}>
									{option}
								</option>
						))
					}
				</select>
			</div>
		</>
	)
}

export function FieldError({ show, children }: { show?: boolean; children: ReactNode }) {
	if (!show) return null;
	return <p className="text-sm text-red-600 dark:text-red-400">{children}</p>;
}

export function Label({ label, htmlFor }: { label: string; htmlFor?: string }) {
	return (
		<>
			<div>
				<label
					htmlFor={htmlFor}
					className="text-xs z-10 font-semibold relative top-2 ml-[7px] px-[3px] bg-[#09002f] w-fit"
				>{label}</label>
			</div>
		</>
	)
}
