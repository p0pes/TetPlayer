import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock para @tauri-apps/api/core invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve(null)),
}));

// Mock para @tauri-apps/api/event listen
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));
