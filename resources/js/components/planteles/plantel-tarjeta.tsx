import { EstadoActivoBadge } from '@/components/estado-activo-badge';
import { PersonaAvatar } from '@/components/persona-avatar';
import { cn, formatFecha, formatTelefono } from '@/lib/utils';
import { AlertTriangle, CalendarClock, ExternalLink, Mail, MapPin, Phone } from 'lucide-react';
import { type ReactNode } from 'react';

export interface DireccionPlantel {
    calle: string;
    numero_exterior: string;
    numero_interior: string | null;
    colonia: string;
    codigo_postal: string;
    localidad: string;
    municipio: string;
    estado: string;
}

export interface PlantelResumen extends DireccionPlantel {
    nombre: string;
    clave: string;
    telefono: string | null;
    email: string | null;
    activo: boolean;
}

export interface CursoOfertado {
    id: number;
    nombre: string;
    clave: string;
    activo: boolean;
}

export interface DirectorPlantel {
    nombre: string;
    foto_url: string | null;
}

export interface EstadisticasPlantel {
    grupos_en_curso: number;
    grupos_planeados: number;
    alumnos: number;
    profesores: number;
}

/** "División del Norte 101 Int. 3, Col. Centro" */
export function lineaCalle(d: Pick<DireccionPlantel, 'calle' | 'numero_exterior' | 'numero_interior' | 'colonia'>): string {
    const numero = [d.numero_exterior, d.numero_interior && `Int. ${d.numero_interior}`].filter(Boolean).join(' ');

    return [[d.calle, numero].filter(Boolean).join(' '), d.colonia && `Col. ${d.colonia}`].filter(Boolean).join(', ');
}

/** "Rafael Lucio, Veracruz", naming the municipio only when it differs from the localidad. */
export function ubicacion(d: Pick<DireccionPlantel, 'localidad' | 'municipio' | 'estado'>): string {
    const municipio = d.municipio && d.municipio !== d.localidad ? d.municipio : null;

    return [d.localidad, municipio, d.estado].filter(Boolean).join(', ');
}

export function urlMapa(d: DireccionPlantel): string {
    const consulta = [lineaCalle(d), d.codigo_postal, ubicacion(d), 'México'].filter(Boolean).join(', ');

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
}

function diasHasta(fecha: string): number {
    const [y, m, d] = fecha.split('-').map(Number);
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    return Math.round((new Date(y, m - 1, d).getTime() - inicio.getTime()) / 86_400_000);
}

/**
 * One plantel: clave, name, where it is, how to reach it, who runs it, what it teaches and how busy it is.
 * Shared by the list and the form's preview (which leaves out the parts that come from other records).
 */
