import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { Pagination, type PaginationLink } from '@/components/pagination';
import { PersonaAvatar } from '@/components/persona-avatar';
import { GruposProfesor, type GrupoProfesor } from '@/components/profesores/grupos-profesor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { cn, formatTelefono } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { AlertCircle, AlertTriangle, Building2, KeyRound, Mail, Pencil, Phone, Plus, Search, UserRound, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface ProfesorRow {
    id: number;
    nombre_completo: string;
    foto_url: string | null;
    especialidad: string | null;
    telefono: string | null;
    email: string | null;
    activo: boolean;
    tiene_cuenta: boolean;
    grupos: GrupoProfesor[];
    estadisticas: {
        alumnos: number;
        horas_semana: number;
        asistencia: number | null;
        listas_atrasadas: number;
    };
}

interface PaginatedProfesores {
    data: ProfesorRow[];
    links: PaginationLink[];
    total: number;
    from: number | null;
    to: number | null;
}

type Situacion = 'con_grupos' | 'sin_grupo' | 'inactivos';

interface ProfesoresIndexProps {
    profesores: PaginatedProfesores;
    conteos: Record<'todos' | Situacion, number>;
    planteles: { id: number; nombre: string }[];
    filters: { search: string; plantel_id: number | null; situacion: Situacion | null };
    perPage: number;
    canManage: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Profesores', href: '/profesores' }];

const TODOS = 'all';

const PESTANAS: { valor: Situacion | null; etiqueta: string }[] = [
    { valor: null, etiqueta: 'Todos' },
    { valor: 'con_grupos', etiqueta: 'Con grupos' },
    { valor: 'sin_grupo', etiqueta: 'Sin grupo' },
    { valor: 'inactivos', etiqueta: 'Inactivos' },
];

export default function ProfesoresIndex({ profesores, conteos, planteles, filters, perPage, canManage }: ProfesoresIndexProps) {
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState(filters.search);
    const isFirstRender = useRef(true);
    const variosPlanteles = planteles.length > 1;
    const hayFiltros = filters.search !== '' || filters.plantel_id !== null || filters.situacion !== null;
    const atrasados = profesores.data.filter((profesor) => profesor.estadisticas.listas_atrasadas > 0).length;

    const visit = (overrides: Record<string, string | number | null>) => {
        router.get(
            route('profesores.index'),
            { search: searchTerm, plantel_id: filters.plantel_id, situacion: filters.situacion, per_page: perPage, ...overrides },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const limpiarFiltros = () => {
        setSearchTerm('');
        router.get(route('profesores.index'), { per_page: perPage }, { preserveScroll: true, replace: true });
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

    const handleDelete = (profesorId: number) => {
        setError(null);
        router.delete(route('profesores.destroy', profesorId), {
            preserveScroll: true,
            onError: (errors) => setError(errors.profesor ?? 'No se pudo eliminar al profesor.'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profesores" />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex flex-col gap-6 p-4 sm:p-6"
            >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                            <UserRound className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">Profesores</h1>
                            <p className="text-muted-foreground text-sm">
                                {conteos.con_grupos} con grupos
                                {conteos.sin_grupo > 0 && ` · ${conteos.sin_grupo} sin grupo`}
                                {atrasados > 0 && (
                                    <>
                                        {' · '}
                                        <span className="text-destructive font-medium">
                                            {atrasados} con {atrasados === 1 ? 'lista atrasada' : 'listas atrasadas'}
                                        </span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                    {canManage && (
                        <Button asChild className="w-full shadow-sm sm:w-auto">
                            <Link href={route('profesores.create')}>
                                <Plus className="size-4" />
                                Registrar profesor
                            </Link>
                        </Button>
                    )}
                </div>

                {error && (
                    <div className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-4 py-3 text-sm">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        <p className="flex-1">{error}</p>
                        <button type="button" onClick={() => setError(null)} className="opacity-70 hover:opacity-100" aria-label="Cerrar aviso">
                            <X className="size-4" />
                        </button>
                    </div>
                )}

                <Card className="gap-0 overflow-hidden p-0">
                    <div className="flex flex-col gap-3 border-b p-3 sm:p-4">
                        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5" role="tablist" aria-label="Situación del profesor">
                            {PESTANAS.map((pestana) => {
                                const activa = filters.situacion === pestana.valor;

                                return (
                                    <button
                                        key={pestana.etiqueta}
                                        type="button"
                                        role="tab"
                                        aria-selected={activa}
                                        onClick={() => visit({ situacion: pestana.valor })}
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
                                            {conteos[pestana.valor ?? 'todos']}
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
                                    placeholder="Nombre, especialidad o correo..."
                                    className="pl-9"
                                    aria-label="Buscar profesores"
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

                    {profesores.data.length === 0 ? (
                        <div className="flex flex-col items-center px-6 py-16 text-center">
                            <div className="bg-muted text-muted-foreground mb-4 flex size-12 items-center justify-center rounded-full">
                                <UserRound className="size-6" />
                            </div>
                            <p className="font-medium">{hayFiltros ? 'Ningún profesor coincide con los filtros' : 'Aún no hay profesores'}</p>
                            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                                {hayFiltros
                                    ? 'Prueba con otra búsqueda, otra pestaña u otro plantel.'
                                    : 'Registra al primer profesor para asignarle grupos.'}
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
                                        <Link href={route('profesores.create')}>
                                            <Plus className="size-4" />
                                            Registrar profesor
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-3 p-3 sm:p-4 lg:grid-cols-2 2xl:grid-cols-3">
                                <AnimatePresence initial={false}>
                                    {profesores.data.map((profesor, index) => (
                                        <motion.div
                                            key={profesor.id}
                                            layout
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2, delay: index * 0.03 }}
                                        >
                                            <TarjetaProfesor
                                                profesor={profesor}
                                                mostrarPlantel={variosPlanteles}
                                                acciones={
                                                    canManage && (
                                                        <>
                                                            <Button variant="outline" size="sm" asChild className="ml-auto">
                                                                <Link href={route('profesores.edit', profesor.id)}>
                                                                    <Pencil className="size-4" />
                                                                    Editar
                                                                </Link>
                                                            </Button>
                                                            <DeleteConfirmDialog
                                                                title={`¿Eliminar a ${profesor.nombre_completo}?`}
                                                                description="Sale de la lista de profesores; sus grupos concluidos conservan su nombre. Si tiene cuenta, la conserva pero pierde el acceso de profesor. No se puede eliminar mientras tenga grupos planeados o en curso."
                                                                onConfirm={() => handleDelete(profesor.id)}
                                                            />
                                                        </>
                                                    )
                                                }
                                            />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                    <span>
                                        {profesores.from ?? 0}–{profesores.to ?? 0} de {profesores.total}
                                    </span>
                                    <Select value={String(perPage)} onValueChange={(value) => visit({ per_page: value })}>
                                        <SelectTrigger className="h-8 w-18" aria-label="Profesores por página">
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

                                <Pagination links={profesores.links} />
                            </div>
                        </>
                    )}
                </Card>
            </motion.div>
        </AppLayout>
    );
}

function TarjetaProfesor({ profesor, mostrarPlantel, acciones }: { profesor: ProfesorRow; mostrarPlantel: boolean; acciones: ReactNode }) {
    const { estadisticas } = profesor;

    return (
        <article
            className={cn('bg-card flex h-full flex-col rounded-xl border transition-shadow hover:shadow-sm', !profesor.activo && 'bg-muted/30')}
        >
            <div className="flex items-start gap-3 p-4">
                <PersonaAvatar nombre={profesor.nombre_completo} fotoUrl={profesor.foto_url} className="size-14" />
                <div className="min-w-0 flex-1">
                    <h3 className="leading-snug font-semibold">{profesor.nombre_completo}</h3>
                    <p className="text-muted-foreground text-sm">{profesor.especialidad ?? 'Sin especialidad'}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                        {!profesor.activo && <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-medium">Inactivo</span>}
                        {profesor.tiene_cuenta ? (
                            <span className="text-muted-foreground flex items-center gap-1">
                                <KeyRound className="size-3" />
                                Con acceso
                            </span>
                        ) : (
                            <span className="text-muted-foreground/80">Sin acceso al sistema</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1.5 px-4 pb-3 text-sm">
                {profesor.telefono ? (
                    <a href={`tel:${profesor.telefono.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:underline">
                        <Phone className="text-muted-foreground size-4 shrink-0" />
                        {formatTelefono(profesor.telefono)}
                    </a>
                ) : (
                    <span className="text-muted-foreground flex items-center gap-2">
                        <Phone className="size-4 shrink-0" />
                        Sin teléfono
                    </span>
                )}
                {profesor.email && (
                    <a href={`mailto:${profesor.email}`} className="flex min-w-0 items-center gap-2 hover:underline">
                        <Mail className="text-muted-foreground size-4 shrink-0" />
                        <span className="truncate">{profesor.email}</span>
                    </a>
                )}
            </div>

            {estadisticas.listas_atrasadas > 0 && (
                <p className="bg-destructive/10 text-destructive mx-4 mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
                    <AlertTriangle className="size-4 shrink-0" />
                    {estadisticas.listas_atrasadas === 1 ? 'Un grupo lleva' : `${estadisticas.listas_atrasadas} grupos llevan`} más de una semana sin
                    pase de lista
                </p>
            )}

            <div className="flex-1 border-t px-4 py-3">
                <p className="text-muted-foreground mb-2 text-xs">
                    {profesor.grupos.length === 0
                        ? 'Grupos'
                        : `${profesor.grupos.length} ${profesor.grupos.length === 1 ? 'grupo activo' : 'grupos activos'}`}
                </p>
                <GruposProfesor grupos={profesor.grupos} mostrarPlantel={mostrarPlantel} vacio="Sin grupos planeados ni en curso" />
            </div>

            <dl className="grid grid-cols-3 divide-x border-t text-center">
                <Cifra etiqueta="Inscritos" valor={String(estadisticas.alumnos)} apagado={estadisticas.alumnos === 0} />
                <Cifra
                    etiqueta="h por semana"
                    valor={String(estadisticas.horas_semana).replace('.', ',')}
                    apagado={estadisticas.horas_semana === 0}
                    titulo="Horas de clase a la semana en sus grupos en curso"
                />
                <Cifra
                    etiqueta="Asistencia 30 d"
                    valor={estadisticas.asistencia === null ? '—' : `${estadisticas.asistencia}%`}
                    apagado={estadisticas.asistencia === null}
                    titulo="Asistencia de sus alumnos en los últimos 30 días"
                />
            </dl>

            {acciones && <div className="flex items-center gap-1 border-t px-3 py-2.5">{acciones}</div>}
        </article>
    );
}

function Cifra({ etiqueta, valor, apagado, titulo }: { etiqueta: string; valor: string; apagado: boolean; titulo?: string }) {
    return (
        <div className="flex flex-col-reverse px-1 py-2.5" title={titulo}>
            <dt className="text-muted-foreground mt-1 text-[11px]">{etiqueta}</dt>
            <dd className={cn('text-lg leading-none font-semibold tabular-nums', apagado && 'text-muted-foreground')}>{valor}</dd>
        </div>
    );
}
