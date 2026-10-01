import { etiquetaNivel, etiquetaPermiso, MODULOS_PERMISOS, nivelEnModulo, permisosPorModulo, type NivelPermiso } from '@/lib/permisos';
import { cn } from '@/lib/utils';
import { GraduationCap, Shield, ShieldCheck, UserCog, UserRound, type LucideIcon } from 'lucide-react';

const ICONOS_ROL: Record<string, LucideIcon> = {
    Admin: ShieldCheck,
    Director: UserCog,
    Profesor: UserRound,
    Alumno: GraduationCap,
};

/** The role's icon in a tinted square; custom roles get a plain shield. */
export function IconoRol({ nombre, className }: { nombre: string; className?: string }) {
    const Icono = ICONOS_ROL[nombre] ?? Shield;

    return (
        <div className={cn('bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl', className)}>
            <Icono className="size-5" />
        </div>
    );
}

/** A level as a pill: solid for managing, tinted for viewing, a dash for no access. */
export function NivelChip({ nivel, etiqueta, className }: { nivel: NivelPermiso; etiqueta: string; className?: string }) {
    if (nivel === 'ninguno') {
        return (
            <span className={cn('text-muted-foreground', className)} aria-label="Sin acceso">
                —
            </span>
        );
    }

    return (
        <span
            className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                nivel === 'gestionar' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
                className,
            )}
        >
            {etiqueta}
        </span>
    );
}

/**
 * What a set of permissions allows, one line per module with access ("Alumnos · Gestionar"), plus any permission
 * outside the known modules. Used on the role cards and as the "lo que podrá hacer" preview of the forms.
 */
export function ResumenPermisos({ permisos, vacio = 'Sin permisos todavía.' }: { permisos: string[]; vacio?: string }) {
    const conAcceso = MODULOS_PERMISOS.map((modulo) => ({ modulo, nivel: nivelEnModulo(modulo, permisos) })).filter(
        ({ nivel }) => nivel !== 'ninguno',
    );
    const { otros } = permisosPorModulo(permisos);

    if (conAcceso.length === 0 && otros.length === 0) {
        return <p className="text-muted-foreground text-sm">{vacio}</p>;
    }

    return (
        <ul className="space-y-1.5">
            {conAcceso.map(({ modulo, nivel }) => (
                <li key={modulo.modulo} className="flex items-center justify-between gap-2 text-sm">
                    <span className={cn('truncate', modulo.proximamente && 'text-muted-foreground')}>{modulo.modulo}</span>
                    <NivelChip nivel={nivel} etiqueta={etiquetaNivel(modulo, nivel)} />
                </li>
            ))}
            {otros.map((permiso) => (
                <li key={permiso} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{etiquetaPermiso(permiso)}</span>
                    <NivelChip nivel="ver" etiqueta="Sí" />
                </li>
            ))}
        </ul>
    );
}
