import { CursoTarjeta, mesesAprox, SEMANAS_POR_MES } from '@/components/cursos/curso-tarjeta';
import { PlanEstudiosField, type ModuloForm } from '@/components/cursos/plan-estudios-field';
import { OpcionTarjeta, Seccion } from '@/components/form-seccion';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { AlertTriangle, BookOpen, Building2, CircleCheck, CircleOff, Clock, ListOrdered, LoaderCircle, Lock, Power, Sparkles } from 'lucide-react';
import { FormEventHandler, useRef, type ReactNode } from 'react';

// A type alias (not an interface) so it satisfies Inertia's FormDataType index signature.
export type CursoFormData = {
    nombre: string;
    clave: string;
    descripcion: string;
    duracion_semanas: string;
    activo: boolean;
    /** Ids (as strings) of the planteles that offer the curso. */
    planteles: string[];
    /** The study plan, in teaching order. */
    modulos: ModuloForm[];
};

export interface PlantelOpcion {
    id: string;
    nombre: string;
    clave: string;
    activo: boolean;
    /** Planned or running grupos of this curso at the plantel; while > 0 it can't stop offering it. */
    grupos_activos: number;
}

export const emptyCurso: CursoFormData = {
    nombre: '',
    clave: '',
    descripcion: '',
    duracion_semanas: '',
    activo: true,
    planteles: [],
    modulos: [],
};

const MAX_DESCRIPCION = 2000;

/** Common lengths, picked in months and stored in weeks. */
const DURACIONES_MESES = [3, 6, 8, 12, 15, 18, 24];

