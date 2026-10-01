import { OpcionTarjeta, Seccion } from '@/components/form-seccion';
import { describirDiasYHoras, EstadoGrupoBadge, ESTADOS_GRUPO, TURNOS } from '@/components/grupos/grupo-labels';
import InputError from '@/components/input-error';
import { PersonaAvatar } from '@/components/persona-avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatFecha } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { Building2, CalendarDays, Clock, GraduationCap, LoaderCircle, Sparkles, UserRound, Users, type LucideIcon } from 'lucide-react';
import { FormEventHandler, useMemo, useRef } from 'react';

// A type alias (not an interface) so it satisfies Inertia's FormDataType index signature.
export type GrupoFormData = {
    plantel_id: string;
    curso_id: string;
    profesor_id: string;
    clave: string;
    turno: string;
    dias: string[];
    hora_inicio: string;
    hora_fin: string;
    fecha_inicio: string;
    fecha_fin: string;
    cupo: string;
    estado: string;
};

export const emptyGrupo: GrupoFormData = {
    plantel_id: '',
    curso_id: '',
    profesor_id: '',
    clave: '',
    turno: '',
    dias: [],
    hora_inicio: '',
    hora_fin: '',
    fecha_inicio: '',
    fecha_fin: '',
    cupo: '',
    estado: 'planeado',
};

interface ProfesorOpcion {
    id: number;
    nombre_completo: string;
    especialidad: string | null;
    foto_url: string | null;
    /** Cursos this profesor already teaches (any grupo). */
    curso_ids: number[];
}

export interface GrupoFormOptions {
    planteles: { id: number; nombre: string; clave: string; curso_ids: number[] }[];
    cursos: { id: number; nombre: string; clave: string; duracion_semanas: number | null }[];
    profesores: ProfesorOpcion[];
    dias: string[];
    /** Every clave already used, to preview the one Grupo::siguienteClave() will assign. */
    clavesUsadas: string[];
}

const SIN_PROFESOR = 'none';

interface GrupoFormProps extends GrupoFormOptions {
    title: string;
    description: string;
    data: GrupoFormData;
    setData: <K extends keyof GrupoFormData>(key: K, value: GrupoFormData[K]) => void;
    errors: Partial<Record<keyof GrupoFormData, string>>;
    processing: boolean;
    cancelHref: string;
    submitLabel?: string;
    onSubmit: FormEventHandler;
}

/** "YYYY-MM-DD" + n weeks, in local time. */
function sumarSemanas(fecha: string, semanas: number): string {
    const [y, m, d] = fecha.split('-').map(Number);
    const fin = new Date(y, m - 1, d + semanas * 7);

    return [fin.getFullYear(), String(fin.getMonth() + 1).padStart(2, '0'), String(fin.getDate()).padStart(2, '0')].join('-');
}

/** Same rule as Grupo::siguienteClave(): A..Z by how many claves already use the prefix, then numbers. */
function siguienteClave(prefijo: string, usadas: string[]): string {
    const existentes = usadas.filter((clave) => clave.startsWith(prefijo)).length;

    return prefijo + (existentes < 26 ? String.fromCharCode(65 + existentes) : String(existentes + 1));
}

/** "35 semanas · ~8 meses" */
function describirDuracion(semanas: number | null): string {
    if (!semanas) return 'Duración sin definir';
    const meses = Math.round(semanas / 4.35);

    return `${semanas} semanas · ~${meses} ${meses === 1 ? 'mes' : 'meses'}`;
}

/** The turno that matches the chosen days and start time, or null when it's ambiguous. */
function turnoSugerido(dias: string[], horaInicio: string): string | null {
    if (dias.length === 1 && dias[0] === 'Sáb') return 'sabatino';
    if (dias.length === 1 && dias[0] === 'Dom') return 'dominical';
    if (dias.length > 0 && dias.every((dia) => !['Sáb', 'Dom'].includes(dia)) && horaInicio) {
        return Number(horaInicio.slice(0, 2)) < 13 ? 'matutino' : 'vespertino';
    }

    return null;
}

