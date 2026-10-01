import { CursosAlumno, type CursoInscrito } from '@/components/alumnos/cursos-alumno';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { Pagination, type PaginationLink } from '@/components/pagination';
import { PersonaAvatar } from '@/components/persona-avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { cn, formatTelefono } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { AlertCircle, Building2, GraduationCap, KeyRound, Mail, Pencil, Phone, Plus, Search, Users, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

interface AlumnoRow {
    id: number;
    matricula: string;
    nombre_completo: string;
    foto_url: string | null;
    telefono: string | null;
    email: string | null;
    activo: boolean;
    tiene_cuenta: boolean;
    cursos: CursoInscrito[];
}

interface PaginatedAlumnos {
    data: AlumnoRow[];
    links: PaginationLink[];
    total: number;
    from: number | null;
    to: number | null;
}

type Situacion = 'inscritos' | 'sin_grupo' | 'en_riesgo' | 'inactivos';

interface Filters {
    search: string;
    plantel_id: number | null;
    curso_id: number | null;
    situacion: Situacion | null;
}

interface AlumnosIndexProps {
    alumnos: PaginatedAlumnos;
    conteos: Record<'todos' | Situacion, number>;
    planteles: { id: number; nombre: string }[];
    cursos: { id: number; nombre: string }[];
    filters: Filters;
    perPage: number;
    canManage: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Alumnos', href: '/alumnos' }];

const TODOS = 'all';

const PESTANAS: { valor: Situacion | null; etiqueta: string; soloGestion?: boolean; alerta?: boolean }[] = [
    { valor: null, etiqueta: 'Todos' },
    { valor: 'inscritos', etiqueta: 'Inscritos' },
    { valor: 'en_riesgo', etiqueta: 'En riesgo', alerta: true },
    { valor: 'sin_grupo', etiqueta: 'Sin grupo', soloGestion: true },
    { valor: 'inactivos', etiqueta: 'Inactivos', soloGestion: true },
];

export default function AlumnosIndex({ alumnos, conteos, planteles, cursos, filters, perPage, canManage }: AlumnosIndexProps) {
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState(filters.search);
    const isFirstRender = useRef(true);
    const variosPlanteles = planteles.length > 1;
    const hayFiltros = filters.search !== '' || filters.plantel_id !== null || filters.curso_id !== null || filters.situacion !== null;

    const visit = (overrides: Record<string, string | number | null>) => {
        router.get(
            route('alumnos.index'),
            {
                search: searchTerm,
                plantel_id: filters.plantel_id,
                curso_id: filters.curso_id,
                situacion: filters.situacion,
                per_page: perPage,
                ...overrides,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const limpiarFiltros = () => {
        setSearchTerm('');
        router.get(route('alumnos.index'), { per_page: perPage }, { preserveScroll: true, replace: true });
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

    const handleDelete = (alumnoId: number) => {
        setError(null);
        router.delete(route('alumnos.destroy', alumnoId), {
            preserveScroll: true,
            onError: (errors) => setError(errors.alumno ?? 'No se pudo eliminar al alumno.'),
        });
    };

    const acciones = (alumno: AlumnoRow) =>
        canManage && (
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={route('alumnos.edit', alumno.id)} onClick={(e) => e.stopPropagation()}>
                        <Pencil className="size-4" />
                        <span className="sr-only">Editar a {alumno.nombre_completo}</span>
                    </Link>
                </Button>
                <span onClick={(e) => e.stopPropagation()}>
                    <DeleteConfirmDialog
                        title={`¿Eliminar a ${alumno.nombre_completo}?`}
                        description="Sale de la lista de alumnos; su historial de inscripciones y asistencia se conserva. Si tiene cuenta, la conserva pero pierde el acceso de alumno. No se puede eliminar mientras esté inscrito en algún grupo."
                        onConfirm={() => handleDelete(alumno.id)}
                    />
                </span>
            </div>
        );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Alumnos" />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex flex-col gap-6 p-4 sm:p-6"
            >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                            <GraduationCap className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">{canManage ? 'Alumnos' : 'Mis alumnos'}</h1>
                            <p className="text-muted-foreground text-sm">
                                {conteos.inscritos} {conteos.inscritos === 1 ? 'inscrito' : 'inscritos'}
                                {conteos.en_riesgo > 0 && (
                                    <>
                                        {' · '}
                                        <span className="text-destructive font-medium">{conteos.en_riesgo} en riesgo</span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                    {canManage && (
                        <Button asChild className="w-full shadow-sm sm:w-auto">
                            <Link href={route('alumnos.create')}>
                                <Plus className="size-4" />
                                Registrar alumno
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
                    {/* Toolbar: situación tabs with counts, then search, plantel and curso. */}
                    <div className="flex flex-col gap-3 border-b p-3 sm:p-4">
                        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5" role="tablist" aria-label="Situación del alumno">
                            {PESTANAS.filter((pestana) => canManage || !pestana.soloGestion).map((pestana) => {
                                const activa = filters.situacion === pestana.valor;
                                const conteo = conteos[pestana.valor ?? 'todos'];

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
                                                activa
                                                    ? 'bg-primary-foreground/20'
                                                    : pestana.alerta && conteo > 0
                                                      ? 'bg-destructive/10 text-destructive'
                                                      : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            {conteo}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex flex-col gap-3 lg:flex-row">
                            <div className="relative flex-1">
                                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Nombre, matrícula, CURP o correo..."
                                    className="pl-9"
                                    aria-label="Buscar alumnos"
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex">
                                {variosPlanteles && (
                                    <Select
                                        value={filters.plantel_id ? String(filters.plantel_id) : TODOS}
                                        onValueChange={(v) => visit({ plantel_id: v === TODOS ? null : v })}
                                    >
                                        <SelectTrigger className="lg:w-52" aria-label="Filtrar por plantel">
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
                                {cursos.length > 1 && (
                                    <Select
                                        value={filters.curso_id ? String(filters.curso_id) : TODOS}
                                        onValueChange={(v) => visit({ curso_id: v === TODOS ? null : v })}
                                    >
                                        <SelectTrigger className="lg:w-56" aria-label="Filtrar por curso">
                                            <GraduationCap className="text-muted-foreground size-4" />
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={TODOS}>Todos los cursos</SelectItem>
                                            {cursos.map((curso) => (
                                                <SelectItem key={curso.id} value={String(curso.id)}>
                                                    {curso.nombre}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>
                    </div>

                    {alumnos.data.length === 0 ? (
                        <div className="flex flex-col items-center px-6 py-16 text-center">
                            <div className="bg-muted text-muted-foreground mb-4 flex size-12 items-center justify-center rounded-full">
                                <Users className="size-6" />
                            </div>
                            <p className="font-medium">
                                {filters.situacion === 'en_riesgo' && !filters.search
                                    ? 'Nadie está en riesgo'
                                    : hayFiltros
                                      ? 'Ningún alumno coincide con los filtros'
                                      : 'Aún no hay alumnos'}
                            </p>
                            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                                {filters.situacion === 'en_riesgo' && !filters.search
                                    ? 'Todos los alumnos inscritos van arriba del 80% de asistencia.'
                                    : hayFiltros
                                      ? 'Prueba con otra búsqueda, otra pestaña u otro filtro.'
                                      : canManage
                                        ? 'Registra al primer alumno y luego inscríbelo en un grupo.'
                                        : 'Cuando inscriban alumnos en tus grupos aparecerán aquí.'}
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
                                        <Link href={route('alumnos.create')}>
                                            <Plus className="size-4" />
                                            Registrar alumno
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Wide screens: table. */}
                            <div className="hidden overflow-x-auto xl:block">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-muted-foreground bg-muted/30 border-b text-xs tracking-wide uppercase">
                                            <th className="px-3 py-2.5 pl-4 font-medium">Alumno</th>
                                            <th className="px-3 py-2.5 font-medium">Cursos y asistencia</th>
                                            <th className="px-3 py-2.5 font-medium">Contacto</th>
                                            {canManage && <th className="w-24 px-3 py-2.5" />}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <AnimatePresence initial={false}>
                                            {alumnos.data.map((alumno, index) => (
                                                <motion.tr
                                                    key={alumno.id}
                                                    layout
                                                    initial={{ opacity: 0, y: 6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.2, delay: index * 0.02 }}
                                                    className={cn(
                                                        'hover:bg-muted/40 border-b align-top transition-colors last:border-0',
                                                        canManage && 'cursor-pointer',
                                                        !alumno.activo && 'opacity-70',
                                                    )}
                                                    onClick={canManage ? () => router.visit(route('alumnos.edit', alumno.id)) : undefined}
                                                >
                                                    <td className="px-3 py-3 pl-4">
                                                        <Identidad alumno={alumno} />
                                                    </td>
                                                    <td className="w-[42%] px-3 py-3">
                                                        <CursosAlumno cursos={alumno.cursos} enlazar mostrarPlantel={variosPlanteles} />
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <Contacto alumno={alumno} />
                                                    </td>
                                                    {canManage && <td className="px-3 py-2">{acciones(alumno)}</td>}
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>

                            {/* Phones and tablets: cards, two per row when there is room. */}
                            <div className="grid grid-cols-1 gap-3 p-3 sm:p-4 lg:grid-cols-2 xl:hidden">
                                <AnimatePresence initial={false}>
                                    {alumnos.data.map((alumno, index) => (
                                        <motion.div
                                            key={alumno.id}
                                            layout
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2, delay: index * 0.02 }}
                                            className={cn('bg-card flex flex-col gap-3 rounded-xl border p-4', !alumno.activo && 'opacity-70')}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <Identidad alumno={alumno} />
                                                {acciones(alumno)}
                                            </div>
                                            <div className="border-t pt-3">
                                                <CursosAlumno cursos={alumno.cursos} enlazar mostrarPlantel={variosPlanteles} />
                                            </div>
                                            {(alumno.telefono || alumno.email) && (
                                                <div className="border-t pt-3">
                                                    <Contacto alumno={alumno} />
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                    <span>
                                        {alumnos.from ?? 0}–{alumnos.to ?? 0} de {alumnos.total}
                                    </span>
                                    <Select value={String(perPage)} onValueChange={(value) => visit({ per_page: value })}>
                                        <SelectTrigger className="h-8 w-18" aria-label="Alumnos por página">
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

                                <Pagination links={alumnos.links} />
                            </div>
                        </>
                    )}
                </Card>
            </motion.div>
        </AppLayout>
    );
}

/** Photo, name, matrícula, whether they can log in and, when inactive, a tag. */
function Identidad({ alumno }: { alumno: AlumnoRow }) {
    return (
        <div className="flex min-w-0 items-center gap-3">
            <PersonaAvatar nombre={alumno.nombre_completo} fotoUrl={alumno.foto_url} className="size-10" />
            <div className="min-w-0">
                <p className="leading-snug font-medium">{alumno.nombre_completo}</p>
                <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                    <span className="font-mono">{alumno.matricula}</span>
                    {alumno.tiene_cuenta && (
                        <span className="flex items-center gap-1" title="Puede iniciar sesión">
                            <KeyRound className="size-3" />
                            Con acceso
                        </span>
                    )}
                    {!alumno.activo && <span className="bg-muted rounded px-1.5 font-medium">Inactivo</span>}
                </p>
            </div>
        </div>
    );
}

function Contacto({ alumno }: { alumno: AlumnoRow }) {
    if (!alumno.telefono && !alumno.email) {
        return <span className="text-muted-foreground text-xs">Sin datos de contacto</span>;
    }

    return (
        <div className="min-w-0 space-y-1 text-xs">
            {alumno.telefono && (
                <a
                    href={`tel:${alumno.telefono.replace(/\s/g, '')}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 whitespace-nowrap hover:underline"
                >
                    <Phone className="text-muted-foreground size-3.5 shrink-0" />
                    {formatTelefono(alumno.telefono)}
                </a>
            )}
            {alumno.email && (
                <a
                    href={`mailto:${alumno.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-muted-foreground flex min-w-0 items-center gap-1.5 hover:underline"
                >
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate xl:max-w-56">{alumno.email}</span>
                </a>
            )}
        </div>
    );
}
