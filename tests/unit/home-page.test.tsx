import { render, screen } from "@testing-library/react";

import Home from "@/app/page";

describe("Home page", () => {
  it("TC-P1-002 — renders the page heading and primary menu call to action", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Brew ni Cat Connect" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View menu" })).toHaveAttribute(
      "href",
      "/menu",
    );
  });
});
