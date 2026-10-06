import { useEffect, useRef, useState } from "react";
import { env } from "../../config/env";

type GoogleCredentialResponse = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            callback: (response: GoogleCredentialResponse) => void;
            client_id: string;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: Record<string, string | number>
          ) => void;
        };
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
    void loadGoogleIdentityServices()
      .then(() => {
        if (!active || !containerRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          callback: (response) => {
            if (response.credential) callbackRef.current(response.credential);
          },
          client_id: env.googleClientId
        });
        containerRef.current.replaceChildren();
        window.google.accounts.id.renderButton(containerRef.current, {
          locale: "ar",
          shape: "rectangular",
          size: "large",
          text: "continue_with",
          theme: "outline",
          type: "standard",
          width: 320
        });
        setIsReady(true);
      })
      .catch(() => {
        if (active) onError("تعذر تحميل تسجيل الدخول عبر Google.");
      });
    return () => {
      active = false;
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
