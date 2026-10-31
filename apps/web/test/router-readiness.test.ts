import assert from "node:assert/strict";
import { test } from "node:test";
import {
  navigateTo,
  registerNavigationPreparer
} from "../src/utils/router.js";

test("navigation keeps the current route visible until preparation completes", async () => {
  const originalDocument = globalThis.document;
  const originalPopStateEvent = globalThis.PopStateEvent;
  const originalWindow = globalThis.window;
  const pushedPaths: string[] = [];
  const dispatchedEvents: Event[] = [];
  let releasePreparation: (() => void) | undefined;

  const preparation = new Promise<void>((resolve) => {
    releasePreparation = resolve;
  });

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

  const unregister = registerNavigationPreparer(() => preparation);

  try {
    navigateTo("/profile");
    await Promise.resolve();
    assert.deepEqual(pushedPaths, []);

    releasePreparation?.();
    await preparation;
    await Promise.resolve();
    await Promise.resolve();

    assert.deepEqual(pushedPaths, ["/profile"]);
    assert.equal(dispatchedEvents.length, 1);
  } finally {
    unregister();
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
