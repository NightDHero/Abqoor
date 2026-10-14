import assert from "node:assert/strict";
import test from "node:test";
import {
  createGoogleIdentityController,
  type GoogleCredentialResponse,
  type GoogleIdentityApi
} from "../src/features/auth/googleIdentityClient.js";

test("Google Identity Services initializes once and routes credentials to the active screen", async () => {
  let initializeCalls = 0;
  let googleCallback: ((response: GoogleCredentialResponse) => void) | undefined;
  const api: GoogleIdentityApi = {
    initialize(options) {
      initializeCalls += 1;
      googleCallback = options.callback;
    },
    renderButton() {
      return undefined;
    }
  };
  const controller = createGoogleIdentityController(async () => api);
  const received: string[] = [];

  const removeFirstHandler = controller.setCredentialHandler((credential) => {
    received.push(`first:${credential}`);
  });
  await Promise.all([
    controller.initialize("client.apps.googleusercontent.com"),
    controller.initialize("client.apps.googleusercontent.com")
  ]);
  removeFirstHandler();

  controller.setCredentialHandler((credential) => {
    received.push(`second:${credential}`);
  });
  await controller.initialize("client.apps.googleusercontent.com");
  googleCallback?.({ credential: "credential-value" });

  assert.equal(initializeCalls, 1);
  assert.deepEqual(received, ["second:credential-value"]);
});
