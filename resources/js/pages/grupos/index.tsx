import { OcupacionBar } from '@/components/dashboard/grupos-en-curso';
import { describirDiasYHoras, EstadoGrupoBadge, ESTADOS_GRUPO, TURNOS } from '@/components/grupos/grupo-labels';
import { Pagination, type PaginationLink } from '@/components/pagination';
import { PersonaAvatar } from '@/components/persona-avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { cn, formatFecha } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Building2, ChevronRight, Clock, Plus, Search, Users, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

interface Avance {
    semana?: number;
    semanas?: number;
    porcentaje?: number;
    dias_para_inicio?: number;
}

interface GrupoRow {
    id: number;
    clave: string;
    curso: string;
    curso_clave: string;
    plantel: string;
    profesor: string | null;
    profesor_foto_url: string | null;
    turno: string;
    dias: string | null;
    hora_inicio: string | null;
    hora_fin: string | null;
    fecha_inicio: string;
    fecha_fin: string | null;
    avance: Avance | null;
    cupo: number | null;
    inscritos: number;
    estado: string;
}

interface PaginatedGrupos {
    data: GrupoRow[];
    links: PaginationLink[];
    total: number;
    from: number | null;
    to: number | null;
}

interface Filters {
    search: string;
    plantel_id: number | null;
    estado: string | null;
}

type Conteos = Record<'todos' | keyof typeof ESTADOS_GRUPO, number>;

