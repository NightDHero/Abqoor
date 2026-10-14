export type GoogleCredentialResponse = { credential?: string };

export type GoogleIdentityApi = {
  initialize: (options: {
    callback: (response: GoogleCredentialResponse) => void;
    client_id: string;
  }) => void;
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
            callback: (response) => {
              if (response.credential) {
                activeCredentialHandler?.(response.credential);
              }
            },
            client_id: clientId
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
