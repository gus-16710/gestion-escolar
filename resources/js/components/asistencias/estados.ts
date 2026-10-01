import { Check, Clock, FileCheck2, X, type LucideIcon } from 'lucide-react';

export type EstadoAsistencia = 'presente' | 'retardo' | 'falta' | 'justificada';

interface EstiloEstado {
    etiqueta: string;
    icono: LucideIcon;
    /** Selected button / solid badge. */
    solido: string;
    /** Tinted chip (counters, history). */
    suave: string;
    /** Small dot or bar segment. */
    punto: string;
}

/**
 * Attendance states with their status colors, shared by the roll call and the alumno dashboard.
 * Every use also writes the label (or shows the icon with an aria-label), so color is never the only cue.
 */
export const ESTADOS_ASISTENCIA: Record<EstadoAsistencia, EstiloEstado> = {
    presente: {
        etiqueta: 'Presente',
        icono: Check,
        solido: 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:border-emerald-500',
        suave: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
        punto: 'bg-emerald-500',
    },
    retardo: {
        etiqueta: 'Retardo',
        icono: Clock,
        solido: 'bg-amber-500 text-white border-amber-500',
        suave: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
        punto: 'bg-amber-500',
    },
    falta: {
        etiqueta: 'Falta',
        icono: X,
        solido: 'bg-red-600 text-white border-red-600 dark:bg-red-500 dark:border-red-500',
        suave: 'bg-red-500/10 text-red-800 dark:text-red-300',
        punto: 'bg-red-500',
    },
    justificada: {
        etiqueta: 'Justificada',
        icono: FileCheck2,
        solido: 'bg-sky-600 text-white border-sky-600 dark:bg-sky-500 dark:border-sky-500',
        suave: 'bg-sky-500/10 text-sky-800 dark:text-sky-300',
        punto: 'bg-sky-500',
    },
};

export const ORDEN_ESTADOS: EstadoAsistencia[] = ['presente', 'retardo', 'falta', 'justificada'];
