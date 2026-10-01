import { cn } from '@/lib/utils';

/** "Activo" / "Inactivo" pill (dot + word) for catalog records such as cursos and planteles. */
export function EstadoActivoBadge({ activo, className }: { activo: boolean; className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                activo ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'bg-muted text-muted-foreground',
                className,
            )}
        >
            <span className={cn('size-1.5 rounded-full', activo ? 'bg-emerald-500' : 'bg-muted-foreground/60')} aria-hidden="true" />
            {activo ? 'Activo' : 'Inactivo'}
        </span>
    );
}