export function GrupoForm({
    title,
    description,
    data,
    setData,
    errors,
    planteles,
    cursos,
    profesores,
    dias,
    clavesUsadas,
    processing,
    cancelHref,
    submitLabel = 'Guardar',
    onSubmit,
}: GrupoFormProps) {
    const plantel = planteles.find((p) => String(p.id) === data.plantel_id);
    const curso = cursos.find((c) => String(c.id) === data.curso_id);
    const profesor = profesores.find((p) => String(p.id) === data.profesor_id);
    // The turno follows the days until the user picks one by hand (an existing grupo already has its own).
    const turnoManual = useRef(data.turno !== '');

    // Only the cursos the selected plantel offers.
    const cursosDelPlantel = useMemo(() => (plantel ? cursos.filter((c) => plantel.curso_ids.includes(c.id)) : []), [plantel, cursos]);

    // Profesores who already teach the chosen curso go first.
    const [sugeridos, otros] = useMemo(() => {
        if (!curso) return [[], profesores];

        return [profesores.filter((p) => p.curso_ids.includes(curso.id)), profesores.filter((p) => !p.curso_ids.includes(curso.id))];
    }, [curso, profesores]);

    const fechaFinSugerida = curso?.duracion_semanas && data.fecha_inicio ? sumarSemanas(data.fecha_inicio, curso.duracion_semanas) : null;
    const anio = data.fecha_inicio ? data.fecha_inicio.slice(0, 4) : String(new Date().getFullYear());
    const clavePrevista = curso && plantel ? siguienteClave(`${curso.clave}-${plantel.clave}-${anio}-`, clavesUsadas) : null;

    const cambiarPlantel = (value: string) => {
        setData('plantel_id', value);
        const nuevo = planteles.find((p) => String(p.id) === value);

        if (data.curso_id && !nuevo?.curso_ids.includes(Number(data.curso_id))) {
            setData('curso_id', '');
        }
    };

    const actualizarTurno = (nuevosDias: string[], horaInicio: string) => {
        const sugerido = turnoSugerido(nuevosDias, horaInicio);

        if (!turnoManual.current && sugerido) {
            setData('turno', sugerido);
        }
    };

    const toggleDia = (dia: string) => {
        // Keep the days in week order whatever the click order.
        const nuevos = data.dias.includes(dia) ? data.dias.filter((d) => d !== dia) : dias.filter((d) => d === dia || data.dias.includes(d));
        setData('dias', nuevos);
        actualizarTurno(nuevos, data.hora_inicio);
    };

    return (
        <form onSubmit={onSubmit} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="flex min-w-0 flex-col gap-6">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                        <Users className="size-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                        <p className="text-muted-foreground text-sm">{description}</p>
                    </div>
                </div>

                <Seccion numero={1} icono={GraduationCap} titulo="Plantel y curso" descripcion="Dónde se abre el grupo y qué curso se imparte.">
                    <div className="space-y-2">
                        <Label>Plantel</Label>
                        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Plantel">
                            {planteles.map((p) => (
                                <OpcionTarjeta
                                    key={p.id}
                                    seleccionada={data.plantel_id === String(p.id)}
                                    onSelect={() => cambiarPlantel(String(p.id))}
                                >
                                    <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                                        <Building2 className="size-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate font-medium">{p.nombre}</p>
                                        <p className="text-muted-foreground text-xs">
                                            {p.curso_ids.length} {p.curso_ids.length === 1 ? 'curso en su oferta' : 'cursos en su oferta'}
                                        </p>
                                    </div>
                                </OpcionTarjeta>
                            ))}
                        </div>
                        <InputError message={errors.plantel_id} />
                    </div>

                    <div className="space-y-2">
                        <Label>Curso</Label>
                        {!plantel ? (
                            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                                Elige primero el plantel para ver sus cursos.
                            </p>
                        ) : cursosDelPlantel.length === 0 ? (
                            <p className="text-destructive rounded-lg border border-dashed p-4 text-center text-sm">
                                Este plantel no tiene cursos en su oferta. Asígnalos desde Cursos («¿Dónde se imparte?»).
                            </p>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Curso">
                                {cursosDelPlantel.map((c) => (
                                    <OpcionTarjeta
                                        key={c.id}
                                        seleccionada={data.curso_id === String(c.id)}
                                        onSelect={() => setData('curso_id', String(c.id))}
                                    >
                                        <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold tracking-wide">
                                            {c.clave}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="leading-snug font-medium">{c.nombre}</p>
                                            <p className="text-muted-foreground text-xs">{describirDuracion(c.duracion_semanas)}</p>
                                        </div>
                                    </OpcionTarjeta>
                                ))}
                            </div>
                        )}
                        <InputError message={errors.curso_id} />
                    </div>
                </Seccion>

                <Seccion numero={2} icono={UserRound} titulo="Profesor" descripcion="Puedes dejarlo sin asignar y elegirlo después.">
                    <div className="grid gap-2">
                        <Label htmlFor="profesor_id">Profesor (opcional)</Label>
                        <Select
                            value={data.profesor_id || SIN_PROFESOR}
                            onValueChange={(value) => setData('profesor_id', value === SIN_PROFESOR ? '' : value)}
                        >
                            <SelectTrigger id="profesor_id" className="h-auto min-h-10 py-1.5">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={SIN_PROFESOR}>
                                    <span className="text-muted-foreground">Sin asignar</span>
                                </SelectItem>
                                {sugeridos.length > 0 && (
                                    <SelectGroup>
                                        <SelectSeparator />
                                        <SelectLabel className="text-muted-foreground text-xs">Ya imparten {curso?.nombre}</SelectLabel>
                                        {sugeridos.map((p) => (
                                            <ProfesorItem key={p.id} profesor={p} />
                                        ))}
                                    </SelectGroup>
                                )}
                                {otros.length > 0 && (
                                    <SelectGroup>
                                        <SelectSeparator />
                                        {sugeridos.length > 0 && (
                                            <SelectLabel className="text-muted-foreground text-xs">Otros profesores</SelectLabel>
                                        )}
                                        {otros.map((p) => (
                                            <ProfesorItem key={p.id} profesor={p} />
                                        ))}
                                    </SelectGroup>
                                )}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.profesor_id} />
                    </div>
                </Seccion>

                <Seccion numero={3} icono={Clock} titulo="Horario" descripcion="Los días de clase definen cuándo se pasa lista.">
                    <div className="grid gap-2">
                        <Label>Días de clase</Label>
                        <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Días de clase">
                            {dias.map((dia) => {
                                const activo = data.dias.includes(dia);

                                return (
                                    <button
                                        key={dia}
                                        type="button"
                                        aria-pressed={activo}
                                        onClick={() => toggleDia(dia)}
                                        className={cn(
                                            'h-10 rounded-lg border text-sm font-medium transition-colors',
                                            activo
                                                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                                : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        {dia}
                                    </button>
                                );
                            })}
                        </div>
                        <InputError message={errors.dias} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="hora_inicio">Hora de inicio (opcional)</Label>
                            <Input
                                id="hora_inicio"
                                type="time"
                                value={data.hora_inicio}
                                onChange={(e) => {
                                    setData('hora_inicio', e.target.value);
                                    actualizarTurno(data.dias, e.target.value);
                                }}
                            />
                            <InputError message={errors.hora_inicio} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="hora_fin">Hora de fin (opcional)</Label>
                            <Input id="hora_fin" type="time" value={data.hora_fin} onChange={(e) => setData('hora_fin', e.target.value)} />
                            <InputError message={errors.hora_fin} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Turno</Label>
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4" role="radiogroup" aria-label="Turno">
                            {Object.entries(TURNOS).map(([valor, etiqueta]) => {
                                const activo = data.turno === valor;

                                return (
                                    <button
                                        key={valor}
                                        type="button"
                                        role="radio"
                                        aria-checked={activo}
                                        onClick={() => {
                                            turnoManual.current = true;
                                            setData('turno', valor);
                                        }}
                                        className={cn(
                                            'h-10 rounded-lg border text-sm font-medium transition-colors',
                                            activo
                                                ? 'border-primary bg-primary/10 text-primary ring-primary/20 ring-2'
                                                : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        {etiqueta}
                                    </button>
                                );
                            })}
                        </div>
                        {!turnoManual.current && data.turno && (
                            <p className="text-muted-foreground flex items-center gap-1 text-xs">
                                <Sparkles className="size-3" />
                                Sugerido por los días y la hora; puedes cambiarlo.
                            </p>
                        )}
                        <InputError message={errors.turno} />
                    </div>
                </Seccion>

                <Seccion
                    numero={4}
                    icono={CalendarDays}
                    titulo="Periodo, cupo y clave"
                    descripcion="Cuándo empieza, cuántos alumnos caben y cómo se identifica."
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="fecha_inicio">Fecha de inicio</Label>
                            <Input
                                id="fecha_inicio"
                                type="date"
                                required
                                value={data.fecha_inicio}
                                onChange={(e) => setData('fecha_inicio', e.target.value)}
                            />
                            <InputError message={errors.fecha_inicio} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="fecha_fin">Fecha de fin (opcional)</Label>
                            <Input id="fecha_fin" type="date" value={data.fecha_fin} onChange={(e) => setData('fecha_fin', e.target.value)} />
                            {fechaFinSugerida && data.fecha_fin !== fechaFinSugerida && (
                                <button
                                    type="button"
                                    onClick={() => setData('fecha_fin', fechaFinSugerida)}
                                    className="text-primary flex items-center gap-1 text-left text-xs font-medium hover:underline"
                                >
                                    <Sparkles className="size-3 shrink-0" />
                                    Usar {formatFecha(fechaFinSugerida)} (duración del curso)
                                </button>
                            )}
                            <InputError message={errors.fecha_fin} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="cupo">Cupo (opcional)</Label>
                            <Input
                                id="cupo"
                                type="number"
                                min={1}
                                max={500}
                                placeholder="Sin límite"
                                value={data.cupo}
                                onChange={(e) => setData('cupo', e.target.value)}
                            />
                            <InputError message={errors.cupo} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="estado">Estado</Label>
                            <Select value={data.estado} onValueChange={(value) => setData('estado', value)}>
                                <SelectTrigger id="estado">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.keys(ESTADOS_GRUPO).map((valor) => (
                                        <SelectItem key={valor} value={valor}>
                                            <EstadoGrupoBadge estado={valor} />
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.estado} />
                        </div>
                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="clave">Clave (opcional)</Label>
                            <Input
                                id="clave"
                                maxLength={30}
                                value={data.clave}
                                onChange={(e) => setData('clave', e.target.value)}
                                className="font-mono uppercase placeholder:font-sans placeholder:normal-case"
                                placeholder="Automática"
                            />
                            {!data.clave && (
                                <p className="text-muted-foreground text-xs">
                                    {clavePrevista ? (
                                        <>
                                            Si la dejas vacía será <span className="text-foreground font-mono font-medium">{clavePrevista}</span>.
                                        </>
                                    ) : (
                                        'Si la dejas vacía se genera sola con el curso, el plantel y el año.'
                                    )}
                                </p>
                            )}
                            <InputError message={errors.clave} />
                        </div>
                    </div>
                </Seccion>

                {/* Phones and tablets: actions at the end of the form (on wide screens they live in the summary). */}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end xl:hidden">
                    <Button variant="outline" type="button" asChild>
                        <Link href={cancelHref}>Cancelar</Link>
                    </Button>
                    <Button disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        {submitLabel}
                    </Button>
                </div>
            </div>

            <aside className="hidden xl:sticky xl:top-6 xl:block">
                <Card className="gap-0 overflow-hidden p-0">
                    <div className="bg-muted/40 border-b px-5 py-3">
                        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Vista previa</p>
                    </div>
                    <div className="space-y-4 p-5">
                        <div className="flex items-start gap-3">
                            <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-lg text-xs font-bold tracking-wide">
                                {curso?.clave ?? '—'}
                            </div>
                            <div className="min-w-0">
                                <p className="leading-snug font-semibold">{curso?.nombre ?? 'Elige un curso'}</p>
                                <p className="text-muted-foreground font-mono text-xs">
                                    {data.clave.toUpperCase() || clavePrevista || 'Clave automática'}
                                </p>
                            </div>
                        </div>
                        <EstadoGrupoBadge estado={data.estado} />
                        <div className="space-y-2.5 text-sm">
                            <Dato icono={Building2} valor={plantel?.nombre} vacio="Sin plantel" />
                            <div className="flex items-center gap-2.5">
                                {profesor ? (
                                    <PersonaAvatar nombre={profesor.nombre_completo} fotoUrl={profesor.foto_url} className="size-6" />
                                ) : (
                                    <UserRound className="text-muted-foreground size-4 shrink-0" />
                                )}
                                <span className={cn('truncate', !profesor && 'text-muted-foreground')}>
                                    {profesor?.nombre_completo ?? 'Sin profesor'}
                                </span>
                            </div>
                            <Dato
                                icono={Clock}
                                valor={
                                    data.dias.length || data.hora_inicio
                                        ? [describirDiasYHoras({ ...data, dias: data.dias.join(',') }), TURNOS[data.turno]]
                                              .filter(Boolean)
                                              .join(' · ')
                                        : undefined
                                }
                                vacio="Sin horario"
                            />
                            <Dato
                                icono={CalendarDays}
                                valor={
                                    data.fecha_inicio
                                        ? `${formatFecha(data.fecha_inicio)}${
                                              data.fecha_fin || fechaFinSugerida ? ` → ${formatFecha(data.fecha_fin || fechaFinSugerida!)}` : ''
                                          }`
                                        : undefined
                                }
                                vacio="Sin fecha de inicio"
                            />
                            <Dato icono={Users} valor={data.cupo ? `Cupo de ${data.cupo} alumnos` : 'Sin límite de cupo'} vacio="" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 border-t p-5">
                        <Button disabled={processing} className="w-full">
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            {submitLabel}
                        </Button>
                        <Button variant="ghost" type="button" asChild className="w-full">
                            <Link href={cancelHref}>Cancelar</Link>
                        </Button>
                    </div>
                </Card>
            </aside>
        </form>
    );
}

function ProfesorItem({ profesor }: { profesor: ProfesorOpcion }) {
    return (
        <SelectItem value={String(profesor.id)}>
            <span className="flex items-center gap-2">
                <PersonaAvatar nombre={profesor.nombre_completo} fotoUrl={profesor.foto_url} className="size-6" fallbackClassName="text-[10px]" />
                <span>{profesor.nombre_completo}</span>
                {profesor.especialidad && <span className="text-muted-foreground">· {profesor.especialidad}</span>}
            </span>
        </SelectItem>
    );
}

function Dato({ icono: Icono, valor, vacio }: { icono: LucideIcon; valor?: string; vacio: string }) {
    return (
        <div className="flex items-center gap-2.5">
            <Icono className="text-muted-foreground size-4 shrink-0" />
            <span className={cn(!valor && 'text-muted-foreground')}>{valor ?? vacio}</span>
        </div>
    );
}
