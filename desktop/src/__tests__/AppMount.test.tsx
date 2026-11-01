import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import App from "../App";

describe("App Root Mounting", () => {
  it("deve renderizar a aplicação inteira sem lançar exceções", () => {
    const { container } = render(<App />);
    expect(container).toBeDefined();
    expect(container.innerHTML).not.toBe("");
  });
});

