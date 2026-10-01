import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatFecha(fecha: string): string {
    const [year, month, day] = fecha.split('-').map(Number);

    return new Intl.DateTimeFormat('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date(year, month - 1, day));
}

/** 2281234567 → "228 123 4567"; anything else is shown as typed. */
export function formatTelefono(telefono: string): string {
    const digitos = telefono.replace(/\D/g, '');

    return digitos.length === 10 ? `${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}` : telefono;
}

/** "hace 5 minutos", "hace 3 días": how long ago an ISO date-time was. */
export function haceTiempo(iso: string): string {
    const segundos = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    const formato = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
    const unidades: [Intl.RelativeTimeFormatUnit, number][] = [
        ['year', 31_536_000],
        ['month', 2_592_000],
        ['day', 86_400],
        ['hour', 3_600],
        ['minute', 60],
    ];

    for (const [unidad, tamano] of unidades) {
        if (Math.abs(segundos) >= tamano) {
            return formato.format(Math.round(segundos / tamano), unidad);
        }
    }

    return 'hace un momento';
}
