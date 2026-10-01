import { EstadoGrupoBadge } from '@/components/grupos/grupo-labels';
import InputError from '@/components/input-error';
import { Pagination, type PaginationLink } from '@/components/pagination';
import { PersonaAvatar } from '@/components/persona-avatar';
import {
    BotonesDocumento,
    type DatosEmision,
    type InscripcionDocumento,
    ListaAsistenciaDialog,
    type MesReporte,
    type TipoDocumento,
    TIPOS_DOCUMENTO,
} from '@/components/reportes/documentos';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { cn, formatFecha } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Ban,
    Building2,
    CheckCircle2,
    ClipboardList,
    Download,
    ExternalLink,
    FileSpreadsheet,
    FileText,
    LoaderCircle,
    Search,
    Users,
    UserSearch,
    XCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { type FormEventHandler, useEffect, useMemo, useRef, useState } from 'react';

type Pestana = 'grupos' | 'alumnos' | 'documentos';

interface GrupoReporte {
    id: number;
    clave: string;
    curso: string;
    plantel_id: number;
    plantel: string;
    estado: string;
    meses: MesReporte[];
    mes_sugerido: string | null;
}

interface AlumnoReporte {
    id: number;
    nombre_completo: string;
    matricula: string;
    foto_url: string | null;
    inscripciones: InscripcionDocumento[];
}

interface DocumentoFila {
    id: number;
    tipo: TipoDocumento;
    folio: string;
    alumno: string | null;
    matricula: string | null;
    curso: string | null;
    grupo: string | null;
    emitido_en: string;
    emitido_por: string | null;
    firmante: string | null;
    vigente: boolean;
    anulado_en: string | null;
    anulado_por: string | null;
    motivo_anulacion: string | null;
    url_verificacion: string;
}

