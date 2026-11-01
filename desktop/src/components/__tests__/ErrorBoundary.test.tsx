import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "../ErrorBoundary/ErrorBoundary";

function ProblematicComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Erro de renderização forçado");
  }
  return <div>Conteúdo Funcionando</div>;
}

describe("ErrorBoundary", () => {
  it("deve renderizar os componentes filhos quando não há erro", () => {
    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Conteúdo Funcionando")).toBeInTheDocument();
  });

  it("deve capturar exceção de renderização e exibir tela de recuperação em vez de tela preta", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Falha na Inicialização da Interface")).toBeInTheDocument();
    expect(screen.getAllByText(/Erro de renderização forçado/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Recarregar TetPlayer/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Limpar Cache/i })).toBeInTheDocument();

    spy.mockRestore();
  });
});
