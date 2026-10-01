import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowDown, ArrowUp, ListOrdered, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/** One module as the form edits it; `clave_local` only gives new rows a stable React key. */
export type ModuloForm = {
    id: number | null;
    clave_local: string;
    nombre: string;
    duracion_semanas: string;
    descripcion: string;
};

let siguienteClave = 0;

export function nuevoModulo(datos: Partial<ModuloForm> = {}): ModuloForm {
    siguienteClave += 1;

    return { id: null, clave_local: `nuevo-${siguienteClave}`, nombre: '', duracion_semanas: '', descripcion: '', ...datos };
}

interface PlanEstudiosFieldProps {
    modulos: ModuloForm[];
    onChange: (modulos: ModuloForm[]) => void;
    /** The curso's total length, to compare with the sum of the modules. */
    duracionCurso: number | null;
    onUsarComoDuracion: (semanas: number) => void;
    /** Validation errors keyed like "modulos.0.nombre". */
    errors: Record<string, string | undefined>;
}

/** The study plan: modules in order, each with its weeks, reorderable, with a running total against the curso's length. */
export function PlanEstudiosField({ modulos, onChange, duracionCurso, onUsarComoDuracion, errors }: PlanEstudiosFieldProps) {
    const [enfocar, setEnfocar] = useState<string | null>(null);
    const [conDescripcion, setConDescripcion] = useState<Set<string>>(
        () => new Set(modulos.filter((modulo) => modulo.descripcion).map((modulo) => modulo.clave_local)),
    );
    const refs = useRef(new Map<string, HTMLInputElement>());
    const total = modulos.reduce((suma, modulo) => suma + (Number(modulo.duracion_semanas) || 0), 0);
    const descuadre = modulos.length > 0 && duracionCurso !== null && total !== duracionCurso;

    useEffect(() => {
        if (enfocar) {
            refs.current.get(enfocar)?.focus();
            setEnfocar(null);
        }
    }, [enfocar]);

    const cambiar = (indice: number, campo: keyof ModuloForm, valor: string) =>
        onChange(modulos.map((modulo, i) => (i === indice ? { ...modulo, [campo]: valor } : modulo)));

    const mover = (indice: number, hacia: -1 | 1) => {
        const destino = indice + hacia;

        if (destino < 0 || destino >= modulos.length) return;

        const siguiente = [...modulos];
        [siguiente[indice], siguiente[destino]] = [siguiente[destino], siguiente[indice]];
        onChange(siguiente);
    };

    const agregar = () => {
        const modulo = nuevoModulo();
        onChange([...modulos, modulo]);
        setEnfocar(modulo.clave_local);
    };

    const alternarDescripcion = (clave: string) =>
        setConDescripcion((actual) => {
            const siguiente = new Set(actual);

            if (siguiente.has(clave)) {
                siguiente.delete(clave);
            } else {
                siguiente.add(clave);
            }

            return siguiente;
        });

    return (
        <div className="space-y-4">
            {modulos.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center text-sm">
                    <ListOrdered className="size-6" />
                    Aún no tiene plan de estudios; puedes agregarlo ahora o después.
                </div>
            ) : (
                <ol className="space-y-2">
                    {modulos.map((modulo, indice) => {
                        const error = (campo: string) => errors[`modulos.${indice}.${campo}`];
                        const verDescripcion = conDescripcion.has(modulo.clave_local);

                        return (
                            <li key={modulo.clave_local} className="bg-muted/20 rounded-xl border p-3">
                                <div className="flex flex-wrap items-start gap-2 sm:flex-nowrap">
                                    <span className="bg-primary text-primary-foreground mt-1.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                                        {indice + 1}
                                    </span>
                                    <div className="min-w-0 flex-1 basis-40">
                                        <Input
                                            ref={(el) => {
                                                if (el) refs.current.set(modulo.clave_local, el);
                                                else refs.current.delete(modulo.clave_local);
                                            }}
                                            value={modulo.nombre}
                                            onChange={(e) => cambiar(indice, 'nombre', e.target.value)}
                                            placeholder={`Nombre del módulo ${indice + 1}`}
                                            aria-label={`Nombre del módulo ${indice + 1}`}
                                            maxLength={255}
                                            required
                                        />
                                    </div>
                                    <div className="relative w-28 shrink-0">
                                        <Input
                                            type="number"
                                            inputMode="numeric"
                                            min={1}
                                            max={520}
                                            value={modulo.duracion_semanas}
                                            onChange={(e) => cambiar(indice, 'duracion_semanas', e.target.value)}
                                            aria-label={`Semanas del módulo ${indice + 1}`}
                                            className="pr-11"
                                            required
                                        />
                                        <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">
                                            sem
                                        </span>
                                    </div>
                                    <div className="ml-auto flex shrink-0 items-center">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="size-9"
                                            disabled={indice === 0}
                                            onClick={() => mover(indice, -1)}
                                            aria-label={`Subir el módulo ${indice + 1}`}
                                        >
                                            <ArrowUp className="size-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="size-9"
                                            disabled={indice === modulos.length - 1}
                                            onClick={() => mover(indice, 1)}
                                            aria-label={`Bajar el módulo ${indice + 1}`}
                                        >
                                            <ArrowDown className="size-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive size-9"
                                            onClick={() => onChange(modulos.filter((_, i) => i !== indice))}
                                            aria-label={`Quitar el módulo ${indice + 1}`}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="pl-8">
                                    {verDescripcion ? (
                                        <Textarea
                                            value={modulo.descripcion}
                                            onChange={(e) => cambiar(indice, 'descripcion', e.target.value)}
                                            rows={2}
                                            maxLength={2000}
                                            placeholder="Temas que cubre (opcional)"
                                            aria-label={`Descripción del módulo ${indice + 1}`}
                                            className="mt-2"
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => alternarDescripcion(modulo.clave_local)}
                                            className="text-muted-foreground hover:text-foreground mt-1.5 text-xs font-medium hover:underline"
                                        >
                                            + Agregar descripción
                                        </button>
                                    )}
                                    <InputError
                                        message={error('nombre') ?? error('duracion_semanas') ?? error('descripcion') ?? error('id')}
                                        className="mt-1"
                                    />
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="outline" onClick={agregar}>
                    <Plus className="size-4" />
                    Agregar módulo
                </Button>
                {modulos.length > 0 && (
                    <p className={cn('text-sm tabular-nums', descuadre ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground')}>
                        {modulos.length} {modulos.length === 1 ? 'módulo' : 'módulos'} · {total}
                        {duracionCurso !== null ? ` de ${duracionCurso}` : ''} semanas
                    </p>
                )}
            </div>

            {descuadre && (
                <div className="flex flex-col gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between dark:text-amber-300">
                    <p className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        Los módulos suman {total} semanas y el curso dura {duracionCurso}.
                    </p>
                    {total > 0 && (
                        <button
                            type="button"
                            onClick={() => onUsarComoDuracion(total)}
                            className="shrink-0 text-left font-medium underline-offset-4 hover:underline"
                        >
                            Usar {total} semanas como duración
                        </button>
                    )}
                </div>
            )}

            <InputError message={errors.modulos} />
        </div>
    );
}
