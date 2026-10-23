import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import Balance from "@/components/interfaces/Balance";
import userEvent from "@testing-library/user-event";
import { request } from "@/components/lib/request";

const balanceData = {
	balance: 1000,
	estimated_balance: 900,
	balance_date: new Date(2026, 9, 1).toISOString(),
	income_since: 200,
	spend_since: 100,
};

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		refresh,
		push: vi.fn(),
		replace: vi.fn(),
		back: vi.fn(),
	}),
}));

vi.mock("@/components/ui/useAnimatedValue", () => ({
	default: (v: number) => v,
}));

vi.mock("@/components/lib/request", () => ({
	request: vi.fn().mockResolvedValue({}),
}));

const alert = vi.spyOn(window, "alert").mockImplementation(() => {});

const setup = (data = balanceData) => {
	const result = render(<Balance balanceData={data} />);
	return {
		...result,
		user: userEvent.setup(),
		incomeForm: screen.getByText("Nový příjem").parentElement!,
		balanceForm: screen.getByText("Aktualizace zůstatku").parentElement!,
	};
};

const tile = (label: string | RegExp) =>
	screen.getByText(label).previousElementSibling!.textContent;

function sentBody() {
	const [, options] = vi.mocked(request).mock.lastCall!;
	return JSON.parse(options!.body as string);
}

describe("Balance", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	it("displays correct amounts", () => {
		setup();

		expect(tile("Aktuální odhadovaný zůstatek")).toBe("900 Kč");
		expect(tile("Příjmy od poslední aktualizace")).toBe("200 Kč");
		expect(tile("Útrata od poslední aktualizace")).toBe("100 Kč");
		expect(tile(/Zůstatek k/)).toBe("1000 Kč");
	});
	it("shows correct balance date", () => {
		setup();

		expect(screen.getByText("Zůstatek k 1. 10. 2026 0:00")).toBeDefined();
	});
	it("shows new values when refreshed data arrives", () => {
		const { rerender } = setup();

		rerender(
			<Balance
				balanceData={{
					...balanceData,
					estimated_balance: 1050,
					income_since: 350,
				}}
			/>,
		);

		expect(tile("Aktuální odhadovaný zůstatek")).toBe("1050 Kč");
		expect(tile("Příjmy od poslední aktualizace")).toBe("350 Kč");
	});
	it("handles income form input", async () => {
		const { user, incomeForm } = setup();

		const description = screen.getByLabelText<HTMLInputElement>("Popis");
		const amount = screen.getByLabelText<HTMLInputElement>("Částka");

		await user.type(description, "test");
		await user.clear(amount);
		await user.type(amount, "150");

		expect(description.value).toBe("test");
		expect(amount.value).toBe("150");

		await user.click(within(incomeForm).getByRole("button"));

		expect(request).toHaveBeenCalledWith(
			"balance/",
			expect.objectContaining({ method: "POST" }),
		);
		expect(sentBody()).toEqual({
			type: "income",
			amount: "150",
			description: "test",
		});
		expect(refresh).toHaveBeenCalled();

		expect(description.value).toBe("");
		expect(amount.value).toBe("");
	});
	it.each([
		{
			description: "",
			amount: "150",
			error: "Popis chybí",
			id: "blank description",
		},
		{
			description: "test",
			amount: "",
			error: "Neplatná částka",
			id: "empty amount",
		},
		{
			description: "test",
			amount: "0",
			error: "Neplatná částka",
			id: "zero amount",
		},
		{
			description: "test",
			amount: "-5",
			error: "Neplatná částka",
			id: "negative amount",
		},
		{
			description: "test",
			amount: "1.5",
			error: "Neplatná částka",
			id: "decimal amount",
		},
	])(
		"blocks income submit on invalid input - $id",
		async ({ description, amount, error }) => {
			const { user, incomeForm } = setup();

			if (description)
				await user.type(screen.getByLabelText("Popis"), description);
			if (amount) await user.type(screen.getByLabelText("Částka"), amount);
			await user.click(within(incomeForm).getByRole("button"));

			expect(screen.getByText(error)).toBeDefined();
			expect(request).not.toHaveBeenCalled();
			expect(refresh).not.toHaveBeenCalled();
		},
	);
	it("handles balance form input", async () => {
		const { user, balanceForm } = setup();

		const balance = screen.getByLabelText<HTMLInputElement>("Nový zůstatek");

		await user.clear(balance);
		await user.type(balance, "150");

		expect(balance.value).toBe("150");

		await user.click(within(balanceForm).getByRole("button"));

		expect(request).toHaveBeenCalledWith(
			"balance/",
			expect.objectContaining({ method: "POST" }),
		);
		expect(sentBody()).toEqual({ type: "balance", balance: "150" });
		expect(refresh).toHaveBeenCalled();

		expect(balance.value).toBe("");
	});
	it("accepts negative balance", async () => {
		const { user, balanceForm } = setup();

		await user.type(screen.getByLabelText("Nový zůstatek"), "-150");
		await user.click(within(balanceForm).getByRole("button"));

		expect(sentBody()).toEqual({ type: "balance", balance: "-150" });
	});
	it.each([
		{ balance: "", id: "empty" },
		{ balance: "abc", id: "not a number" },
		{ balance: "1.5", id: "decimal" },
	])("blocks balance submit on invalid input - $id", async ({ balance }) => {
		const { user, balanceForm } = setup();

		if (balance)
			await user.type(screen.getByLabelText("Nový zůstatek"), balance);
		await user.click(within(balanceForm).getByRole("button"));

		expect(screen.getByText("Neplatný zůstatek")).toBeDefined();
		expect(request).not.toHaveBeenCalled();
	});
	it("validates only the submitted form", async () => {
		const { user, balanceForm } = setup();

		await user.type(screen.getByLabelText("Nový zůstatek"), "150");
		await user.click(within(balanceForm).getByRole("button"));

		expect(screen.queryByText("Popis chybí")).toBeNull();
		expect(screen.queryByText("Neplatná částka")).toBeNull();
		expect(request).toHaveBeenCalledOnce();
	});
	it("disables both buttons while saving", async () => {
		const { user, balanceForm } = setup();
		vi.mocked(request).mockReturnValueOnce(new Promise(() => {}));

		await user.type(screen.getByLabelText("Nový zůstatek"), "150");
		await user.click(within(balanceForm).getByRole("button"));

		const buttons = await screen.findAllByRole<HTMLButtonElement>("button", {
			name: "Ukládá se...",
		});
		expect(buttons).toHaveLength(2);
		expect(buttons.every((button) => button.disabled)).toBe(true);
	});
	it("alerts on API error and keeps the form data", async () => {
		const { user, incomeForm } = setup();
		vi.mocked(request).mockRejectedValueOnce(new Error("Invalid payload"));

		await user.type(screen.getByLabelText("Popis"), "test");
		await user.type(screen.getByLabelText("Částka"), "150");
		await user.click(within(incomeForm).getByRole("button"));

		await waitFor(() =>
			expect(alert).toHaveBeenCalledWith("Chyba: Invalid payload"),
		);
		expect(screen.getByLabelText<HTMLInputElement>("Popis").value).toBe("test");
		expect(screen.getByLabelText<HTMLInputElement>("Částka").value).toBe("150");
	});
});
