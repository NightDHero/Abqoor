export type GoogleCredentialResponse = { credential?: string };

export type GoogleIdentityApi = {
  initialize: (options: {
    auto_select?: boolean;
    callback: (response: GoogleCredentialResponse) => void;
    cancel_on_tap_outside?: boolean;
    client_id: string;
    context?: "signin" | "signup" | "use";
    itp_support?: boolean;
  }) => void;
  prompt: () => void;
  renderButton: (
    element: HTMLElement,
    options: Record<string, string | number>
  ) => void;
};

export const createGoogleIdentityController = (
  loadApi: () => Promise<GoogleIdentityApi>
) => {
  let activeCredentialHandler: ((credential: string) => void) | null = null;
  let initializedClientId: string | null = null;
  let initialization: Promise<GoogleIdentityApi> | null = null;
  let oneTapPrompted = false;

  const initialize = async (clientId: string) => {
    if (initializedClientId && initializedClientId !== clientId) {
      throw new Error("Google Identity Services was initialized with a different client ID.");
    }

    if (initializedClientId === clientId && initialization) {
      return initialization;
    }

    if (!initialization) {
      initialization = loadApi()
        .then((api) => {
          api.initialize({
            auto_select: false,
            callback: (response) => {
              if (response.credential) {
                activeCredentialHandler?.(response.credential);
              }
            },
            cancel_on_tap_outside: true,
            client_id: clientId,
            context: "signin",
            itp_support: true
          });
          initializedClientId = clientId;
          return api;
        })
        .catch((error) => {
          initialization = null;
          throw error;
        });
    }

    const api = await initialization;
    if (initializedClientId !== clientId) {
      throw new Error("Google Identity Services client ID mismatch.");
    }
    return api;
  };

  return {
    initialize,
    async promptOneTap(clientId: string) {
      const api = await initialize(clientId);
      if (oneTapPrompted) return false;
      oneTapPrompted = true;
      try {
        api.prompt();
        return true;
      } catch (error) {
        oneTapPrompted = false;
        throw error;
      }
    },
    setCredentialHandler(handler: (credential: string) => void) {
      activeCredentialHandler = handler;
      return () => {
        if (activeCredentialHandler === handler) {
          activeCredentialHandler = null;
        }
      };
    }
  };
};
