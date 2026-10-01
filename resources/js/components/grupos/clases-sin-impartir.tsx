import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatFecha } from '@/lib/utils';
import { router, useForm } from '@inertiajs/react';
import { CalendarCheck2, CalendarOff, CalendarX2, LoaderCircle, Pencil, Undo2 } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

/** Why a grupo had no class on a date (App\Support\CalendarioGrupo): a holiday of the school calendar or a suspended class. */
export interface SinClase {
    fecha?: string;
    tipo: 'festivo' | 'suspendida';
    id: number;
    motivo: string;
    clave_motivo?: string;
    alcance?: 'escuela' | 'plantel';
    observaciones?: string | null;
    fecha_reposicion?: string | null;
}

export type MotivosSuspension = Record<string, string>;

// A type alias (not an interface) so it satisfies Inertia's FormDataType index signature.
type SuspensionForm = {
    fecha: string;
    motivo: string;
    observaciones: string;
    se_repone: boolean;
    fecha_reposicion: string;
};

const fechaConDia = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);

    return new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d));
};

/** "el domingo siguiente" from the class date, or "la semana siguiente" while there's none. */
function cuandoSeRecorre(fecha: string): string {
    if (!fecha) return 'la semana siguiente';
    const [y, m, d] = fecha.split('-').map(Number);

    return `el ${new Intl.DateTimeFormat('es-MX', { weekday: 'long' }).format(new Date(y, m - 1, d))} siguiente`;
}

/** The date one week later, as YYYY-MM-DD. */
function unaSemanaDespues(fecha: string): string {
    const [y, m, d] = fecha.split('-').map(Number);
    const siguiente = new Date(y, m - 1, d + 7);

    return [siguiente.getFullYear(), String(siguiente.getMonth() + 1).padStart(2, '0'), String(siguiente.getDate()).padStart(2, '0')].join('-');
}

interface SuspenderClaseDialogProps {
    grupoId: number;
    motivos: MotivosSuspension;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** A fixed date (from the roll call); otherwise the dialog asks for it. */
    fecha?: string;
    /** An existing suspension to correct. */
    actual?: SinClase | null;
    min?: string;
    /** The grupo's current (adjusted) end, to preview what each choice does to it. */
    finCurso?: string | null;
}

