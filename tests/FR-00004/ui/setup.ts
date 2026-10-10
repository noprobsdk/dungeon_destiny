// FR-00004: browser features Mantine needs that jsdom does not provide.
// Test-only stand-ins; the real browser provides them.
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

if (!("ResizeObserver" in window)) {
  class ResizeObserverStandIn {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, "ResizeObserver", { writable: true, value: ResizeObserverStandIn });
  Object.defineProperty(globalThis, "ResizeObserver", { writable: true, value: ResizeObserverStandIn });
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

afterEach(() => {
  cleanup();
});
