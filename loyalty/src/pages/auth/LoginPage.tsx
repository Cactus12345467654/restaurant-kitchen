import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  loginWithGoogle,
  loginWithDev,
  loadGoogleIdentityScript,
  GOOGLE_CLIENT_ID,
} from "@/auth/service";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Read ?next= redirect param
  const next = new URLSearchParams(window.location.search).get("next") ?? "/loyalty";

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    loadGoogleIdentityScript()
      .then(() => {
        window.google?.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response: { credential: string }) => {
            setLoading(true);
            setError(null);
            try {
              await loginWithGoogle(response.credential, queryClient);
              setLocation(next);
            } catch (err: unknown) {
              setError(err instanceof Error ? err.message : "Pierakstīšanās neizdevās");
            } finally {
              setLoading(false);
            }
          },
        });

        if (buttonRef.current) {
          window.google?.accounts.id.renderButton(buttonRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "pill",
            width: 280,
            locale: "lv",
          });
        }
      })
      .catch(() => setError("Neizdevās ielādēt Google autentifikāciju"));
  }, [queryClient, next, setLocation]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">

      {/* Brand */}
      <div className="mb-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-3xl font-bold select-none">L</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Loyalty</h1>
        <p className="text-gray-500 text-sm mt-1">Tavi bonuss punkti un piedāvājumi</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col items-center gap-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">Laipni lūgti</h2>
          <p className="text-sm text-gray-500 mt-1">
            Pierakstieties, lai skatītu savus punktus un piedāvājumus
          </p>
        </div>

        {/* Google button or dev fallback */}
        {!GOOGLE_CLIENT_ID && import.meta.env.DEV ? (
          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                await loginWithDev(queryClient);
                setLocation(next);
              } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Pierakstīšanās neizdevās");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full max-w-[280px] py-3 px-4 rounded-full border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 font-medium text-sm transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            Enter in development mode
          </button>
        ) : !GOOGLE_CLIENT_ID ? (
          <p className="text-xs text-red-500 text-center">
            Google autentifikācija nav konfigurēta (VITE_GOOGLE_CLIENT_ID)
          </p>
        ) : (
          <div
            ref={buttonRef}
            className={loading ? "opacity-50 pointer-events-none" : ""}
          />
        )}

        {loading && (
          <p className="text-sm text-gray-400 animate-pulse">Pierakstās...</p>
        )}

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-8 text-center max-w-xs">
        Turpinot, jūs piekrītat mūsu noteikumiem un privātuma politikai.
      </p>
    </div>
  );
}
