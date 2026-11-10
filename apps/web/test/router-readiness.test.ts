import assert from "node:assert/strict";
import { test } from "node:test";
import { navigateTo } from "../src/utils/router.js";

test("navigation commits synchronously without a preparation promise", () => {
  const originalDocument = globalThis.document;
  const originalPopStateEvent = globalThis.PopStateEvent;
  const originalWindow = globalThis.window;
  const pushedPaths: string[] = [];
  const dispatchedEvents: Event[] = [];

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      dispatchEvent: (event: Event) => {
        dispatchedEvents.push(event);
        return true;
      },
      history: {
        pushState: (_state: unknown, _title: string, path: string) => {
          pushedPaths.push(path);
        }
      },
      location: { pathname: "/career", search: "" },
      matchMedia: () => ({ matches: true }),
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }
    }
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { getElementById: () => null }
  });
  Object.defineProperty(globalThis, "PopStateEvent", {
    configurable: true,
    value: class extends Event {}
  });

  try {
    navigateTo("/profile");
    assert.deepEqual(pushedPaths, ["/profile"]);
    assert.equal(dispatchedEvents.length, 1);
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument
    });
    Object.defineProperty(globalThis, "PopStateEvent", {
      configurable: true,
      value: originalPopStateEvent
    });
  }
});