interface GruposIndexProps {
    grupos: PaginatedGrupos;
    conteos: Conteos;
    planteles: { id: number; nombre: string }[];
    filters: Filters;
    perPage: number;
    canManage: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Grupos', href: '/grupos' }];

const TODOS = 'all';

const PESTANAS: { valor: string | null; etiqueta: string; conteo: keyof Conteos }[] = [
    { valor: null, etiqueta: 'Todos', conteo: 'todos' },
    { valor: 'en_curso', etiqueta: 'En curso', conteo: 'en_curso' },
    { valor: 'planeado', etiqueta: 'Planeados', conteo: 'planeado' },
    { valor: 'concluido', etiqueta: 'Concluidos', conteo: 'concluido' },
    { valor: 'cancelado', etiqueta: 'Cancelados', conteo: 'cancelado' },
];

export default function GruposIndex({ grupos, conteos, planteles, filters, perPage, canManage }: GruposIndexProps) {
    const [searchTerm, setSearchTerm] = useState(filters.search);
    const isFirstRender = useRef(true);
    const variosPlanteles = planteles.length > 1;
    const hayFiltros = filters.search !== '' || filters.plantel_id !== null || filters.estado !== null;

    const query = (overrides: Record<string, string | number | null>) => ({
        search: searchTerm,
        plantel_id: filters.plantel_id,
        estado: filters.estado,
        per_page: perPage,
        ...overrides,
    });

    const visit = (overrides: Record<string, string | number | null>) => {
        router.get(route('grupos.index'), query(overrides), { preserveState: true, preserveScroll: true, replace: true });
    };

    const limpiarFiltros = () => {
        setSearchTerm('');
        router.get(route('grupos.index'), { per_page: perPage }, { preserveScroll: true, replace: true });
    };

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timeout = setTimeout(() => visit({ search: searchTerm }), 350);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Grupos" />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex flex-col gap-6 p-4 sm:p-6"
            >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                            <Users className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">{canManage ? 'Grupos' : 'Mis grupos'}</h1>
                            <p className="text-muted-foreground text-sm">
                                {conteos.en_curso} en curso · {conteos.planeado} {conteos.planeado === 1 ? 'planeado' : 'planeados'}
                            </p>
                        </div>
                    </div>
                    {canManage && (
                        <Button asChild className="w-full shadow-sm sm:w-auto">
                            <Link href={route('grupos.create')}>
                                <Plus className="size-4" />
                                Abrir grupo
                            </Link>
                        </Button>
                    )}
                </div>

                <Card className="gap-0 overflow-hidden p-0">
                    {/* Toolbar: estado tabs with counts, then search and plantel. */}
                    <div className="flex flex-col gap-3 border-b p-3 sm:p-4">
                        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5" role="tablist" aria-label="Estado del grupo">
                            {PESTANAS.map((pestana) => {
                                const activa = filters.estado === pestana.valor;

                                return (
                                    <button
                                        key={pestana.etiqueta}
                                        type="button"
                                        role="tab"
                                        aria-selected={activa}
                                        onClick={() => visit({ estado: pestana.valor })}
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
                                            {conteos[pestana.conteo]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="relative flex-1">
                                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={canManage ? 'Buscar por clave, curso o profesor...' : 'Buscar por clave o curso...'}
                                    className="pl-9"
                                    aria-label="Buscar grupos"
                                />
                            </div>
                            {variosPlanteles && (
                                <Select
                                    value={filters.plantel_id ? String(filters.plantel_id) : TODOS}
                                    onValueChange={(v) => visit({ plantel_id: v === TODOS ? null : v })}
                                >
                                    <SelectTrigger className="sm:w-56" aria-label="Filtrar por plantel">
                                        <Building2 className="text-muted-foreground size-4" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={TODOS}>Todos los planteles</SelectItem>
                                        {planteles.map((plantel) => (
                                            <SelectItem key={plantel.id} value={String(plantel.id)}>
                                                {plantel.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>

                    {grupos.data.length === 0 ? (
                        <div className="flex flex-col items-center px-6 py-16 text-center">
                            <div className="bg-muted text-muted-foreground mb-4 flex size-12 items-center justify-center rounded-full">
                                <Users className="size-6" />
                            </div>
                            <p className="font-medium">{hayFiltros ? 'Ningún grupo coincide con los filtros' : 'Aún no hay grupos'}</p>
                            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                                {hayFiltros
                                    ? 'Prueba con otra búsqueda, otro estado u otro plantel.'
                                    : canManage
                                      ? 'Abre el primer grupo de un curso en uno de tus planteles.'
                                      : 'Cuando te asignen un grupo aparecerá aquí.'}
                            </p>
                            <div className="mt-5 flex gap-2">
                                {hayFiltros && (
                                    <Button variant="outline" onClick={limpiarFiltros}>
                                        <X className="size-4" />
                                        Limpiar filtros
                                    </Button>
                                )}
                                {canManage && !hayFiltros && (
                                    <Button asChild>
                                        <Link href={route('grupos.create')}>
                                            <Plus className="size-4" />
                                            Abrir grupo
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Wide screens: table (from xl; next to the sidebar it needs the room). */}
                            <div className="hidden overflow-x-auto xl:block">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-muted-foreground bg-muted/30 border-b text-xs tracking-wide uppercase">
                                            <th className="px-3 py-2.5 font-medium first:pl-4">Grupo</th>
                                            <th className="px-3 py-2.5 font-medium">{canManage ? 'Profesor y horario' : 'Horario'}</th>
                                            <th className="px-3 py-2.5 font-medium">Avance</th>
                                            <th className="px-3 py-2.5 font-medium">Ocupación</th>
                                            <th className="px-3 py-2.5 font-medium">Estado</th>
                                            <th className="w-10 px-2 py-2.5" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <AnimatePresence initial={false}>
                                            {grupos.data.map((grupo, index) => (
                                                <motion.tr
                                                    key={grupo.id}
                                                    layout
                                                    initial={{ opacity: 0, y: 6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.2, delay: index * 0.03 }}
                                                    className="group hover:bg-muted/40 cursor-pointer border-b transition-colors last:border-0"
                                                    onClick={() => router.visit(route('grupos.show', grupo.id))}
                                                >
                                                    <td className="px-3 py-3 first:pl-4">
                                                        <GrupoTitulo grupo={grupo} mostrarPlantel={variosPlanteles} />
                                                    </td>
                                                    <td className="space-y-1.5 px-3 py-3">
                                                        {canManage && <Profesor grupo={grupo} />}
                                                        <p className="text-muted-foreground flex items-center gap-1.5 text-xs whitespace-nowrap">
                                                            <Clock className="size-3.5 shrink-0" />
                                                            {describirDiasYHoras(grupo)} · {TURNOS[grupo.turno] ?? grupo.turno}
                                                        </p>
                                                    </td>
                                                    <td className="px-3 py-3 first:pl-4">
                                                        <AvanceGrupo grupo={grupo} />
                                                    </td>
                                                    <td className="px-3 py-3 first:pl-4">
                                                        <OcupacionBar inscritos={grupo.inscritos} cupo={grupo.cupo} />
                                                    </td>
                                                    <td className="px-3 py-3 first:pl-4">
                                                        <EstadoGrupoBadge estado={grupo.estado} />
                                                    </td>
                                                    <td className="px-2 py-3 text-right">
                                                        <ChevronRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>

                            {/* Phones and tablets: cards, two per row when there is room. */}
                            <div className="grid grid-cols-1 gap-3 p-3 sm:p-4 lg:grid-cols-2 xl:hidden">
                                <AnimatePresence initial={false}>
                                    {grupos.data.map((grupo, index) => (
                                        <motion.div
                                            key={grupo.id}
                                            layout
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2, delay: index * 0.03 }}
                                        >
                                            <Link
                                                href={route('grupos.show', grupo.id)}
                                                className="hover:border-primary/40 bg-card flex h-full flex-col gap-3 rounded-xl border p-4 transition-colors hover:shadow-sm"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <GrupoTitulo grupo={grupo} mostrarPlantel={variosPlanteles} />
                                                    <EstadoGrupoBadge estado={grupo.estado} className="shrink-0" />
                                                </div>
                                                <div className="space-y-2 text-sm">
                                                    {canManage && <Profesor grupo={grupo} />}
                                                    <p className="text-muted-foreground flex items-center gap-2">
                                                        <Clock className="size-4 shrink-0" />
                                                        <span>
                                                            {describirDiasYHoras(grupo)} · {TURNOS[grupo.turno] ?? grupo.turno}
                                                        </span>
                                                    </p>
                                                </div>
                                                <div className="mt-auto grid grid-cols-2 gap-4 border-t pt-3">
                                                    <AvanceGrupo grupo={grupo} />
                                                    <OcupacionBar inscritos={grupo.inscritos} cupo={grupo.cupo} />
                                                </div>
                                            </Link>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                    <span>
                                        {grupos.from ?? 0}–{grupos.to ?? 0} de {grupos.total}
                                    </span>
                                    <Select value={String(perPage)} onValueChange={(value) => visit({ per_page: value })}>
                                        <SelectTrigger className="h-8 w-18" aria-label="Grupos por página">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="15">15</SelectItem>
                                            <SelectItem value="20">20</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <span>por página</span>
                                </div>

                                <Pagination links={grupos.links} />
                            </div>
                        </>
                    )}
                </Card>
            </motion.div>
        </AppLayout>
    );
}

/** Curso badge (its clave), name, grupo clave and, with several planteles, the plantel. */
function GrupoTitulo({ grupo, mostrarPlantel }: { grupo: GrupoRow; mostrarPlantel: boolean }) {
    return (
        <div className="flex min-w-0 items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold tracking-wide">
                {grupo.curso_clave}
            </div>
            <div className="min-w-0">
                <Link
                    href={route('grupos.show', grupo.id)}
                    className="block leading-snug font-medium hover:underline"
                    onClick={(e) => e.stopPropagation()}
                >
                    {grupo.curso}
                </Link>
                <p className="text-muted-foreground truncate font-mono text-xs">{grupo.clave}</p>
                {mostrarPlantel && (
                    <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                        <Building2 className="size-3 shrink-0" />
                        {grupo.plantel}
                    </p>
                )}
            </div>
        </div>
    );
}

function Profesor({ grupo }: { grupo: GrupoRow }) {
    if (!grupo.profesor) {
        return <span className="text-destructive text-sm font-medium">Sin profesor asignado</span>;
    }

    return (
        <div className="flex min-w-0 items-center gap-2">
            <PersonaAvatar nombre={grupo.profesor} fotoUrl={grupo.profesor_foto_url} className="size-7" />
            <span className="truncate text-sm xl:max-w-52">{grupo.profesor}</span>
        </div>
    );
}

/** "Semana 15 de 35" with a bar while running, "Inicia en 23 días" while planned, otherwise the dates. */
function AvanceGrupo({ grupo }: { grupo: GrupoRow }) {
    const { avance } = grupo;

    if (avance?.semana && avance.semanas) {
        return (
            <div className="min-w-28 space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-medium whitespace-nowrap">
                        Semana {avance.semana} de {avance.semanas}
                    </span>
                    <span className="text-muted-foreground tabular-nums">{avance.porcentaje}%</span>
                </div>
                <div
                    className="bg-sidebar-primary/20 h-1.5 overflow-hidden rounded-full"
                    role="meter"
                    aria-label="Avance del curso"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={avance.porcentaje}
                >
                    <div className="bg-sidebar-primary h-full rounded-full" style={{ width: `${avance.porcentaje}%` }} />
                </div>
            </div>
        );
    }

    if (avance?.dias_para_inicio !== undefined) {
        return (
            <div className="text-xs">
                <p className="font-medium text-sky-700 dark:text-sky-300">
                    {avance.dias_para_inicio === 0
                        ? 'Inicia hoy'
                        : `Inicia en ${avance.dias_para_inicio} ${avance.dias_para_inicio === 1 ? 'día' : 'días'}`}
                </p>
                <p className="text-muted-foreground">{formatFecha(grupo.fecha_inicio)}</p>
            </div>
        );
    }

    return (
        <div className="text-muted-foreground text-xs">
            <p>{formatFecha(grupo.fecha_inicio)}</p>
            {grupo.fecha_fin && <p>al {formatFecha(grupo.fecha_fin)}</p>}
        </div>
    );
}
