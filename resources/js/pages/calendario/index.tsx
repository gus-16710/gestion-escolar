import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Building2, CalendarOff, Info, LoaderCircle, Pencil, Plus, School } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { FormEventHandler, useState } from 'react';

interface DiaSinClase {
    id: number;
    motivo: string;
    fecha_inicio: string;
    fecha_fin: string;
    plantel_id: number | null;
    plantel: string | null;
    registrado_por: string | null;
    en_curso: boolean;
    grupos: { id: number; clave: string; curso: string }[];
    puede_editar: boolean;
}

type Periodo = 'proximos' | 'pasados';

interface CalendarioProps {
    dias: DiaSinClase[];
    periodo: Periodo;
    conteos: Record<Periodo, number>;
    planteles: { id: number; nombre: string }[];
    puedeEscuela: boolean;
    canManage: boolean;
}

// A type alias (not an interface) so it satisfies Inertia's FormDataType index signature.
type DiaForm = {
    motivo: string;
    fecha_inicio: string;
    fecha_fin: string;
    plantel_id: string;
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Calendario', href: '/calendario' }];

const PESTANAS: { valor: Periodo; etiqueta: string }[] = [
    { valor: 'proximos', etiqueta: 'Próximos' },
    { valor: 'pasados', etiqueta: 'Pasados' },
];

const SUGERENCIAS = ['Vacaciones de invierno', 'Año Nuevo', 'Semana Santa', 'Día del Trabajo', 'Día de Muertos', 'Navidad'];

function aFecha(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);

    return new Date(y, m - 1, d);
}

