import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, vi, describe, expect, it } from "vitest";
import { createEmptyBoard } from "@/features/game/engine";
import { GomokuBoard } from "./GomokuBoard";

describe("GomokuBoard", () => {
  afterEach(cleanup);
  it("exposes each empty cell as an accessible move and forwards selection", () => {
    const onCellClick = vi.fn();
    const view = render(<GomokuBoard board={createEmptyBoard()} currentPlayer={1} onCellClick={onCellClick} />);
    const target = view.getByRole("button", { name: "Jogar na linha 8, coluna 8" });
    fireEvent.click(target);
    expect(onCellClick).toHaveBeenCalledWith(7, 7);
  });

  it("prevents interaction while disabled", () => {
    const onCellClick = vi.fn();
    const view = render(<GomokuBoard board={createEmptyBoard()} currentPlayer={2} disabled onCellClick={onCellClick} />);
    const target = view.getByRole("button", { name: "Jogar na linha 1, coluna 1" });
    expect(target).toBeDisabled();
    fireEvent.click(target);
    expect(onCellClick).not.toHaveBeenCalled();
  });
});