interface ReportesProps {
    planteles: { id: number; nombre: string }[];
    grupos: GrupoReporte[];
    alumnos: AlumnoReporte[];
    documentos: { data: DocumentoFila[]; links: PaginationLink[]; total: number };
    emision: DatosEmision;
    filters: { alumno: string; q: string; tab: Pestana };
    canVoid: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Reportes', href: '/reportes' }];

const ESTADO_INSCRIPCION: Record<InscripcionDocumento['estado'], { etiqueta: string; clase: string }> = {
    activo: { etiqueta: 'Inscrito', clase: 'bg-primary/10 text-primary' },
    egresado: { etiqueta: 'Egresado', clase: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' },
    no_acreditado: { etiqueta: 'No acreditado', clase: 'bg-red-500/10 text-red-800 dark:text-red-300' },
    baja: { etiqueta: 'Baja', clase: 'bg-muted text-muted-foreground' },
};

/** Waits for the user to stop typing before searching on the server. */
function useBusquedaDiferida(valor: string, alCambiar: (valor: string) => void, espera = 350) {
    const primera = useRef(true);

    useEffect(() => {
        if (primera.current) {
            primera.current = false;
            return;
        }

        const id = setTimeout(() => alCambiar(valor), espera);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [valor]);
}

export default function Reportes({ planteles, grupos, alumnos, documentos, emision, filters, canVoid }: ReportesProps) {
    const [pestana, setPestana] = useState<Pestana>(filters.tab);

    const cambiarPestana = (valor: Pestana) => {
        setPestana(valor);
        router.get(
            route('reportes.index'),
            { ...filters, tab: valor },
            { preserveState: true, preserveScroll: true, replace: true, only: ['filters'] },
        );
    };

    const pestanas: { valor: Pestana; etiqueta: string; corta: string; icono: typeof Users; conteo?: number }[] = [
        { valor: 'grupos', etiqueta: 'Por grupo', corta: 'Grupos', icono: Users },
        { valor: 'alumnos', etiqueta: 'Por alumno', corta: 'Alumnos', icono: UserSearch },
        { valor: 'documentos', etiqueta: 'Documentos emitidos', corta: 'Emitidos', icono: FileText, conteo: documentos.total },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reportes" />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex max-w-6xl flex-col gap-6 p-4 sm:p-6"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                        <FileText className="size-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
                        <p className="text-muted-foreground text-sm">Concentrados, listas de asistencia, boletas y constancias en PDF</p>
                    </div>
                </div>

                <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Tipo de reporte">
                    {pestanas.map(({ valor, etiqueta, corta, icono: Icono, conteo }) => {
                        const activa = pestana === valor;

                        return (
                            <button
                                key={valor}
                                type="button"
                                role="tab"
                                aria-selected={activa}
                                onClick={() => cambiarPestana(valor)}
                                className={cn(
                                    'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                                    activa
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                )}
                            >
                                <Icono className="size-4" />
                                <span className="sm:hidden">{corta}</span>
                                <span className="hidden sm:inline">{etiqueta}</span>
                                {conteo !== undefined && (
                                    <span
                                        className={cn(
                                            'min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums',
                                            activa ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground',
                                        )}
                                    >
                                        {conteo}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {pestana === 'grupos' && <PorGrupo grupos={grupos} planteles={planteles} />}
                {pestana === 'alumnos' && <PorAlumno alumnos={alumnos} emision={emision} filters={filters} />}
                {pestana === 'documentos' && <Documentos documentos={documentos} filters={filters} canVoid={canVoid} />}
            </motion.div>
        </AppLayout>
    );
}

function PorGrupo({ grupos, planteles }: { grupos: GrupoReporte[]; planteles: ReportesProps['planteles'] }) {
    const [plantel, setPlantel] = useState<number | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [lista, setLista] = useState<GrupoReporte | null>(null);

    const visibles = useMemo(() => {
        const termino = busqueda.trim().toLowerCase();

        return grupos.filter(
            (grupo) =>
                (plantel === null || grupo.plantel_id === plantel) &&
                (!termino || grupo.clave.toLowerCase().includes(termino) || grupo.curso.toLowerCase().includes(termino)),
        );
    }, [grupos, plantel, busqueda]);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative sm:w-72">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar curso o clave…" className="pl-9" />
                </div>
                {planteles.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                        {[{ id: null, nombre: 'Todos' }, ...planteles].map((opcion) => (
                            <button
                                key={opcion.id ?? 'todos'}
                                type="button"
                                onClick={() => setPlantel(opcion.id)}
                                className={cn(
                                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                    plantel === opcion.id ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
                                )}
                            >
                                {opcion.nombre}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {visibles.length === 0 ? (
                <Vacio icono={Users} titulo="No hay grupos" texto="Prueba con otro plantel o búsqueda." />
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {visibles.map((grupo) => (
                        <Card key={grupo.id} className="gap-4 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate font-medium">{grupo.curso}</p>
                                    <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                                        <span className="font-mono">{grupo.clave}</span>
                                        <span className="flex items-center gap-1">
                                            <Building2 className="size-3" />
                                            {grupo.plantel}
                                        </span>
                                    </p>
                                </div>
                                <EstadoGrupoBadge estado={grupo.estado} className="shrink-0" />
                            </div>
                            <div className="mt-auto grid grid-cols-2 gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <a href={route('reportes.concentrado', grupo.id)} target="_blank" rel="noopener">
                                        <FileSpreadsheet className="size-3.5" />
                                        Concentrado
                                    </a>
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setLista(grupo)}>
                                    <ClipboardList className="size-3.5" />
                                    Asistencia
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {lista && (
                <ListaAsistenciaDialog
                    grupoId={lista.id}
                    grupoClave={lista.clave}
                    meses={lista.meses}
                    mesSugerido={lista.mes_sugerido}
                    open
                    onOpenChange={(abierto) => !abierto && setLista(null)}
                />
            )}
        </div>
    );
}

function PorAlumno({ alumnos, emision, filters }: { alumnos: AlumnoReporte[]; emision: DatosEmision; filters: ReportesProps['filters'] }) {
    const [busqueda, setBusqueda] = useState(filters.alumno);
    const [buscando, setBuscando] = useState(false);

    useBusquedaDiferida(busqueda, (valor) =>
        router.get(
            route('reportes.index'),
            { ...filters, tab: 'alumnos', alumno: valor },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['alumnos', 'filters'],
                onStart: () => setBuscando(true),
                onFinish: () => setBuscando(false),
            },
        ),
    );

    return (
        <div className="flex flex-col gap-4">
            <div className="relative sm:w-96">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Nombre, matrícula o CURP…"
                    className="pl-9"
                    autoFocus
                    aria-label="Buscar alumno"
                />
                {buscando && <LoaderCircle className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />}
            </div>

            {filters.alumno === '' ? (
                <Vacio
                    icono={UserSearch}
                    titulo="Busca a un alumno"
                    texto="Verás sus cursos para emitir su boleta de calificaciones o, si ya egresó, su constancia de estudios."
                />
            ) : alumnos.length === 0 ? (
                <Vacio icono={UserSearch} titulo="Sin resultados" texto={`Ningún alumno de tus planteles coincide con «${filters.alumno}».`} />
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {alumnos.map((alumno) => (
                        <Card key={alumno.id} className="gap-0 p-0">
                            <div className="flex items-center gap-3 border-b px-4 py-3">
                                <PersonaAvatar nombre={alumno.nombre_completo} fotoUrl={alumno.foto_url} className="size-10" />
                                <div className="min-w-0">
                                    <p className="truncate font-medium">{alumno.nombre_completo}</p>
                                    <p className="text-muted-foreground font-mono text-xs">{alumno.matricula}</p>
                                </div>
                            </div>
                            <ul className="divide-y">
                                {alumno.inscripciones.map((inscripcion) => (
                                    <li key={inscripcion.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">{inscripcion.curso}</p>
                                            <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                                <span className="font-mono">{inscripcion.grupo}</span>
                                                <span
                                                    className={cn(
                                                        'rounded-full px-1.5 py-px font-medium',
                                                        ESTADO_INSCRIPCION[inscripcion.estado].clase,
                                                    )}
                                                >
                                                    {ESTADO_INSCRIPCION[inscripcion.estado].etiqueta}
                                                    {inscripcion.promedio_final !== null && ` · ${inscripcion.promedio_final.toFixed(1)}`}
                                                </span>
                                            </p>
                                        </div>
                                        <BotonesDocumento
                                            inscripcion={inscripcion}
                                            alumno={alumno.nombre_completo}
                                            emision={emision}
                                            onEmitido={() => router.reload({ only: ['emision', 'documentos'] })}
                                            className="shrink-0"
                                        />
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

function Documentos({
    documentos,
    filters,
    canVoid,
}: {
    documentos: ReportesProps['documentos'];
    filters: ReportesProps['filters'];
    canVoid: boolean;
}) {
    const [busqueda, setBusqueda] = useState(filters.q);
    const [anulando, setAnulando] = useState<DocumentoFila | null>(null);

    useBusquedaDiferida(busqueda, (valor) =>
        router.get(
            route('reportes.index'),
            { ...filters, tab: 'documentos', q: valor },
            { preserveState: true, preserveScroll: true, replace: true, only: ['documentos', 'filters'] },
        ),
    );

    return (
        <div className="flex flex-col gap-4">
            <div className="relative sm:w-96">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Folio, alumno o matrícula…"
                    className="pl-9"
                    aria-label="Buscar documento"
                />
            </div>

            {documentos.data.length === 0 ? (
                <Vacio
                    icono={FileText}
                    titulo={filters.q ? 'Sin resultados' : 'Todavía no se ha emitido ningún documento'}
                    texto={
                        filters.q
                            ? `Ningún documento coincide con «${filters.q}».`
                            : 'Las boletas y constancias que se emitan aparecerán aquí con su folio, para volver a descargarlas o verificarlas.'
                    }
                />
            ) : (
                <Card className="gap-0 p-0">
                    <ul className="divide-y">
                        {documentos.data.map((documento) => {
                            const Icono = TIPOS_DOCUMENTO[documento.tipo].icono;

                            return (
                                <li key={documento.id} className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <div
                                            className={cn(
                                                'flex size-9 shrink-0 items-center justify-center rounded-lg',
                                                documento.vigente ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            <Icono className="size-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <span
                                                    className={cn('font-mono text-sm font-semibold', !documento.vigente && 'line-through opacity-60')}
                                                >
                                                    {documento.folio}
                                                </span>
                                                {documento.vigente ? (
                                                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-px text-xs font-medium text-emerald-800 dark:text-emerald-300">
                                                        <CheckCircle2 className="size-3" />
                                                        Vigente
                                                    </span>
                                                ) : (
                                                    <span
                                                        className="flex items-center gap-1 rounded-full bg-red-500/10 px-1.5 py-px text-xs font-medium text-red-800 dark:text-red-300"
                                                        title={documento.motivo_anulacion ?? undefined}
                                                    >
                                                        <XCircle className="size-3" />
                                                        Anulado
                                                    </span>
                                                )}
                                                <span className="text-muted-foreground text-xs">{TIPOS_DOCUMENTO[documento.tipo].nombre}</span>
                                            </p>
                                            <p className="truncate text-sm">
                                                {documento.alumno}{' '}
                                                <span className="text-muted-foreground font-mono text-xs">{documento.matricula}</span>
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                {documento.curso} · <span className="font-mono">{documento.grupo}</span>
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                Emitido el {formatFecha(documento.emitido_en.slice(0, 10))}, {documento.emitido_en.slice(11)}
                                                {documento.emitido_por && ` por ${documento.emitido_por}`}
                                                {!documento.vigente &&
                                                    ` · anulado el ${formatFecha(documento.anulado_en!)}${documento.anulado_por ? ` por ${documento.anulado_por}` : ''}${documento.motivo_anulacion ? `: ${documento.motivo_anulacion}` : ''}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pl-12 lg:shrink-0 lg:pl-0">
                                        <Button variant="outline" size="sm" asChild>
                                            <a href={route('documentos.pdf', documento.id)} target="_blank" rel="noopener">
                                                <Download className="size-3.5" />
                                                PDF
                                            </a>
                                        </Button>
                                        <Button variant="ghost" size="sm" asChild>
                                            <a href={documento.url_verificacion} target="_blank" rel="noopener">
                                                <ExternalLink className="size-3.5" />
                                                Verificar
                                            </a>
                                        </Button>
                                        {canVoid && documento.vigente && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => setAnulando(documento)}
                                            >
                                                <Ban className="size-3.5" />
                                                Anular
                                            </Button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    {documentos.links.length > 3 && (
                        <div className="border-t px-4 py-3">
                            <Pagination links={documentos.links} />
                        </div>
                    )}
                </Card>
            )}

            {anulando && <AnularDialog documento={anulando} onClose={() => setAnulando(null)} />}
        </div>
    );
}

function AnularDialog({ documento, onClose }: { documento: DocumentoFila; onClose: () => void }) {
    const { data, setData, patch, processing, errors } = useForm({ motivo: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('documentos.anular', documento.id), { preserveScroll: true, onSuccess: onClose });
    };

    return (
        <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
            <DialogContent>
                <form onSubmit={submit} className="flex flex-col gap-4">
                    <DialogHeader>
                        <DialogTitle>¿Anular el folio {documento.folio}?</DialogTitle>
                        <DialogDescription>
                            Al verificarlo dirá que está anulado. El folio no se vuelve a usar; si hace falta, emite un documento nuevo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label htmlFor="motivo">Motivo</Label>
                        <Textarea
                            id="motivo"
                            value={data.motivo}
                            onChange={(e) => setData('motivo', e.target.value)}
                            placeholder="Ej. Se corrigió una calificación"
                            maxLength={255}
                            autoFocus
                        />
                        <InputError message={errors.motivo} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="destructive" disabled={processing}>
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            Anular documento
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function Vacio({ icono: Icono, titulo, texto }: { icono: typeof Users; titulo: string; texto: string }) {
    return (
        <Card className="flex flex-col items-center px-6 py-14 text-center">
            <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
                <Icono className="size-6" />
            </div>
            <div>
                <p className="font-medium">{titulo}</p>
                <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">{texto}</p>
            </div>
        </Card>
    );
}
