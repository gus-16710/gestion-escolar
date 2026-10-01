import { Link } from '@inertiajs/react';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

/** Header of a create/edit page: back link, icon, an optional overline, the title and a short explanation. */
export function EncabezadoFormulario({
    volverA,
    volverEtiqueta,
    icono: Icono,
    antetitulo,
    titulo,
    descripcion,
}: {
    volverA: string;
    volverEtiqueta: string;
    icono: LucideIcon;
    antetitulo?: ReactNode;
    titulo: ReactNode;
    descripcion?: ReactNode;
}) {
    return (
        <div className="flex items-center gap-3">
            <Link
                href={volverA}
                className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                aria-label={volverEtiqueta}
            >
                <ArrowLeft className="size-4" />
            </Link>
            <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                <Icono className="size-5" />
            </div>
            <div className="min-w-0">
                {antetitulo && <p className="text-muted-foreground text-sm">{antetitulo}</p>}
                <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl leading-tight font-semibold tracking-tight">{titulo}</h1>
                {descripcion && <p className="text-muted-foreground text-sm">{descripcion}</p>}
            </div>
        </div>
    );
}
