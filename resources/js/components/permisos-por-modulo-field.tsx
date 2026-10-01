import InputError from '@/components/input-error';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    conNivelEnModulo,
    etiquetaNivel,
    etiquetaPermiso,
    nivelEnModulo,
    permisosPorModulo,
    type ModuloPermisos,
    type NivelPermiso,
} from '@/lib/permisos';
import { cn } from '@/lib/utils';

interface PermisosPorModuloFieldProps {
    /** Every permission that exists. */
    permisos: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    error?: string;
    /** Show the selection without letting it change (the Admin role always has everything). */
    soloLectura?: boolean;
}

/** Always three slots (no access, view, manage) so the options line up in columns; a level the module lacks is null. */
function nivelesDe(modulo: ModuloPermisos): (NivelPermiso | null)[] {
    return ['ninguno', modulo.ver ? 'ver' : null, modulo.gestionar ? 'gestionar' : null];
}

/** Role permissions as one row per module with a "Sin acceso / Ver / Gestionar" switch (managing includes seeing). */
export function PermisosPorModuloField({ permisos, selected, onChange, error, soloLectura = false }: PermisosPorModuloFieldProps) {
    const { modulos, otros } = permisosPorModulo(permisos);

    return (
        <div className="grid gap-3">
            <ul className="divide-y rounded-xl border">
                {modulos.map((modulo) => {
                    const actual = nivelEnModulo(modulo, selected);

                    return (
                        <li key={modulo.modulo} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                                    {modulo.modulo}
                                    {modulo.proximamente && (
                                        <span className="text-muted-foreground rounded-full border px-1.5 py-px text-[10px] font-normal">
                                            Próximamente
                                        </span>
                                    )}
                                </p>
                                {modulo.nota && <p className="text-muted-foreground text-xs">{modulo.nota}</p>}
                            </div>
                            <div
                                className="bg-muted/60 grid shrink-0 grid-cols-3 rounded-lg p-0.5 sm:w-72"
                                role="radiogroup"
                                aria-label={`Acceso a ${modulo.modulo}`}
                            >
                                {nivelesDe(modulo).map((nivel, posicion) => {
                                    if (nivel === null) {
                                        return <span key={posicion} aria-hidden="true" />;
                                    }

                                    const activo = actual === nivel;

                                    return (
                                        <button
                                            key={nivel}
                                            type="button"
                                            role="radio"
                                            aria-checked={activo}
                                            disabled={soloLectura}
                                            onClick={() => onChange(conNivelEnModulo(modulo, selected, nivel))}
                                            className={cn(
                                                'rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap transition-colors',
                                                activo
                                                    ? nivel === 'ninguno'
                                                        ? 'bg-background text-foreground shadow-sm'
                                                        : nivel === 'ver'
                                                          ? 'bg-primary/15 text-primary ring-primary/30 shadow-sm ring-1'
                                                          : 'bg-primary text-primary-foreground shadow-sm'
                                                    : 'text-muted-foreground enabled:hover:text-foreground',
                                                soloLectura && 'cursor-not-allowed',
                                            )}
                                        >
                                            {etiquetaNivel(modulo, nivel)}
                                        </button>
                                    );
                                })}
                            </div>
                        </li>
                    );
                })}
            </ul>

            {otros.length > 0 && (
                <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
                    <p className="text-muted-foreground text-xs sm:col-span-2">Otros permisos</p>
                    {otros.map((permiso) => (
                        <div key={permiso} className="flex items-center gap-2">
                            <Checkbox
                                id={`permiso-${permiso}`}
                                checked={selected.includes(permiso)}
                                disabled={soloLectura}
                                onCheckedChange={(checked) =>
                                    onChange(checked === true ? [...selected, permiso] : selected.filter((item) => item !== permiso))
                                }
                            />
                            <Label htmlFor={`permiso-${permiso}`} className="font-normal">
                                {etiquetaPermiso(permiso)}
                            </Label>
                        </div>
                    ))}
                </div>
            )}

            <InputError message={error} />
        </div>
    );
}
