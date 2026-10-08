import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./screens/Catalog/Catalog", () => ({
  Catalog: () => <div>Catalog screen</div>,
}));

describe("App", () => {
  it("renders the Catalog screen", () => {
    render(<App />);
    expect(screen.getByText("Catalog screen")).toBeInTheDocument();
  });
});
