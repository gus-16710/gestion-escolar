import { cn } from '@/lib/utils';
import { BookOpen, HeartPulse, Languages, type LucideIcon, Monitor, Scissors, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { type ReactNode } from 'react';

/** A photo of the public site (WelcomeController::imagen): WebP with a JPG fallback, and its size. */
export interface ImagenSitio {
    webp: string | null;
    jpg: string;
    ancho: number;
    alto: number;
}

export interface ModuloPublico {
    orden: number;
    nombre: string;
    descripcion: string | null;
    semanas: number;
}

export interface CursoPublico {
    id: number;
    clave: string;
    nombre: string;
    descripcion: string | null;
    duracion_semanas: number | null;
    modulos: ModuloPublico[];
    planteles: string[];
    proxima_apertura: string | null;
    imagen: ImagenSitio | null;
}

export interface PlantelPublico {
    id: number;
    nombre: string;
    direccion: string;
    localidad: string;
    telefono: string | null;
    email: string | null;
    cursos: { clave: string; nombre: string }[];
    imagen: ImagenSitio | null;
}

export interface AperturaPublica {
    id: number;
    curso: string;
    curso_clave: string;
    plantel: string;
    fecha_inicio: string;
    fecha_fin: string | null;
    horario: string;
    turno: string;
    cupo: number | null;
    lugares: number | null;
}

/** Each curso's look: an icon and an accent, by clave (unknown cursos fall back to the brand blue). */
const ESTILOS: Record<string, { icono: LucideIcon; acento: string; suave: string; degradado: string }> = {
    EST: { icono: Sparkles, acento: 'text-fuchsia-600 dark:text-fuchsia-400', suave: 'bg-fuchsia-500/10', degradado: 'from-fuchsia-500 to-pink-500' },
    BAR: { icono: Scissors, acento: 'text-amber-600 dark:text-amber-400', suave: 'bg-amber-500/10', degradado: 'from-amber-500 to-orange-500' },
    ENF: { icono: HeartPulse, acento: 'text-rose-600 dark:text-rose-400', suave: 'bg-rose-500/10', degradado: 'from-rose-500 to-red-500' },
    INF: { icono: Monitor, acento: 'text-sky-600 dark:text-sky-400', suave: 'bg-sky-500/10', degradado: 'from-sky-500 to-blue-600' },
    ING: { icono: Languages, acento: 'text-violet-600 dark:text-violet-400', suave: 'bg-violet-500/10', degradado: 'from-violet-500 to-indigo-500' },
};

export function estiloCurso(clave: string) {
    return ESTILOS[clave] ?? { icono: BookOpen, acento: 'text-primary', suave: 'bg-primary/10', degradado: 'from-sky-500 to-blue-700' };
}

/** Study length in months for people: the catalog stores weeks (4.345 per month, as in the curso form). */
export function duracionLegible(semanas: number | null): string | null {
    if (!semanas) return null;

    const meses = Math.round(semanas / 4.345);

    return meses >= 2 ? `${meses} meses` : `${semanas} semanas`;
}

/** WhatsApp link with the message already written, or the planteles section while there's no number. */
export function enlaceInformes(whatsapp: string | null, mensaje: string): { href: string; externo: boolean } {
    return whatsapp
        ? { href: `https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`, externo: true }
        : { href: '#planteles', externo: false };
}

/** A site photo: WebP where supported, JPG otherwise; its size reserves the space so nothing jumps while it loads. */
export function Imagen({ imagen, alt, className, prioridad = false }: { imagen: ImagenSitio; alt: string; className?: string; prioridad?: boolean }) {
    return (
        <picture>
            {imagen.webp && <source srcSet={imagen.webp} type="image/webp" />}
            <img
                src={imagen.jpg}
                alt={alt}
                width={imagen.ancho}
                height={imagen.alto}
                loading={prioridad ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={prioridad ? 'high' : undefined}
                className={className}
            />
        </picture>
    );
}

/** WhatsApp's mark (lucide has no brand icons). */
export function IconoWhatsApp({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={cn('size-4', className)}>
            <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88a9.83 9.83 0 0 1 7 2.9 9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.9 9.88m8.41-18.3A11.81 11.81 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.41" />
        </svg>
    );
}

/** Section heading: small label, title and lead text, revealed on scroll. */
export function EncabezadoSeccion({
    etiqueta,
    titulo,
    texto,
    centrado = true,
}: {
    etiqueta: string;
    titulo: ReactNode;
    texto?: string;
    centrado?: boolean;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className={cn('max-w-2xl', centrado && 'mx-auto text-center')}
        >
            <p className="text-primary text-sm font-semibold tracking-wider uppercase">{etiqueta}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{titulo}</h2>
            {texto && <p className="text-muted-foreground mt-4 text-base text-pretty sm:text-lg">{texto}</p>}
        </motion.div>
    );
}

/** Fades content in as it scrolls into view. */
export function Aparecer({ children, retraso = 0, className }: { children: ReactNode; retraso?: number; className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, delay: retraso, ease: 'easeOut' }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
