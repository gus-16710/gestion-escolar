import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const ESTADOS_GRUPO: Record<string, string> = {
    planeado: 'Planeado',
    en_curso: 'En curso',
    concluido: 'Concluido',
    cancelado: 'Cancelado',
};

export const TURNOS: Record<string, string> = {
    matutino: 'Matutino',
    vespertino: 'Vespertino',
    sabatino: 'Sabatino',
    dominical: 'Dominical',
};

/** Status colors (dot + tinted pill); the label is always written, so color is never the only cue. */
const ESTILO_ESTADO: Record<string, { pill: string; dot: string }> = {
    en_curso: {
        pill: 'border-emerald-600/25 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/30 dark:text-emerald-300',
        dot: 'bg-emerald-500',
    },
    planeado: { pill: 'border-sky-600/25 bg-sky-500/10 text-sky-800 dark:border-sky-400/30 dark:text-sky-300', dot: 'bg-sky-500' },
    concluido: { pill: 'border-border bg-muted text-muted-foreground', dot: 'bg-muted-foreground/60' },
    cancelado: { pill: 'border-red-600/25 bg-red-500/10 text-red-800 dark:border-red-400/30 dark:text-red-300', dot: 'bg-red-500' },
};

export function EstadoGrupoBadge({ estado, className }: { estado: string; className?: string }) {
    const estilo = ESTILO_ESTADO[estado] ?? ESTILO_ESTADO.concluido;

    return (
        <Badge variant="outline" className={cn('gap-1.5 rounded-full font-medium', estilo.pill, className)}>
            <span className={cn('size-1.5 rounded-full', estilo.dot)} aria-hidden="true" />
            {ESTADOS_GRUPO[estado] ?? estado}
        </Badge>
    );
}

interface Horario {
    turno: string;
    dias: string | null;
    hora_inicio: string | null;
    hora_fin: string | null;
}

/** "Sabatino · Sáb · 09:00–14:00" */
export function describirHorario({ turno, dias, hora_inicio, hora_fin }: Horario): string {
    const horas = hora_inicio && hora_fin ? `${hora_inicio}–${hora_fin}` : hora_inicio;

    return [TURNOS[turno] ?? turno, dias?.replaceAll(',', ', '), horas].filter(Boolean).join(' · ');
}

/** "Dom · 09:00–12:00": the days and hours, without the turno. */
export function describirDiasYHoras({ dias, hora_inicio, hora_fin }: Omit<Horario, 'turno'>): string {
    const horas = hora_inicio && hora_fin ? `${hora_inicio}–${hora_fin}` : hora_inicio;

    return [dias?.replaceAll(',', ', '), horas].filter(Boolean).join(' · ') || 'Sin horario';
}

/** "12 / 20" or "12" when the grupo has no cupo. */
export function describirOcupacion(inscritos: number, cupo: number | null): string {
    return cupo ? `${inscritos} / ${cupo}` : String(inscritos);
}
