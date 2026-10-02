import { useEffect, useRef } from 'react';

interface TurnstileApi {
    render: (contenedor: HTMLElement, opciones: Record<string, unknown>) => string;
    reset: (id: string) => void;
    remove: (id: string) => void;
}

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let carga: Promise<void> | null = null;

/** Loads Cloudflare's script once per page, however many times the widget mounts. */
function cargarScript(): Promise<void> {
    if (window.turnstile) return Promise.resolve();

    carga ??= new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = SCRIPT;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
            carga = null;
            reject(new Error('No se pudo cargar Turnstile'));
        };
        document.head.appendChild(script);
    });

    return carga;
}

/**
 * Cloudflare Turnstile's "no soy un robot" check. It reports the token (or null when it expires or fails);
 * bump `reinicio` to get a fresh token, since each one can be used only once.
 */
export function Turnstile({ siteKey, onToken, reinicio = 0 }: { siteKey: string; onToken: (token: string | null) => void; reinicio?: number }) {
    const contenedor = useRef<HTMLDivElement>(null);
    const widget = useRef<string | null>(null);
    const alCambiar = useRef(onToken);
    alCambiar.current = onToken;

    useEffect(() => {
        let vigente = true;

        cargarScript()
            .then(() => {
                if (!vigente || !contenedor.current || !window.turnstile) return;

                widget.current = window.turnstile.render(contenedor.current, {
                    sitekey: siteKey,
                    language: 'es',
                    size: 'flexible',
                    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
                    callback: (token: string) => alCambiar.current(token),
                    'expired-callback': () => alCambiar.current(null),
                    'error-callback': () => alCambiar.current(null),
                });
            })
            .catch(() => alCambiar.current(null));

        return () => {
            vigente = false;

            if (widget.current && window.turnstile) {
                window.turnstile.remove(widget.current);
                widget.current = null;
            }
        };
    }, [siteKey]);

    useEffect(() => {
        if (reinicio > 0 && widget.current && window.turnstile) {
            window.turnstile.reset(widget.current);
            alCambiar.current(null);
        }
    }, [reinicio]);

    return <div ref={contenedor} className="min-h-[65px]" />;
}
