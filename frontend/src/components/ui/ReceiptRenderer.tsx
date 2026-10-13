import { type MouseEvent, useState } from "react";
import { ReceiptItems, ReceiptParams } from "./elements/receiptElements";
import { useStateHandler } from "../lib/useStateHandler";
import { useValidation } from "../lib/useValidation";
import { receiptRules } from "../lib/receiptValidation";
import { newItemKey, normalizeItems, normalizeTags } from "../lib/tags";
import { request } from "@/components/lib/request";
import { RawReceiptItem, Receipt } from "@/app/types/receipt";
import { RawTags } from "@/app/types/tags";

interface ReceiptRendererProps {
	receipts: Receipt[];
	categories: string[];
	tags: string[];
	onChanged: () => void;
}

export default function ReceiptRenderer({
	receipts,
	categories,
	tags,
	onChanged,
}: ReceiptRendererProps) {
	return (
		<>
			{receipts.map((receipt, i) => (
				<ReceiptRow
					key={receipt.id ?? i}
					receipt={receipt}
					categories={categories}
					tags={tags}
					onChanged={onChanged}
				/>
			))}
		</>
	);
}

interface ReceiptRowProps {
	receipt: Receipt;
	categories: string[];
	tags: string[];
	onChanged: () => void;
}

function ReceiptRow({ receipt, categories, tags, onChanged }: ReceiptRowProps) {
	const [expanded, setExpanded] = useState(false);
	const [editing, setEditing] = useState(false);
	const hasItems = Array.isArray(receipt.items) && receipt.items.length > 0;

	const handleDeleteReceipt = async (e: MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
		if (window.confirm("Opravdu smazat tuto účtenku?")) {
			try {
				await request(
					"receipt/",
					{ method: "DELETE" },
					{
						id: receipt.id,
					},
				);
				onChanged();
			} catch (e: unknown) {
				if (e instanceof Error) {
					window.alert("Chyba: " + e.message);
				}
			}
		}
	};

	const handleEditClick = (e: MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		setEditing(true);
	};

	return (
		<div
			onClick={() => setExpanded((e) => !e)}
			className="border-b border-white/10"
		>
			<div
				className={`grid cursor-pointer grid-cols-[1fr_auto_auto] items-center gap-3 py-3 sm:gap-4 sm:py-3.5`}
			>
				<div className="min-w-0">
					<p className="truncate text-sm tracking-wide text-white/90 sm:text-base">
						{receipt.description}
					</p>
					<p className="mt-0.5 text-xs tracking-wide italic">
						{receipt.category}
					</p>
				</div>

				<span className="text-sm whitespace-nowrap text-white/85 tabular-nums sm:text-base">
					{Number(receipt.filtered_amount ?? receipt.amount).toLocaleString(
						"cs-CZ",
					)}{" "}
					Kč
				</span>

				<div
					className={`flex w-3 items-center text-white/25 transition-transform duration-200 sm:w-3.5 ${expanded ? "rotate-180" : "rotate-0"}`}
				>
					<svg width="11" height="11" viewBox="0 0 12 12" fill="none">
						<path
							d="M2 4.5L6 8L10 4.5"
							stroke="currentColor"
							strokeWidth="1.4"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</div>
			</div>

			{expanded && (
				<div>
					{editing ? (
						<ReceiptEditForm
							receipt={receipt}
							tags={tags ?? []}
							categories={categories}
							onCancel={() => setEditing(false)}
							onSaved={() => {
								setEditing(false);
								onChanged();
							}}
						/>
					) : (
						<>
							<div>
								<div className="flex flex-row">
									<p className="min-w-20 truncate text-sm tracking-wide text-white/90 sm:text-base">
										Datum:
									</p>
									<p className="truncate text-sm tracking-wide text-white/90 sm:text-base">
										{new Date(receipt.date).toLocaleDateString("cs-CZ")}
									</p>
								</div>
								<div className="flex flex-row">
									<p className="min-w-20 truncate text-sm tracking-wide text-white/90 sm:text-base">
										Značky:
									</p>
									<p className="truncate text-sm tracking-wide text-white/90 sm:text-base">
										{receipt.tags.join(", ")}
									</p>
								</div>

								{receipt.filtered_amount &&
								receipt.filtered_amount != receipt.amount ? (
									<div className="flex flex-row">
										<p className="min-w-20 truncate text-sm tracking-wide text-white/90 sm:text-base">
											Celkem:
										</p>
										<p className="truncate text-sm tracking-wide text-white/90 sm:text-base">
											{receipt.amount} Kč
										</p>
									</div>
								) : null}
							</div>
							{hasItems && (
								<div>
									<p className="pb-2 text-sm text-white/90 sm:text-base">
										Položky:
									</p>
									{receipt.items!.map((item, i) => (
										<div
											key={i}
											className="flex items-baseline justify-between gap-3 py-1 pr-7 pl-3 sm:gap-4 sm:pr-10 sm:pl-4"
										>
											<span className="text-xs text-white/75 italic sm:text-sm">
												{Array.isArray(item.tags) && item.tags.length > 0
													? item.tags.join(", ")
													: "—"}
											</span>
											<span className="shrink-0 text-xs whitespace-nowrap text-white/75 tabular-nums sm:text-sm">
												{Number(item.amount).toLocaleString("cs-CZ")} Kč
											</span>
										</div>
									))}
								</div>
							)}
							<div className="flex justify-end gap-1 px-5 py-5">
								<span>
									<button
										className="button button--active"
										onClick={handleEditClick}
									>
										Upravit
									</button>
								</span>
								<span>
									<button
										className="button button--active"
										onClick={handleDeleteReceipt}
									>
										Smazat
									</button>
								</span>
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
}

function toDateInputValue(date: number | string) {
	const d = new Date(date);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface ReceiptEditFormProps {
	receipt: Receipt;
	tags: string[];
	categories: string[];
	onCancel: () => void;
	onSaved: () => void;
}

function ReceiptEditForm({
	receipt,
	tags,
	categories,
	onCancel,
	onSaved,
}: ReceiptEditFormProps) {
	const { date, items, ...rest } = receipt;

	const stateHandler = useStateHandler({
		date: toDateInputValue(date),
		...rest,
		...(items
			? {
					items: items.map((item) => ({
						...item,
						key: newItemKey(),
						tags: [...item.tags],
					})),
				}
			: {}),
	});

	const { formData } = stateHandler;

	const [saving, setSaving] = useState(false);
	const { errors, validate } = useValidation(receiptRules(receipt.type));

	const handleSave = async (e: MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		if (!validate(formData)) return;
		setSaving(true);

		try {
			const editPayload: Record<string, unknown> = {};
			const original = receipt as unknown as Record<string, unknown>;
			const form = formData as Record<string, unknown>;

			for (const [key, value] of Object.entries(form)) {
				switch (key) {
					case "date":
						if (value != toDateInputValue(receipt.date)) {
							editPayload.date = value;
						}
						break;
					case "tags": {
						const formTags = normalizeTags(value as RawTags);
						if (
							JSON.stringify(formTags) !=
							JSON.stringify(normalizeTags(receipt.tags))
						) {
							editPayload.tags = formTags;
						}
						break;
					}
					case "items": {
						const formItems = normalizeItems(value as RawReceiptItem[]);
						if (
							JSON.stringify(formItems) !=
							JSON.stringify(normalizeItems(receipt.items))
						) {
							editPayload.items = formItems;
						}
						break;
					}
					case "id":
						break;
					default:
						if (value != original[key]) {
							editPayload[key] = value;
						}
				}
			}

			if (Object.keys(editPayload).length > 0) {
				editPayload["id"] = receipt.id;
				await request("receipt/", {
					method: "PUT",
					body: JSON.stringify(editPayload),
				});
				onSaved();
			} else {
				onCancel();
			}
		} catch (e: unknown) {
			if (e instanceof Error) {
				window.alert("Chyba: " + e.message);
			}
		} finally {
			setSaving(false);
		}
	};

	return (
		<div
			className="flex flex-col gap-3 py-3"
			onClick={(e) => e.stopPropagation()}
		>
			<ReceiptParams
				handler={stateHandler}
				categories={categories}
				tags={tags}
				validationErrors={errors}
			/>

			{receipt.type === "extended" && (
				<ReceiptItems
					handler={stateHandler}
					tags={tags}
					validationErrors={errors}
				/>
			)}

			<div className="flex justify-end gap-2 pt-2">
				<button
					type="button"
					className="button button--active"
					onClick={(e) => {
						e.stopPropagation();
						onCancel();
					}}
				>
					Zrušit
				</button>
				<button
					type="button"
					className="button button--active"
					onClick={handleSave}
					disabled={saving}
				>
					{saving ? "Ukládá se…" : "Uložit"}
				</button>
			</div>
		</div>
	);
}