const formato = (iso: string, opciones: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-MX', opciones).format(aFecha(iso));

function duracionDias(dia: DiaSinClase): number {
    return Math.round((aFecha(dia.fecha_fin).getTime() - aFecha(dia.fecha_inicio).getTime()) / 86_400_000) + 1;
}

/** "jueves 24 dic" or "24 dic – 1 ene 2027", with the year only when it isn't this year. */
function describirRango(dia: DiaSinClase): string {
    const anio = (iso: string) => aFecha(iso).getFullYear() !== new Date().getFullYear();

    if (dia.fecha_inicio === dia.fecha_fin) {
        return formato(dia.fecha_inicio, { weekday: 'long', day: 'numeric', month: 'long', ...(anio(dia.fecha_inicio) && { year: 'numeric' }) });
    }

    return `${formato(dia.fecha_inicio, { day: 'numeric', month: 'short' })} – ${formato(dia.fecha_fin, {
        day: 'numeric',
        month: 'short',
        ...(anio(dia.fecha_fin) && { year: 'numeric' }),
    })}`;
}

export default function Calendario({ dias, periodo, conteos, planteles, puedeEscuela, canManage }: CalendarioProps) {
    const [editando, setEditando] = useState<DiaSinClase | 'nuevo' | null>(null);

    const cambiarPeriodo = (valor: Periodo) => router.get(route('calendario.index'), { periodo: valor }, { preserveState: true, replace: true });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Calendario escolar" />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex max-w-5xl flex-col gap-6 p-4 sm:p-6"
            >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                            <CalendarOff className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">Calendario escolar</h1>
                            <p className="text-muted-foreground text-sm">Días festivos y vacaciones sin clase</p>
                        </div>
                    </div>
                    {canManage && (
                        <Button className="w-full shadow-sm sm:w-auto" onClick={() => setEditando('nuevo')}>
                            <Plus className="size-4" />
                            Agregar días sin clase
                        </Button>
                    )}
                </div>

                <p className="text-muted-foreground flex items-start gap-2 text-sm">
                    <Info className="mt-0.5 size-4 shrink-0" />
                    Los grupos con clase en estos días no pasan lista y su plan de estudios se recorre: lo que tocaba esos días se da la semana
                    siguiente y la fecha de fin se mueve sola. Una clase que no se dio por otro motivo se registra desde el grupo o el pase de lista.
                </p>

                <Card className="gap-0 overflow-hidden p-0">
                    <div className="flex gap-1 border-b p-3 sm:p-4" role="tablist" aria-label="Periodo">
                        {PESTANAS.map((pestana) => {
                            const activa = periodo === pestana.valor;

                            return (
                                <button
                                    key={pestana.valor}
                                    type="button"
                                    role="tab"
                                    aria-selected={activa}
                                    onClick={() => cambiarPeriodo(pestana.valor)}
                                    className={cn(
                                        'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                                        activa
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                    )}
                                >
                                    {pestana.etiqueta}
                                    <span
                                        className={cn(
                                            'min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums',
                                            activa ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground',
                                        )}
                                    >
                                        {conteos[pestana.valor]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {dias.length === 0 ? (
                        <div className="flex flex-col items-center px-6 py-16 text-center">
                            <div className="bg-muted text-muted-foreground mb-4 flex size-12 items-center justify-center rounded-full">
                                <CalendarOff className="size-6" />
                            </div>
                            <p className="font-medium">
                                {periodo === 'proximos' ? 'No hay días sin clase próximos' : 'No hay días sin clase pasados'}
                            </p>
                            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                                {periodo === 'proximos' && canManage
                                    ? 'Agrega los días festivos y las vacaciones del ciclo para que los grupos los tomen en cuenta.'
                                    : 'Aquí aparecerán los días festivos y vacaciones registrados.'}
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y">
                            <AnimatePresence initial={false}>
                                {dias.map((dia) => (
                                    <motion.li
                                        key={dia.id}
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4 sm:px-5"
                                    >
                                        <div className="flex items-start gap-4">
                                            <FechaChip iso={dia.fecha_inicio} pasado={periodo === 'pasados'} />
                                            <div className="min-w-0 flex-1 sm:hidden">
                                                <Encabezado dia={dia} />
                                            </div>
                                        </div>

                                        <div className="min-w-0 flex-1 space-y-2">
                                            <div className="hidden sm:block">
                                                <Encabezado dia={dia} />
                                            </div>
                                            {dia.grupos.length > 0 ? (
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="text-muted-foreground text-xs">
                                                        {dia.grupos.length} {dia.grupos.length === 1 ? 'grupo sin clase:' : 'grupos sin clase:'}
                                                    </span>
                                                    {dia.grupos.map((grupo) => (
                                                        <Link
                                                            key={grupo.id}
                                                            href={route('grupos.show', grupo.id)}
                                                            title={grupo.curso}
                                                            className="bg-muted hover:bg-muted/70 rounded-md px-1.5 py-0.5 font-mono text-[11px] transition-colors"
                                                        >
                                                            {grupo.clave}
                                                        </Link>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-muted-foreground text-xs">Ningún grupo activo tiene clase esos días.</p>
                                            )}
                                        </div>

                                        {dia.puede_editar && (
                                            <div className="flex shrink-0 gap-1 self-end sm:self-start">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8"
                                                    onClick={() => setEditando(dia)}
                                                    aria-label={`Editar ${dia.motivo}`}
                                                    title="Editar"
                                                >
                                                    <Pencil className="size-4" />
                                                </Button>
                                                <DeleteConfirmDialog
                                                    title={`¿Quitar «${dia.motivo}» del calendario?`}
                                                    description="Esos días volverán a contar como días de clase y los planes de estudio de los grupos se recalculan."
                                                    onConfirm={() => router.delete(route('calendario.destroy', dia.id), { preserveScroll: true })}
                                                />
                                            </div>
                                        )}
                                    </motion.li>
                                ))}
                            </AnimatePresence>
                        </ul>
                    )}
                </Card>
            </motion.div>

            {editando && (
                <DiaSinClaseDialog
                    key={editando === 'nuevo' ? 'nuevo' : editando.id}
                    dia={editando === 'nuevo' ? null : editando}
                    planteles={planteles}
                    puedeEscuela={puedeEscuela}
                    onClose={() => setEditando(null)}
                />
            )}
        </AppLayout>
    );
}

function FechaChip({ iso, pasado }: { iso: string; pasado: boolean }) {
    return (
        <div
            className={cn(
                'flex w-14 shrink-0 flex-col items-center overflow-hidden rounded-xl border text-center',
                pasado ? 'opacity-70' : 'border-primary/30',
            )}
            aria-hidden="true"
        >
            <span
                className={cn(
                    'w-full py-0.5 text-[10px] font-semibold uppercase',
                    pasado ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground',
                )}
            >
                {formato(iso, { month: 'short' }).replace('.', '')}
            </span>
            <span className="py-1 text-xl leading-none font-semibold tabular-nums">{aFecha(iso).getDate()}</span>
        </div>
    );
}

function Encabezado({ dia }: { dia: DiaSinClase }) {
    const dias = duracionDias(dia);

    return (
        <div className="space-y-1">
            <p className="flex flex-wrap items-center gap-2 font-medium">
                {dia.motivo}
                {dia.en_curso && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">Hoy</span>
                )}
            </p>
            <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="first-letter:uppercase">{describirRango(dia)}</span>
                {dias > 1 && <span className="tabular-nums">· {dias} días</span>}
                <span
                    className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                        dia.plantel ? 'bg-muted text-foreground/80' : 'bg-sky-500/10 text-sky-800 dark:text-sky-300',
                    )}
                >
                    {dia.plantel ? <Building2 className="size-3" /> : <School className="size-3" />}
                    {dia.plantel ?? 'Toda la escuela'}
                </span>
            </p>
        </div>
    );
}

function DiaSinClaseDialog({
    dia,
    planteles,
    puedeEscuela,
    onClose,
}: {
    dia: DiaSinClase | null;
    planteles: CalendarioProps['planteles'];
    puedeEscuela: boolean;
    onClose: () => void;
}) {
    const { data, setData, post, put, processing, errors, transform } = useForm<DiaForm>({
        motivo: dia?.motivo ?? '',
        fecha_inicio: dia?.fecha_inicio ?? '',
        fecha_fin: dia?.fecha_fin ?? '',
        plantel_id: dia?.plantel_id ? String(dia.plantel_id) : puedeEscuela ? '' : String(planteles[0]?.id ?? ''),
    });

    transform((datos) => ({ ...datos, fecha_fin: datos.fecha_fin || datos.fecha_inicio, plantel_id: datos.plantel_id || null }));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const opciones = { preserveScroll: true, onSuccess: onClose };

        if (dia) {
            put(route('calendario.update', dia.id), opciones);
        } else {
            post(route('calendario.store'), opciones);
        }
    };

    const alcances = [...(puedeEscuela ? [{ valor: '', etiqueta: 'Toda la escuela', icono: School }] : [])].concat(
        planteles.map((plantel) => ({ valor: String(plantel.id), etiqueta: plantel.nombre, icono: Building2 })),
    );

    return (
        <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={submit} className="space-y-5">
                    <DialogHeader>
                        <DialogTitle>{dia ? 'Editar días sin clase' : 'Agregar días sin clase'}</DialogTitle>
                        <DialogDescription>Un día festivo o un periodo de vacaciones. Para un solo día deja vacía la fecha final.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-2">
                        <Label htmlFor="motivo">Motivo</Label>
                        <Input
                            id="motivo"
                            value={data.motivo}
                            maxLength={120}
                            onChange={(e) => setData('motivo', e.target.value)}
                            placeholder="Ej. Vacaciones de invierno"
                            required
                        />
                        {!dia && (
                            <div className="flex flex-wrap gap-1.5">
                                {SUGERENCIAS.map((sugerencia) => (
                                    <button
                                        key={sugerencia}
                                        type="button"
                                        onClick={() => setData('motivo', sugerencia)}
                                        className={cn(
                                            'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                                            data.motivo === sugerencia
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'text-muted-foreground hover:bg-muted',
                                        )}
                                    >
                                        {sugerencia}
                                    </button>
                                ))}
                            </div>
                        )}
                        <InputError message={errors.motivo} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="fecha_inicio">Desde</Label>
                            <Input
                                id="fecha_inicio"
                                type="date"
                                value={data.fecha_inicio}
                                onChange={(e) => setData('fecha_inicio', e.target.value)}
                                required
                            />
                            <InputError message={errors.fecha_inicio} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="fecha_fin">
                                Hasta <span className="text-muted-foreground font-normal">(opcional)</span>
                            </Label>
                            <Input
                                id="fecha_fin"
                                type="date"
                                value={data.fecha_fin}
                                min={data.fecha_inicio || undefined}
                                onChange={(e) => setData('fecha_fin', e.target.value)}
                            />
                            <InputError message={errors.fecha_fin} />
                        </div>
                    </div>

                    <fieldset className="grid gap-2">
                        <legend className="mb-2 text-sm font-medium">¿Dónde no hay clase?</legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {alcances.map((alcance) => (
                                <label
                                    key={alcance.valor || 'escuela'}
                                    className={cn(
                                        'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                                        data.plantel_id === alcance.valor
                                            ? 'border-primary bg-primary/5 ring-primary/20 font-medium ring-2'
                                            : 'hover:bg-muted',
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="plantel_id"
                                        value={alcance.valor}
                                        checked={data.plantel_id === alcance.valor}
                                        onChange={() => setData('plantel_id', alcance.valor)}
                                        className="sr-only"
                                    />
                                    <alcance.icono className="text-muted-foreground size-4 shrink-0" />
                                    {alcance.etiqueta}
                                </label>
                            ))}
                        </div>
                        <InputError message={errors.plantel_id} />
                    </fieldset>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            {dia ? 'Guardar cambios' : 'Agregar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
