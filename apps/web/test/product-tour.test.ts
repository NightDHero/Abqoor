import assert from "node:assert/strict";
import test from "node:test";
import { calculateTourPanelPosition } from "../src/features/tutorial/tourPosition.js";
import {
  mascotAssets,
  productTourSteps
} from "../src/features/tutorial/tutorialConfig.js";

test("the product tour uses every supplied Abqoor expression", () => {
  const expressions = new Set(productTourSteps.map((step) => step.expression));
  assert.deepEqual(
    [...expressions].sort(),
    Object.keys(mascotAssets).sort()
  );
  assert.equal(productTourSteps.length, 6);
  assert.ok(productTourSteps.every((step) => step.route === "/career"));
});

test("tour panel positioning stays inside desktop and mobile viewports", () => {
  const desktop = calculateTourPanelPosition({
    bottom: 500,
    height: 240,
    left: 850,
    right: 1260,
    top: 260,
    width: 410
  }, 1440, 900);
  assert.ok(desktop.left >= 18);
  assert.ok(desktop.left + desktop.width <= 1422);
  assert.ok(desktop.top >= 18);

  const wideTarget = calculateTourPanelPosition({
    bottom: 220,
    height: 100,
    left: 110,
    right: 1130,
    top: 120,
    width: 1020
  }, 1280, 720);
  assert.ok(wideTarget.top >= 242);

  const mobile = calculateTourPanelPosition(null, 390, 844);
  assert.equal(mobile.left, 10);
  assert.equal(mobile.width, 370);
  assert.ok(mobile.top >= 10);
  assert.ok(mobile.top < 844);
});
