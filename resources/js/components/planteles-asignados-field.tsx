import { OpcionTarjeta } from '@/components/form-seccion';
import InputError from '@/components/input-error';

export interface PlantelOpcion {
    id: number;
    nombre: string;
    clave: string;
    activo: boolean;
    /** Other directors who already run it. */
    directores: string[];
}

interface PlantelesAsignadosFieldProps {
    planteles: PlantelOpcion[];
    /** Selected plantel ids, as strings. */
    selected: string[];
    onChange: (selected: string[]) => void;
    error?: string;
}

/** Planteles a Director is in charge of, as selectable cards; their dashboard and listings show only these. */
export function PlantelesAsignadosField({ planteles, selected, onChange, error }: PlantelesAsignadosFieldProps) {
    const alternar = (id: string) => onChange(selected.includes(id) ? selected.filter((otro) => otro !== id) : [...selected, id]);

    return (
        <div className="space-y-3">
            {planteles.length === 0 ? (
                <p className="text-muted-foreground text-sm">Todavía no hay planteles registrados.</p>
            ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2" role="group" aria-label="Planteles que dirige">
                    {planteles.map((plantel) => {
                        const id = String(plantel.id);

                        return (
                            <OpcionTarjeta key={plantel.id} tipo="checkbox" seleccionada={selected.includes(id)} onSelect={() => alternar(id)}>
                                <div className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold">
                                    {plantel.clave}
                                </div>
                                <div className="min-w-0">
                                    <p className="leading-snug font-medium">{plantel.nombre}</p>
                                    {!plantel.activo && <p className="text-xs text-amber-700 dark:text-amber-300">Plantel inactivo</p>}
                                    {plantel.directores.length > 0 && (
                                        <p className="text-muted-foreground text-xs">También lo dirige {plantel.directores.join(', ')}</p>
                                    )}
                                </div>
                            </OpcionTarjeta>
                        );
                    })}
                </div>
            )}
            <InputError message={error} />
        </div>
    );
}
