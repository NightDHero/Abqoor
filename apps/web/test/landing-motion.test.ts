import assert from "node:assert/strict";
import { test } from "node:test";
import { attachLandingPointer } from "../src/features/home/landingMotion.js";

test("pointer aura batches movement, follows the latest position, and cleans up", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  class MediaQuery extends EventTarget { constructor(public matches: boolean) { super(); } }
  const fine = new MediaQuery(true);
  const reduced = new MediaQuery(false);
  const frames = new Map<number, FrameRequestCallback>();
  let frameId = 0;
  const windowTarget = Object.assign(new EventTarget(), {
    matchMedia: (query: string) => query.includes("reduced-motion") ? reduced : fine,
    requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: (id: number) => frames.delete(id)
  });
  Object.defineProperty(globalThis, "window", { configurable: true, value: windowTarget });
  Object.defineProperty(globalThis, "document", { configurable: true, value: new EventTarget() });
  const page = new EventTarget();
  const spotlight = { dataset: { visible: "false" }, style: { transform: "" } };
  const move = (x: number, y: number, pointerType = "mouse") => {
    page.dispatchEvent(Object.assign(new Event("pointermove"), { clientX: x, clientY: y, pointerType }));
  };
  const flush = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach((callback) => callback(0)); };
  try {
    const cleanup = attachLandingPointer(page as HTMLElement, spotlight as unknown as HTMLElement);
    move(10, 20);
    move(70, 80);
    assert.equal(frames.size, 1);
    flush();
    assert.match(spotlight.style.transform, /translate3d\(70px, 80px, 0\)/);
    assert.equal(spotlight.dataset.visible, "true");
    page.dispatchEvent(new Event("pointerleave"));
    assert.equal(spotlight.dataset.visible, "false");
    move(40, 50, "touch");
    assert.equal(frames.size, 0);
    move(40, 50);
    reduced.matches = true;
    reduced.dispatchEvent(new Event("change"));
    assert.equal(frames.size, 0);
    move(100, 200);
    assert.equal(spotlight.dataset.visible, "false");
    assert.equal(frames.size, 0);
    reduced.matches = false;
    fine.matches = false;
    move(100, 200);
    assert.equal(frames.size, 0);
    fine.matches = true;
    move(100, 200);
    flush();
    windowTarget.dispatchEvent(new Event("blur"));
    assert.equal(spotlight.dataset.visible, "false");
    cleanup();
    move(1, 1);
    assert.equal(frames.size, 0);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