/** Words skipped when suggesting a clave ("Auxiliar de Enfermería" → AUX, "Inglés" → ING). */
const PALABRAS_VACIAS = new Set(['DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'Y', 'E', 'EN', 'PARA', 'CON', 'A']);

/** A short clave from the name that no other curso uses: first 3 letters, then initials, then a number. */
export function sugerirClave(nombre: string, usadas: Record<string, string>): string {
    const palabras = nombre
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((palabra) => palabra && !PALABRAS_VACIAS.has(palabra));

    if (palabras.length === 0) return '';

    const base = palabras[0].slice(0, 3);
    const candidatas = [
        base,
        palabras.length > 1
            ? palabras
                  .slice(0, 3)
                  .map((palabra) => palabra[0])
                  .join('')
            : '',
        palabras[0].slice(0, 4),
    ];
    const libre = candidatas.find((clave) => clave.length >= 2 && !(clave in usadas));

    if (libre) return libre;

    for (let n = 2; n < 100; n++) {
        if (!(`${base}${n}` in usadas)) return `${base}${n}`;
    }

    return base;
}

interface CursoFormProps {
    data: CursoFormData;
    setData: <K extends keyof CursoFormData>(key: K, value: CursoFormData[K]) => void;
    // Includes nested keys such as "modulos.0.nombre".
    errors: Partial<Record<string, string>>;
    planteles: PlantelOpcion[];
    /** Claves of the other cursos, keyed to their name. */
    clavesUsadas: Record<string, string>;
    processing: boolean;
    onSubmit: FormEventHandler;
    submitLabel: string;
    /** When creating, the clave follows the name until it is edited by hand. */
    sugerirClaveAutomatica?: boolean;
    /** Extra block in the side column (e.g. the curso's current grupos when editing). */
    complemento?: ReactNode;
}

export function CursoForm({
    data,
    setData,
    errors,
    planteles,
    clavesUsadas,
    processing,
    onSubmit,
    submitLabel,
    sugerirClaveAutomatica = false,
    complemento,
}: CursoFormProps) {
    const claveManual = useRef(!sugerirClaveAutomatica || data.clave !== '');
    const clave = data.clave.trim().toUpperCase();
    const claveOcupadaPor = clave ? clavesUsadas[clave] : undefined;
    const semanas = Number(data.duracion_semanas) || null;
    const seleccionados = planteles.filter((plantel) => data.planteles.includes(plantel.id));

    const cambiarNombre = (nombre: string) => {
        setData('nombre', nombre);

        if (!claveManual.current) {
            setData('clave', sugerirClave(nombre, clavesUsadas));
        }
    };

    const cambiarClave = (valor: string) => {
        // Clearing it hands the clave back to the suggestion.
        claveManual.current = valor !== '';
        setData('clave', valor.toUpperCase());
    };

    const alternarPlantel = (plantel: PlantelOpcion) => {
        setData(
            'planteles',
            data.planteles.includes(plantel.id) ? data.planteles.filter((id) => id !== plantel.id) : [...data.planteles, plantel.id],
        );
    };

    const sugerencia = sugerirClave(data.nombre, clavesUsadas);

    return (
        <form onSubmit={onSubmit} className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="flex min-w-0 flex-col gap-6">
                <Seccion numero={1} icono={BookOpen} titulo="Datos del curso" descripcion="Cómo aparece en el catálogo y en los grupos.">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
                        <div className="grid content-start gap-2">
                            <Label htmlFor="nombre">Nombre</Label>
                            <Input
                                id="nombre"
                                value={data.nombre}
                                onChange={(e) => cambiarNombre(e.target.value)}
                                required
                                maxLength={255}
                                placeholder="Ej. Barbería"
                                autoFocus={sugerirClaveAutomatica}
                            />
                            <InputError message={errors.nombre} />
                        </div>

                        <div className="grid content-start gap-2">
                            <Label htmlFor="clave">Clave</Label>
                            <Input
                                id="clave"
                                value={data.clave}
                                onChange={(e) => cambiarClave(e.target.value)}
                                required
                                maxLength={10}
                                placeholder="BAR"
                                className="font-mono uppercase placeholder:font-sans"
                                aria-invalid={claveOcupadaPor ? true : undefined}
                                aria-describedby="clave-ayuda"
                            />
                            <div id="clave-ayuda" className="text-xs">
                                {claveOcupadaPor ? (
                                    <p className="text-destructive flex items-start gap-1">
                                        <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                                        Ya la usa {claveOcupadaPor}.
                                    </p>
                                ) : clave === '' && sugerencia ? (
                                    <button
                                        type="button"
                                        onClick={() => cambiarClave(sugerencia)}
                                        className="text-primary flex items-center gap-1 font-medium hover:underline"
                                    >
                                        <Sparkles className="size-3 shrink-0" />
                                        Usar {sugerencia}
                                    </button>
                                ) : (
                                    <p className="text-muted-foreground">Prefijo de las claves de sus grupos.</p>
                                )}
                            </div>
                            <InputError message={errors.clave} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-baseline justify-between gap-2">
                            <Label htmlFor="descripcion">
                                Descripción <span className="text-muted-foreground font-normal">(opcional)</span>
                            </Label>
                            <span
                                className={cn(
                                    'text-xs tabular-nums',
                                    data.descripcion.length > MAX_DESCRIPCION * 0.9 ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground',
                                )}
                            >
                                {data.descripcion.length}/{MAX_DESCRIPCION}
                            </span>
                        </div>
                        <Textarea
                            id="descripcion"
                            rows={4}
                            maxLength={MAX_DESCRIPCION}
                            value={data.descripcion}
                            onChange={(e) => setData('descripcion', e.target.value)}
                            placeholder="Qué aprende el alumno, perfil de egreso, requisitos..."
                        />
                        <InputError message={errors.descripcion} />
                    </div>
                </Seccion>

                <Seccion numero={2} icono={Clock} titulo="Duración" descripcion="Se usa para calcular la fecha de fin y el avance de cada grupo.">
                    <div className="space-y-2">
                        <p className="text-sm font-medium" id="duracion-rapida">
                            Elige en meses
                        </p>
                        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="duracion-rapida">
                            {DURACIONES_MESES.map((meses) => {
                                const valor = Math.round(meses * SEMANAS_POR_MES);
                                const activa = semanas !== null && mesesAprox(semanas) === meses;

                                return (
                                    <button
                                        key={meses}
                                        type="button"
                                        aria-pressed={activa}
                                        onClick={() => setData('duracion_semanas', String(valor))}
                                        className={cn(
                                            'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                                            activa
                                                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                                : 'hover:border-primary/40 hover:bg-muted/40',
                                        )}
                                    >
                                        {meses} meses
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid gap-2 sm:max-w-xs">
                        <Label htmlFor="duracion_semanas">
                            O escribe las semanas <span className="text-muted-foreground font-normal">(opcional)</span>
                        </Label>
                        <div className="relative">
                            <Input
                                id="duracion_semanas"
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={520}
                                value={data.duracion_semanas}
                                onChange={(e) => setData('duracion_semanas', e.target.value)}
                                className="pr-20"
                                placeholder="Ej. 35"
                            />
                            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                                semanas
                            </span>
                        </div>
                        <p className="text-muted-foreground text-xs">
                            {semanas
                                ? `≈ ${mesesAprox(semanas)} ${mesesAprox(semanas) === 1 ? 'mes' : 'meses'} de clases.`
                                : 'Sin duración no se sugiere la fecha de fin de los grupos.'}
                        </p>
                        <InputError message={errors.duracion_semanas} />
                    </div>
                </Seccion>

                <Seccion
                    numero={3}
                    icono={ListOrdered}
                    titulo="Plan de estudios"
                    descripcion="Los módulos del curso en orden; cada uno termina con su evaluación."
                >
                    <PlanEstudiosField
                        modulos={data.modulos}
                        onChange={(modulos) => setData('modulos', modulos)}
                        duracionCurso={semanas}
                        onUsarComoDuracion={(total) => setData('duracion_semanas', String(total))}
                        errors={errors}
                    />
                </Seccion>

                <Seccion
                    numero={4}
                    icono={Building2}
                    titulo="¿Dónde se imparte?"
                    descripcion="Solo se pueden abrir grupos del curso en los planteles marcados."
                >
                    {planteles.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Todavía no hay planteles registrados.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2" role="group" aria-label="Planteles que imparten el curso">
                            {planteles.map((plantel) => {
                                const marcado = data.planteles.includes(plantel.id);
                                const bloqueado = marcado && plantel.grupos_activos > 0;

                                return (
                                    <OpcionTarjeta
                                        key={plantel.id}
                                        tipo="checkbox"
                                        seleccionada={marcado}
                                        disabled={bloqueado}
                                        onSelect={() => alternarPlantel(plantel)}
                                    >
                                        <div className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold">
                                            {plantel.clave}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="leading-snug font-medium">{plantel.nombre}</p>
                                            {bloqueado ? (
                                                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                                                    <Lock className="size-3 shrink-0" />
                                                    {plantel.grupos_activos} {plantel.grupos_activos === 1 ? 'grupo activo' : 'grupos activos'}: no se
                                                    puede quitar
                                                </p>
                                            ) : (
                                                !plantel.activo && <p className="text-xs text-amber-700 dark:text-amber-300">Plantel inactivo</p>
                                            )}
                                        </div>
                                    </OpcionTarjeta>
                                );
                            })}
                        </div>
                    )}
                    {seleccionados.length === 0 && planteles.length > 0 && (
                        <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                            Sin plantel, el curso queda en el catálogo pero no se pueden abrir grupos.
                        </p>
                    )}
                    <InputError message={errors.planteles} />
                </Seccion>

                <Seccion numero={5} icono={Power} titulo="Disponibilidad" descripcion="Desactívalo cuando la escuela deje de ofrecerlo.">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2" role="radiogroup" aria-label="Disponibilidad del curso">
                        <OpcionTarjeta seleccionada={data.activo} onSelect={() => setData('activo', true)}>
                            <CircleCheck className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <div>
                                <p className="font-medium">Activo</p>
                                <p className="text-muted-foreground text-xs">Se pueden abrir grupos nuevos.</p>
                            </div>
                        </OpcionTarjeta>
                        <OpcionTarjeta seleccionada={!data.activo} onSelect={() => setData('activo', false)}>
                            <CircleOff className="text-muted-foreground size-5 shrink-0" />
                            <div>
                                <p className="font-medium">Inactivo</p>
                                <p className="text-muted-foreground text-xs">Ya no se ofrece; sus grupos actuales siguen igual.</p>
                            </div>
                        </OpcionTarjeta>
                    </div>
                    <InputError message={errors.activo} />
                </Seccion>

                {/* Phones and tablets: actions at the end of the form (on wide screens they live in the side column). */}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end xl:hidden">
                    <Button variant="outline" type="button" asChild>
                        <Link href={route('cursos.index')}>Cancelar</Link>
                    </Button>
                    <Button disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        {submitLabel}
                    </Button>
                </div>
            </div>

            <aside className={cn('order-first flex flex-col gap-6 xl:sticky xl:top-6 xl:order-none', !complemento && 'hidden xl:flex')}>
                <Card className="hidden gap-0 overflow-hidden p-0 xl:flex xl:flex-col">
                    <div className="bg-muted/40 border-b px-5 py-3">
                        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Así se verá en el catálogo</p>
                    </div>
                    <div className="p-4">
                        <CursoTarjeta
                            curso={{
                                nombre: data.nombre,
                                clave: clave,
                                descripcion: data.descripcion || null,
                                duracion_semanas: semanas,
                                activo: data.activo,
                                planteles: seleccionados,
                                modulos: data.modulos
                                    .filter((modulo) => modulo.nombre.trim())
                                    .map((modulo) => ({ nombre: modulo.nombre, duracion_semanas: Number(modulo.duracion_semanas) || 0 })),
                            }}
                            className="hover:shadow-none"
                        />
                    </div>
                    <div className="flex flex-col gap-2 border-t p-5">
                        <Button disabled={processing} className="w-full">
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            {submitLabel}
                        </Button>
                        <Button variant="ghost" type="button" asChild className="w-full">
                            <Link href={route('cursos.index')}>Cancelar</Link>
                        </Button>
                    </div>
                </Card>
                {complemento}
            </aside>
        </form>
    );
}
