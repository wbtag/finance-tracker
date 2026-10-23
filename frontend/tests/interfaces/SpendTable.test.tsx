import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import SpendTable from "@/components/ui/SpendTable";

const spendData = {
	balance: 100,
	weekly_spend: 11,
	monthly_spend: 46,
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
			spend: 3,
			limit: 4,
		},
	},
};

describe("SpendTable", () => {
	it("renders categories with limits", () => {
		render(
			<>
				<SpendTable
					source={spendData.weekly_spend_categories}
					other={spendData.other.week}
				/>
			</>,
		);

		expect(screen.getByRole("row", { name: "Groceries 6/6 Kč" })).toBeDefined();
	});
	it("renders other", () => {
		render(
			<>
				<SpendTable
					source={spendData.weekly_spend_categories}
					other={spendData.other.week}
				/>
			</>,
		);

		expect(screen.getByRole("row", { name: "Jiné 4 Kč" })).toBeDefined();
	});
	it("renders a category with overage in red", () => {
		render(
			<>
				<SpendTable
					source={spendData.monthly_spend_categories}
					other={spendData.other.month}
				/>
			</>,
		);

		const row = screen.getByRole("cell", { name: "Groceries" }).closest("tr")!;
		const spend = within(row).getByText("26/24 Kč");

		expect(spend.className).toBe("text-red-500/80");
	});
	it("renders the progress bar correctly", () => {
		render(
			<>
				<SpendTable
					source={spendData.monthly_spend_categories}
					other={spendData.other.month}
				/>
			</>,
		);

		const groceriesBar = screen.getByRole("progressbar", {
			name: "Groceries: útrata vůči limitu",
		});
		expect(groceriesBar.getAttribute("aria-valuenow")).toBe("26");
		expect((groceriesBar.firstChild as HTMLElement).style.width).toBe("100%");

		const leisureBar = screen.getByRole("progressbar", {
			name: "Leisure: útrata vůči limitu",
		});
		expect(leisureBar.getAttribute("aria-valuenow")).toBe("3");
		expect((leisureBar.firstChild as HTMLElement).style.width).toBe("75%");
	});
});
