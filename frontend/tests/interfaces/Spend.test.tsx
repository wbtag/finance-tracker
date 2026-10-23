import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { addDays, getISOWeek, getISOWeekYear } from "date-fns";
import Spend from "@/components/interfaces/Spend";

vi.mock("@/components/ui/SpendTable", () => ({
	default: ({
		source,
		other,
	}: {
		source: Record<string, Record<string, number>>;
		other: number;
	}) => (
		<div>
			<div data-testid="spend-table-other">{other}</div>
			<div data-testid="spend-table-keys">{Object.keys(source)}</div>
		</div>
	),
}));

const spendData = {
	balance: 100,
	weekly_spend: 11,
	monthly_spend: 53,
	other: {
		week: 4,
		month: 17,
	},
	weekly_spend_categories: {
		Groceries: {
			spend: 6,
			limit: 6,
		},
		Leisure: {
			spend: 1,
			limit: 1,
		},
	},
	monthly_spend_categories: {
		Groceries: {
			spend: 26,
			limit: 24,
		},
		Leisure: {
			spend: 10,
			limit: 4,
		},
	},
};

describe("Spend", () => {
	it("displays links with valid destinations", () => {
		const weekDate = addDays(new Date(), 0);

		render(<Spend sundayWeekStart={false} spendData={spendData} />);

		const links = screen.getAllByRole("link");
		expect(links.length).toBe(3);
		expect(links[0].getAttribute("href")).toBe(
			`/weekly-summary/${getISOWeekYear(weekDate)}/${getISOWeek(weekDate)}`,
		);
		expect(links[1].getAttribute("href")).toBe(`/query`);
		expect(links[2].getAttribute("href")).toBe("/balance");
	});
	it.each([
		{ sundayWeekStart: false, href: "/weekly-summary/2026/42" },
		{ sundayWeekStart: true, href: "/weekly-summary/2026/43" },
	])(
		"links Sunday to correct ISO week (sundayWeekStart: $sundayWeekStart)",
		({ sundayWeekStart, href }) => {
			vi.useFakeTimers({ toFake: ["Date"] });
			// Sunday; with Sunday week start it belongs to the week of the following Monday
			vi.setSystemTime(new Date(2026, 9, 18, 12));

			render(<Spend sundayWeekStart={sundayWeekStart} spendData={spendData} />);

			expect(
				screen
					.getByRole("link", { name: /Útrata tento týden/ })
					.getAttribute("href"),
			).toBe(href);
			vi.useRealTimers();
		},
	);
	it("re-renders spend table on week/month switch", () => {
		render(<Spend sundayWeekStart={false} spendData={spendData} />);

		expect(screen.getByTestId("spend-table-other").textContent).toBe("4");
		fireEvent.click(screen.getByRole("button", { name: "Měsíc" }));
		expect(screen.getByTestId("spend-table-other").textContent).toBe("17");
		fireEvent.click(screen.getByRole("button", { name: "Týden" }));
		expect(screen.getByTestId("spend-table-other").textContent).toBe("4");
		fireEvent.click(screen.getByRole("button", { name: "Týden" }));
		expect(screen.getByTestId("spend-table-other").textContent).toBe("4");
	});
	it("renders all category keys", () => {
		render(<Spend sundayWeekStart={false} spendData={spendData} />);

		expect(screen.getByTestId("spend-table-keys").textContent).toBe(
			"GroceriesLeisure",
		);
	});
});
