import type { ChangeEventHandler, ReactNode } from "react";
import type { StateHandler } from "../../lib/useStateHandler";

type FieldValue = string | number | undefined;

interface InputProps<T> {
	label: string;
	handler: StateHandler<T>;
	type?: string;
	name: keyof T & string;
	value?: string | number;
}

export function Input<T extends object>({
	label,
	handler,
	type,
	name,
	value,
}: InputProps<T>) {
	const { handleInput, formData } = handler;

	return (
		<>
			<div className="input static flex w-fit flex-col">
				<Label label={label} />
				<input
					type={type ? type : "text"}
					name={name}
					value={value ?? (formData[name] as FieldValue)}
					onChange={handleInput}
					className="input w-[210px] rounded-[5px] border-1 border-white/50 px-[10px] py-[11px] placeholder:text-black/25 focus:outline-none"
				/>
			</div>
		</>
	);
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
	value,
}: SelectProps<T>) {
	const { handleInput, formData } = handler ?? {};

	return (
		<>
			<div className="input static flex w-fit flex-col">
				<Label label={label} />
				<select
					name={name}
					value={value ?? (formData?.[name] as FieldValue)}
					onChange={changeHandler ?? handleInput}
					className="input w-[210px] rounded-[5px] border-1 border-white/50 bg-[#09002f] px-[10px] py-[11px] placeholder:text-black/25 focus:outline-none"
				>
					{blankOption ? <option value=""></option> : null}
					{options.map((option) =>
						typeof option === "object" ? (
							<option key={option.name} value={option.value}>
								{option.name}
							</option>
						) : (
							<option key={option} value={option}>
								{option}
							</option>
						),
					)}
				</select>
			</div>
		</>
	);
}

export function FieldError({
	show,
	children,
}: {
	show?: boolean;
	children: ReactNode;
}) {
	if (!show) return null;
	return <p className="text-sm text-red-600 dark:text-red-400">{children}</p>;
}

export function Label({ label }: { label: string }) {
	return (
		<>
			<div>
				<label className="relative top-2 z-10 ml-[7px] w-fit bg-[#09002f] px-[3px] text-xs font-semibold">
					{label}
				</label>
			</div>
		</>
	);
}