export function PlantelTarjeta({
    plantel,
    estadisticas,
    proximaApertura,
    directores,
    cursos,
    acciones,
    className,
}: {
    plantel: PlantelResumen;
    estadisticas?: EstadisticasPlantel;
    proximaApertura?: string | null;
    directores?: DirectorPlantel[];
    cursos?: CursoOfertado[];
    acciones?: ReactNode;
    className?: string;
}) {
    const calle = lineaCalle(plantel);
    const lugar = [plantel.codigo_postal && `C.P. ${plantel.codigo_postal}`, ubicacion(plantel)].filter(Boolean).join(' · ');
    const aunNoAbre = estadisticas && estadisticas.grupos_en_curso === 0 && proximaApertura;

    return (
        <article className={cn('bg-card flex h-full flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-sm', className)}>
            <div className="flex items-start gap-3 p-4 pb-3">
                <div
                    className={cn(
                        'flex size-12 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold',
                        plantel.activo ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                        plantel.clave.length > 3 && 'text-[10px]',
                    )}
                >
                    {plantel.clave || '—'}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="leading-snug font-semibold">{plantel.nombre || 'Nombre del plantel'}</h3>
                        <EstadoActivoBadge activo={plantel.activo} className="mt-0.5 shrink-0" />
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-sm">{ubicacion(plantel) || 'Ubicación sin definir'}</p>
                </div>
            </div>

            {aunNoAbre && (
                <p className="mx-4 mb-1 flex items-center gap-2 rounded-lg bg-sky-500/10 px-3 py-2 text-sm text-sky-800 dark:text-sky-300">
                    <CalendarClock className="size-4 shrink-0" />
                    <span>
                        <span className="font-medium">Abre el {formatFecha(proximaApertura)}</span>
                        {diasHasta(proximaApertura) > 0 &&
                            ` · faltan ${diasHasta(proximaApertura)} ${diasHasta(proximaApertura) === 1 ? 'día' : 'días'}`}
                    </span>
                </p>
            )}

            <div className="flex flex-1 flex-col gap-3 px-4 pt-2 pb-4 text-sm">
                <div className="flex items-start gap-2.5">
                    <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <div className="min-w-0">
                        <p>{calle || <span className="text-muted-foreground">Dirección sin capturar</span>}</p>
                        {lugar && <p className="text-muted-foreground text-xs">{lugar}</p>}
                        {calle && plantel.localidad && (
                            <a
                                href={urlMapa(plantel)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary mt-0.5 inline-flex items-center gap-1 text-xs font-medium hover:underline"
                            >
                                Ver en el mapa
                                <ExternalLink className="size-3" />
                            </a>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {plantel.telefono ? (
                        <a href={`tel:${plantel.telefono.replace(/\s/g, '')}`} className="flex items-center gap-2.5 hover:underline">
                            <Phone className="text-muted-foreground size-4 shrink-0" />
                            {formatTelefono(plantel.telefono)}
                        </a>
                    ) : (
                        <span className="text-muted-foreground flex items-center gap-2.5">
                            <Phone className="size-4 shrink-0" />
                            Sin teléfono
                        </span>
                    )}
                    {plantel.email ? (
                        <a href={`mailto:${plantel.email}`} className="flex min-w-0 items-center gap-2.5 hover:underline">
                            <Mail className="text-muted-foreground size-4 shrink-0" />
                            <span className="truncate">{plantel.email}</span>
                        </a>
                    ) : (
                        <span className="text-muted-foreground flex items-center gap-2.5">
                            <Mail className="size-4 shrink-0" />
                            Sin correo
                        </span>
                    )}
                </div>

                {directores && (
                    <div className="flex items-center gap-2.5">
                        {directores.length === 0 ? (
                            <p className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="size-4 shrink-0" />
                                Sin director asignado
                            </p>
                        ) : (
                            <>
                                <div className="flex -space-x-2">
                                    {directores.map((director) => (
                                        <PersonaAvatar
                                            key={director.nombre}
                                            nombre={director.nombre}
                                            fotoUrl={director.foto_url}
                                            className="ring-card size-7 ring-2"
                                            fallbackClassName="text-[10px]"
                                        />
                                    ))}
                                </div>
                                <p className="min-w-0">
                                    <span className="text-muted-foreground text-xs">Dirección · </span>
                                    {directores.map((director) => director.nombre).join(', ')}
                                </p>
                            </>
                        )}
                    </div>
                )}

                {cursos && (
                    <div className="mt-auto space-y-1.5 pt-1">
                        <p className="text-muted-foreground text-xs">
                            {cursos.length === 0 ? 'Aún no imparte cursos' : `Imparte ${cursos.length} ${cursos.length === 1 ? 'curso' : 'cursos'}`}
                        </p>
                        {cursos.length > 0 && (
                            <ul className="flex flex-wrap gap-1.5">
                                {cursos.map((curso) => (
                                    <li
                                        key={curso.id}
                                        title={`${curso.nombre}${curso.activo ? '' : ' (inactivo)'}`}
                                        className={cn(
                                            'rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold',
                                            curso.activo ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground line-through',
                                        )}
                                    >
                                        {curso.clave}
                                        <span className="sr-only"> {curso.nombre}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            {estadisticas && (
                <dl className="grid grid-cols-4 divide-x border-t text-center">
                    <Cifra etiqueta="En curso" valor={estadisticas.grupos_en_curso} />
                    <Cifra etiqueta="Planeados" valor={estadisticas.grupos_planeados} />
                    <Cifra etiqueta="Alumnos" valor={estadisticas.alumnos} />
                    <Cifra etiqueta="Profesores" valor={estadisticas.profesores} />
                </dl>
            )}

            {acciones && <div className="flex items-center gap-2 border-t px-3 py-2.5">{acciones}</div>}
        </article>
    );
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: number }) {
    return (
        <div className="flex flex-col-reverse px-1 py-2.5">
            <dt className="text-muted-foreground mt-1 text-[11px]">{etiqueta}</dt>
            <dd className={cn('text-lg leading-none font-semibold tabular-nums', valor === 0 && 'text-muted-foreground')}>{valor}</dd>
        </div>
    );
}
