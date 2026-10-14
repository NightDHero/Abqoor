import { useEffect, useRef, useState } from "react";
import { env } from "../../config/env";
import {
  createGoogleIdentityController,
  type GoogleIdentityApi
} from "./googleIdentityClient";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleIdentityApi;
      };
    };
  }
}

let googleScriptPromise: Promise<void> | null = null;

const loadGoogleIdentityServices = () => {
  if (window.google?.accounts.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;
  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Identity Services failed to load."));
    document.head.appendChild(script);
  });
  return googleScriptPromise;
};

const googleIdentityController = createGoogleIdentityController(async () => {
  await loadGoogleIdentityServices();
  if (!window.google?.accounts.id) {
    throw new Error("Google Identity Services did not initialize.");
  }
  return window.google.accounts.id;
});

export function GoogleSignInButton({
  disabled,
  onCredential,
  onError
}: {
  disabled: boolean;
  onCredential: (credential: string) => void;
  onError: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const [isReady, setIsReady] = useState(false);
  callbackRef.current = onCredential;

  useEffect(() => {
    if (!env.googleClientId) return;
    let active = true;
    const removeCredentialHandler = googleIdentityController.setCredentialHandler(
      (credential) => callbackRef.current(credential)
    );
    void googleIdentityController.initialize(env.googleClientId)
      .then((googleIdentity) => {
        if (!active || !containerRef.current) return;
        containerRef.current.replaceChildren();
        const availableWidth = containerRef.current.clientWidth;
        googleIdentity.renderButton(containerRef.current, {
          locale: "ar",
          shape: "rectangular",
          size: "large",
          text: "continue_with",
          theme: "outline",
          type: "standard",
          width: Math.min(400, Math.max(200, availableWidth || 320))
        });
        setIsReady(true);
      })
      .catch(() => {
        if (active) onError("تعذر تحميل تسجيل الدخول عبر Google.");
      });
    return () => {
      active = false;
      removeCredentialHandler();
    };
  }, [onError]);

  if (!env.googleClientId) return null;

  return (
    <div
      aria-busy={!isReady}
      className={disabled ? "auth-google-button disabled" : "auth-google-button"}
      ref={containerRef}
    />
  );
}
