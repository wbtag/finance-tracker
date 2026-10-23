import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Switcher from "@/components/ui/Switcher";

describe("Switcher", () => {
	it("is active when state matches its name", () => {
		render(
			<Switcher
				name="week"
				text="Týden"
				stateTracker="week"
				changeHandler={vi.fn()}
			/>,
		);

		expect(
			screen
				.getByRole("button", { name: "Týden" })
				.classList.contains("button--active"),
		).toBe(true);
	});
	it("is inactive when state does not match its name", () => {
		render(
			<Switcher
				name="month"
				text="Měsíc"
				stateTracker="week"
				changeHandler={vi.fn()}
			/>,
		);

		expect(
			screen
				.getByRole("button", { name: "Měsíc" })
				.classList.contains("button--active"),
		).toBe(false);
	});
	it("passes its name to the change handler", async () => {
		const changeHandler = vi.fn();
		render(
			<Switcher
				name="month"
				text="Měsíc"
				stateTracker="week"
				changeHandler={changeHandler}
			/>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Měsíc" }));

		expect(changeHandler).toHaveBeenCalledOnce();
		expect(changeHandler.mock.calls[0][0].target.name).toBe("month");
	});
});