/** Records that a class was not given, and whether it is made up on another date. */
export function SuspenderClaseDialog({ grupoId, motivos, open, onOpenChange, fecha, actual, min, finCurso }: SuspenderClaseDialogProps) {
    const { data, setData, transform, post, processing, errors, clearErrors } = useForm<SuspensionForm>({
        fecha: actual?.fecha ?? fecha ?? '',
        motivo: actual?.clave_motivo ?? 'profesor',
        observaciones: actual?.observaciones ?? '',
        se_repone: Boolean(actual?.fecha_reposicion),
        fecha_reposicion: actual?.fecha_reposicion ?? '',
    });

    transform(({ se_repone, fecha_reposicion, ...resto }) => ({ ...resto, fecha_reposicion: se_repone ? fecha_reposicion : null }));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('clases-suspendidas.store', grupoId), {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(abierto) => {
                clearErrors();
                onOpenChange(abierto);
            }}
        >
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={submit} className="space-y-5">
                    <DialogHeader>
                        <DialogTitle>{actual ? 'Clase sin impartir' : 'Suspender una clase'}</DialogTitle>
                        <DialogDescription>
                            {fecha || actual?.fecha
                                ? `Clase del ${formatFecha((actual?.fecha ?? fecha)!)}. `
                                : 'Registra el día de clase que no se dio. '}
                            Elige si se repone otro día o si el plan se recorre una semana.
                        </DialogDescription>
                    </DialogHeader>

                    {!fecha && !actual && (
                        <div className="grid gap-2">
                            <Label htmlFor="suspension_fecha">Fecha de la clase</Label>
                            <Input
                                id="suspension_fecha"
                                type="date"
                                value={data.fecha}
                                min={min}
                                onChange={(e) => setData('fecha', e.target.value)}
                                required
                            />
                            <InputError message={errors.fecha} />
                        </div>
                    )}
                    {(fecha || actual) && <InputError message={errors.fecha} />}

                    <fieldset className="grid gap-2">
                        <legend className="mb-2 text-sm font-medium">Motivo</legend>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(motivos).map(([clave, etiqueta]) => (
                                <label
                                    key={clave}
                                    className={cn(
                                        'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                                        data.motivo === clave ? 'border-primary bg-primary/5 ring-primary/20 font-medium ring-2' : 'hover:bg-muted',
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="motivo"
                                        value={clave}
                                        checked={data.motivo === clave}
                                        onChange={() => setData('motivo', clave)}
                                        className="accent-primary"
                                    />
                                    {etiqueta}
                                </label>
                            ))}
                        </div>
                        <InputError message={errors.motivo} />
                    </fieldset>

                    <div className="grid gap-2">
                        <Label htmlFor="suspension_observaciones">Detalle (opcional)</Label>
                        <Input
                            id="suspension_observaciones"
                            value={data.observaciones}
                            maxLength={255}
                            onChange={(e) => setData('observaciones', e.target.value)}
                            placeholder="Ej. el profesor avisó que estaba enfermo"
                        />
                        <InputError message={errors.observaciones} />
                    </div>

                    <div className="space-y-3 rounded-lg border p-3">
                        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="¿Qué pasa con esta clase?">
                            {[
                                {
                                    valor: false,
                                    titulo: 'Se recorre una semana',
                                    detalle: `Se da ${cuandoSeRecorre(data.fecha)}; el curso termina una semana después`,
                                    efecto: finCurso ? `Fin del curso: ${formatFecha(finCurso)} → ${formatFecha(unaSemanaDespues(finCurso))}` : null,
                                },
                                {
                                    valor: true,
                                    titulo: 'Se repone otro día',
                                    detalle: 'Se da en otra fecha; el curso termina en su fecha',
                                    efecto: finCurso ? `Fin del curso: ${formatFecha(finCurso)}, sin cambio` : null,
                                },
                            ].map((opcion) => (
                                <button
                                    key={opcion.titulo}
                                    type="button"
                                    role="radio"
                                    aria-checked={data.se_repone === opcion.valor}
                                    onClick={() => setData('se_repone', opcion.valor)}
                                    className={cn(
                                        'flex flex-col items-start justify-start rounded-md border px-3 py-2 text-left text-sm transition-colors',
                                        data.se_repone === opcion.valor ? 'border-primary bg-primary/5 ring-primary/20 ring-2' : 'hover:bg-muted',
                                    )}
                                >
                                    <span className="block font-medium">{opcion.titulo}</span>
                                    <span className="text-muted-foreground block text-xs">{opcion.detalle}</span>
                                    {opcion.efecto && !actual && (
                                        <span className="mt-1.5 block text-xs font-medium tabular-nums">{opcion.efecto}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                        {data.se_repone && (
                            <div className="grid gap-2">
                                <Label htmlFor="suspension_reposicion">Fecha de reposición</Label>
                                <Input
                                    id="suspension_reposicion"
                                    type="date"
                                    value={data.fecha_reposicion}
                                    min={min}
                                    onChange={(e) => setData('fecha_reposicion', e.target.value)}
                                    required
                                />
                                <InputError message={errors.fecha_reposicion} />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            Guardar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/** Undoes a suspension: the class counts as given again. */
export function deshacerSuspension(id: number) {
    if (!confirm('¿Deshacer la suspensión? La clase volverá a contar como impartida.')) return;

    router.delete(route('clases-suspendidas.destroy', id), { preserveScroll: true });
}

/** The holidays and suspended classes of a grupo, with the action to record one. */
export function ClasesSinImpartirCard({
    grupoId,
    clases,
    motivos,
    semanasRecorridas,
    puedeSuspender,
    min,
    finCurso,
}: {
    grupoId: number;
    clases: SinClase[];
    motivos: MotivosSuspension;
    semanasRecorridas: number;
    puedeSuspender: boolean;
    min: string;
    finCurso: string | null;
}) {
    const [dialogo, setDialogo] = useState<{ actual: SinClase | null } | null>(null);
    const perdidas = clases.filter((clase) => clase.tipo === 'festivo' || !clase.fecha_reposicion).length;

    if (clases.length === 0 && !puedeSuspender) return null;

    return (
        <Card className="gap-0 p-0">
            <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
                <div className="min-w-0">
                    <h2 className="flex items-center gap-2 font-semibold">
                        <CalendarOff className="text-muted-foreground size-4" />
                        Clases sin impartir
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        {clases.length === 0
                            ? 'Ninguna hasta ahora'
                            : semanasRecorridas > 0
                              ? `El fin se recorrió ${semanasRecorridas} ${semanasRecorridas === 1 ? 'semana' : 'semanas'}`
                              : perdidas === 0
                                ? 'Todas repuestas'
                                : `${clases.length} en el periodo`}
                    </p>
                </div>
            </div>

            {clases.length > 0 && (
                <ul className="divide-y">
                    {clases.map((clase) => (
                        <li key={`${clase.tipo}-${clase.fecha}`} className="flex items-start gap-3 px-5 py-3">
                            <IconoSinClase clase={clase} />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium first-letter:uppercase">{fechaConDia(clase.fecha!)}</p>
                                <p className="text-muted-foreground text-xs">
                                    {clase.motivo}
                                    {clase.tipo === 'festivo' && (clase.alcance === 'escuela' ? ' · toda la escuela' : ' · este plantel')}
                                    {clase.observaciones && ` · ${clase.observaciones}`}
                                </p>
                                {clase.tipo === 'suspendida' && (
                                    <p
                                        className={cn(
                                            'mt-0.5 text-xs font-medium',
                                            clase.fecha_reposicion ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400',
                                        )}
                                    >
                                        {clase.fecha_reposicion ? `Repuesta el ${fechaConDia(clase.fecha_reposicion)}` : 'Se recorrió una semana'}
                                    </p>
                                )}
                            </div>
                            {puedeSuspender && clase.tipo === 'suspendida' && (
                                <div className="flex shrink-0 gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        onClick={() => setDialogo({ actual: clase })}
                                        aria-label={`Editar la clase del ${formatFecha(clase.fecha!)}`}
                                        title="Editar"
                                    >
                                        <Pencil className="size-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        onClick={() => deshacerSuspension(clase.id)}
                                        aria-label={`Deshacer la suspensión del ${formatFecha(clase.fecha!)}`}
                                        title="Deshacer"
                                    >
                                        <Undo2 className="size-4" />
                                    </Button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {puedeSuspender && (
                <div className={cn('px-5 py-3', clases.length > 0 && 'border-t')}>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setDialogo({ actual: null })}>
                        <CalendarX2 className="size-4" />
                        Registrar clase sin impartir
                    </Button>
                </div>
            )}

            {dialogo && (
                <SuspenderClaseDialog
                    key={dialogo.actual?.id ?? 'nueva'}
                    grupoId={grupoId}
                    motivos={motivos}
                    open
                    onOpenChange={(abierto) => !abierto && setDialogo(null)}
                    actual={dialogo.actual}
                    min={min}
                    finCurso={finCurso}
                />
            )}
        </Card>
    );
}

function IconoSinClase({ clase }: { clase: SinClase }) {
    const repuesta = clase.tipo === 'suspendida' && clase.fecha_reposicion;
    const Icono = clase.tipo === 'festivo' ? CalendarOff : repuesta ? CalendarCheck2 : CalendarX2;

    return (
        <span
            className={cn(
                'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                clase.tipo === 'festivo'
                    ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                    : repuesta
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
            )}
        >
            <Icono className="size-4" />
        </span>
    );
}

/** The roll call's notice for a day without class (or a make-up class). */
export function AvisoSinClase({ sinClase, reposicionDe }: { sinClase: SinClase | null; reposicionDe: string[] }) {
    if (sinClase) {
        return (
            <div
                className={cn(
                    'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
                    sinClase.tipo === 'festivo'
                        ? 'border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-200'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200',
                )}
            >
                {sinClase.tipo === 'festivo' ? <CalendarOff className="mt-0.5 size-4 shrink-0" /> : <CalendarX2 className="mt-0.5 size-4 shrink-0" />}
                <div>
                    <p className="font-medium">
                        {sinClase.tipo === 'festivo' ? `Sin clase: ${sinClase.motivo}` : `Clase suspendida: ${sinClase.motivo.toLowerCase()}`}
                    </p>
                    <p className="opacity-90">
                        {sinClase.observaciones && `${sinClase.observaciones}. `}
                        {sinClase.tipo === 'festivo'
                            ? `Día sin clase ${sinClase.alcance === 'escuela' ? 'en toda la escuela' : 'en el plantel'}; no se pasa lista.`
                            : sinClase.fecha_reposicion
                              ? `Se repone el ${formatFecha(sinClase.fecha_reposicion)}; el curso termina en su fecha.`
                              : 'No se repone: lo que tocaba se da la semana siguiente y el curso termina una semana después.'}
                    </p>
                </div>
            </div>
        );
    }

    if (reposicionDe.length > 0) {
        return (
            <p className="flex items-start gap-2 rounded-lg border border-emerald-600/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-200">
                <CalendarCheck2 className="mt-0.5 size-4 shrink-0" />
                Clase de reposición de la del {reposicionDe.map(formatFecha).join(' y ')}.
            </p>
        );
    }

    return null;
}
