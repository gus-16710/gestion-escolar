import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn, formatFecha, formatTelefono } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    Building2,
    CalendarClock,
    CalendarDays,
    ClipboardCheck,
    Clock,
    Layers,
    LogIn,
    Mail,
    MapPin,
    Navigation,
    Phone,
    QrCode,
    ScanLine,
    Users,
} from 'lucide-react';
import { type FormEventHandler, useState } from 'react';
import {
    Aparecer,
    type AperturaPublica,
    type CursoPublico,
    duracionLegible,
    EncabezadoSeccion,
    enlaceInformes,
    estiloCurso,
    IconoWhatsApp,
    Imagen,
    type PlantelPublico,
} from './comun';
import { SECCIONES } from './portada';

/** The academic offer: one card per active curso, with its study plan in a dialog. */
export function Oferta({ cursos, whatsapp }: { cursos: CursoPublico[]; whatsapp: string | null }) {
    const [abierto, setAbierto] = useState<CursoPublico | null>(null);

    return (
        <section id="oferta" className="scroll-mt-20 py-20 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <EncabezadoSeccion
                    etiqueta="Oferta académica"
                    titulo="Elige el curso que te acerca a tu meta"
                    texto="Cada curso avanza módulo por módulo: teoría y práctica en el aula, con calificaciones y asistencia que puedes consultar en línea."
                />

                <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {cursos.map((curso, indice) => {
                        const estilo = estiloCurso(curso.clave);
                        const Icono = estilo.icono;
                        const informes = enlaceInformes(whatsapp, `Hola, quiero informes del curso de ${curso.nombre}.`);

                        return (
                            <Aparecer key={curso.id} retraso={(indice % 3) * 0.08} className="h-full">
                                <Card className="group relative h-full gap-0 overflow-hidden p-0 transition-shadow hover:shadow-xl">
                                    {curso.imagen ? (
                                        // With a photo: it heads the card, with the curso's icon and next start over it.
                                        <div className="relative aspect-[3/2] overflow-hidden">
                                            <Imagen
                                                imagen={curso.imagen}
                                                alt={`Alumnos del curso de ${curso.nombre}`}
                                                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                                            <div className={cn('absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r', estilo.degradado)} />
                                            <span
                                                className={cn(
                                                    'absolute bottom-4 left-4 flex size-11 items-center justify-center rounded-xl bg-white shadow-lg',
                                                    estilo.acento,
                                                )}
                                            >
                                                <Icono className="size-5" />
                                            </span>
                                            {curso.proxima_apertura && (
                                                <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-emerald-700 shadow">
                                                    <CalendarClock className="size-3.5" />
                                                    Inicia {formatFecha(curso.proxima_apertura)}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className={cn('h-1.5 bg-gradient-to-r', estilo.degradado)} />
                                    )}
                                    <div className="flex flex-1 flex-col p-6">
                                        {!curso.imagen && (
                                            <div className="mb-5 flex items-start justify-between gap-3">
                                                <span
                                                    className={cn(
                                                        'flex size-12 items-center justify-center rounded-2xl',
                                                        estilo.suave,
                                                        estilo.acento,
                                                    )}
                                                >
                                                    <Icono className="size-6" />
                                                </span>
                                                {curso.proxima_apertura && (
                                                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                                        <CalendarClock className="size-3.5" />
                                                        Inicia {formatFecha(curso.proxima_apertura)}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <h3 className="text-xl font-semibold">{curso.nombre}</h3>
                                        <p className="text-muted-foreground mt-2 line-clamp-4 text-sm leading-relaxed">{curso.descripcion}</p>

                                        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                                            {duracionLegible(curso.duracion_semanas) && (
                                                <div className="bg-muted/60 rounded-xl px-3 py-2">
                                                    <dt className="text-muted-foreground flex items-center gap-1 text-xs">
                                                        <Clock className="size-3" /> Duración
                                                    </dt>
                                                    <dd className="font-semibold">{duracionLegible(curso.duracion_semanas)}</dd>
                                                </div>
                                            )}
                                            {curso.modulos.length > 0 && (
                                                <div className="bg-muted/60 rounded-xl px-3 py-2">
                                                    <dt className="text-muted-foreground flex items-center gap-1 text-xs">
                                                        <Layers className="size-3" /> Plan de estudios
                                                    </dt>
                                                    <dd className="font-semibold">{curso.modulos.length} módulos</dd>
                                                </div>
                                            )}
                                        </dl>

                                        {curso.planteles.length > 0 && (
                                            <p className="text-muted-foreground mt-4 flex items-start gap-1.5 text-xs">
                                                <Building2 className="mt-px size-3.5 shrink-0" />
                                                {curso.planteles.join(' · ')}
                                            </p>
                                        )}

                                        <div className="mt-6 flex flex-wrap gap-2 pt-1">
                                            {curso.modulos.length > 0 && (
                                                <Button variant="outline" size="sm" onClick={() => setAbierto(curso)}>
                                                    Ver plan de estudios
                                                </Button>
                                            )}
                                            <Button asChild size="sm" variant="ghost" className={estilo.acento}>
                                                <a href={informes.href} target={informes.externo ? '_blank' : undefined} rel="noopener">
                                                    {whatsapp ? 'Pedir informes' : 'Dónde estudiarlo'}
                                                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </Aparecer>
                        );
                    })}
                </div>
            </div>

            <Dialog open={abierto !== null} onOpenChange={(valor) => !valor && setAbierto(null)}>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl [&>button:last-child]:z-10 [&>button:last-child]:rounded-full [&>button:last-child]:bg-white/90 [&>button:last-child]:p-1.5 [&>button:last-child]:text-slate-700 [&>button:last-child]:opacity-100 [&>button:last-child]:shadow">
                    {abierto && <PlanDeEstudios curso={abierto} whatsapp={whatsapp} />}
                </DialogContent>
            </Dialog>
        </section>
    );
}

function PlanDeEstudios({ curso, whatsapp }: { curso: CursoPublico; whatsapp: string | null }) {
    const estilo = estiloCurso(curso.clave);
    const Icono = estilo.icono;
    const informes = enlaceInformes(whatsapp, `Hola, quiero informes del curso de ${curso.nombre}.`);

    return (
        <>
            {curso.imagen && (
                <div className="relative -mx-6 -mt-6 mb-1 h-40 shrink-0 overflow-hidden sm:h-52 sm:rounded-t-lg">
                    <Imagen imagen={curso.imagen} alt={`Alumnos del curso de ${curso.nombre}`} className="absolute inset-0 size-full object-cover" />
                </div>
            )}
            <DialogHeader>
                <div className="flex items-center gap-3">
                    <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', estilo.suave, estilo.acento)}>
                        <Icono className="size-5" />
                    </span>
                    <div className="text-left">
                        <DialogTitle className="text-xl">{curso.nombre}</DialogTitle>
                        <DialogDescription>
                            Plan de estudios · {curso.modulos.length} módulos
                            {duracionLegible(curso.duracion_semanas) && ` · ${duracionLegible(curso.duracion_semanas)}`}
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            <ol className="relative mt-2 space-y-1 before:absolute before:top-3 before:bottom-3 before:left-[15px] before:w-px before:bg-current before:opacity-15">
                {curso.modulos.map((modulo) => (
                    <li key={modulo.orden} className="relative flex gap-4 rounded-xl p-2">
                        <span
                            className={cn(
                                'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow',
                                estilo.degradado,
                            )}
                        >
                            {modulo.orden}
                        </span>
                        <div className="min-w-0 pt-1">
                            <p className="flex flex-wrap items-baseline gap-x-2 font-medium">
                                {modulo.nombre}
                                <span className="text-muted-foreground text-xs font-normal">
                                    {modulo.semanas} {modulo.semanas === 1 ? 'semana' : 'semanas'}
                                </span>
                            </p>
                            {modulo.descripcion && <p className="text-muted-foreground mt-0.5 text-sm">{modulo.descripcion}</p>}
                        </div>
                    </li>
                ))}
            </ol>

            {whatsapp && (
                <Button asChild className="mt-2 w-full sm:w-auto sm:self-end">
                    <a href={informes.href} target="_blank" rel="noopener">
                        <IconoWhatsApp />
                        Pedir informes de este curso
                    </a>
                </Button>
            )}
        </>
    );
}

/** Why CICCIS: every point is something the system really does. */
export function Ventajas({ cupoMaximo }: { cupoMaximo: number | null }) {
    const puntos = [
        { icono: Layers, titulo: 'Plan por módulos', texto: 'Cada curso avanza por módulos con objetivos claros; sabes siempre qué sigue.' },
        {
            icono: Users,
            titulo: 'Grupos pequeños',
            texto: cupoMaximo
                ? `Grupos de hasta ${cupoMaximo} alumnos para que el profesor te acompañe.`
                : 'Atención cercana del profesor en cada clase.',
        },
        { icono: ClipboardCheck, titulo: 'Tu avance en línea', texto: 'Consulta tus calificaciones, asistencias y horario con tu cuenta de alumno.' },
        {
            icono: BadgeCheck,
            titulo: 'Documentos verificables',
            texto: 'Boletas y constancias con folio y código QR que cualquiera puede comprobar.',
        },
    ];

    return (
        <section className="bg-muted/40 border-y py-20 sm:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <EncabezadoSeccion etiqueta="¿Por qué CICCIS?" titulo="Formación práctica, con seguimiento de principio a fin" />
                <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {puntos.map(({ icono: Icono, titulo, texto }, indice) => (
                        <Aparecer key={titulo} retraso={indice * 0.07}>
                            <div className="bg-card h-full rounded-2xl border p-6 shadow-sm">
                                <span className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-xl shadow-lg shadow-blue-500/20">
                                    <Icono className="size-5" />
                                </span>
                                <h3 className="mt-5 font-semibold">{titulo}</h3>
                                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{texto}</p>
                            </div>
                        </Aparecer>
                    ))}
                </div>
            </div>
        </section>
    );
}

/** Grupos about to start, with the places left. */
export function Aperturas({ aperturas, whatsapp }: { aperturas: AperturaPublica[]; whatsapp: string | null }) {
    if (aperturas.length === 0) return null;

    return (
        <section id="aperturas" className="scroll-mt-20 py-20 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <EncabezadoSeccion
                    etiqueta="Próximos grupos"
                    titulo="Aparta tu lugar en el siguiente inicio"
                    texto="Los lugares se actualizan con cada inscripción. Al llenarse el cupo, el grupo se cierra."
                />

                <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {aperturas.map((apertura, indice) => {
                        const estilo = estiloCurso(apertura.curso_clave);
                        const Icono = estilo.icono;
                        const ocupacion = apertura.cupo ? 100 - (100 * (apertura.lugares ?? 0)) / apertura.cupo : 0;
                        const pocos = apertura.lugares !== null && apertura.lugares <= 3;
                        const informes = enlaceInformes(
                            whatsapp,
                            `Hola, quiero apartar un lugar en ${apertura.curso} (${apertura.plantel}), que inicia el ${formatFecha(apertura.fecha_inicio)}.`,
                        );

                        return (
                            <Aparecer key={apertura.id} retraso={(indice % 3) * 0.07}>
                                <div className="bg-card flex h-full flex-col rounded-2xl border p-5 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <span
                                            className={cn(
                                                'flex size-11 shrink-0 items-center justify-center rounded-xl',
                                                estilo.suave,
                                                estilo.acento,
                                            )}
                                        >
                                            <Icono className="size-5" />
                                        </span>
                                        <div className="min-w-0">
                                            <h3 className="truncate font-semibold">{apertura.curso}</h3>
                                            <p className="text-muted-foreground flex items-center gap-1 text-xs">
                                                <MapPin className="size-3" />
                                                {apertura.plantel}
                                            </p>
                                        </div>
                                    </div>

                                    <dl className="mt-5 space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="text-muted-foreground size-4 shrink-0" />
                                            <dt className="sr-only">Inicio</dt>
                                            <dd>
                                                Inicia el <span className="font-semibold">{formatFecha(apertura.fecha_inicio)}</span>
                                            </dd>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="text-muted-foreground size-4 shrink-0" />
                                            <dt className="sr-only">Horario</dt>
                                            <dd>
                                                {apertura.turno}
                                                {apertura.horario && ` · ${apertura.horario}`}
                                            </dd>
                                        </div>
                                    </dl>

                                    {apertura.lugares !== null && apertura.cupo && (
                                        <div className="mt-5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span
                                                    className={cn(
                                                        'font-semibold',
                                                        pocos ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400',
                                                    )}
                                                >
                                                    {apertura.lugares === 0
                                                        ? 'Cupo lleno'
                                                        : `${apertura.lugares} ${apertura.lugares === 1 ? 'lugar disponible' : 'lugares disponibles'}`}
                                                </span>
                                                <span className="text-muted-foreground">Cupo de {apertura.cupo}</span>
                                            </div>
                                            <div className="bg-muted mt-1.5 h-2 overflow-hidden rounded-full">
                                                <div
                                                    className={cn('h-full rounded-full', pocos ? 'bg-amber-500' : 'bg-emerald-500')}
                                                    style={{ width: `${Math.max(4, ocupacion)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-auto pt-5">
                                        <Button
                                            asChild
                                            variant={whatsapp ? 'default' : 'outline'}
                                            className="w-full"
                                            disabled={apertura.lugares === 0}
                                        >
                                            <a href={informes.href} target={informes.externo ? '_blank' : undefined} rel="noopener">
                                                {whatsapp ? <IconoWhatsApp /> : <MapPin className="size-4" />}
                                                {whatsapp ? 'Apartar mi lugar' : 'Inscríbete en el plantel'}
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            </Aparecer>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

/** Each active plantel: address with a map, contact when there is one, and what it offers. */
export function Planteles({ planteles, whatsapp }: { planteles: PlantelPublico[]; whatsapp: string | null }) {
    return (
        <section id="planteles" className="bg-muted/40 scroll-mt-20 border-y py-20 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <EncabezadoSeccion
                    etiqueta="Planteles"
                    titulo={planteles.length === 1 ? 'Visítanos' : `${planteles.length} planteles cerca de ti`}
                    texto="Acércate a pedir informes e inscribirte en el plantel que te quede mejor."
                />

                <div className={cn('mt-14 grid gap-8', planteles.length > 1 && 'lg:grid-cols-2')}>
                    {planteles.map((plantel, indice) => {
                        const mapa = `https://www.google.com/maps?q=${encodeURIComponent(plantel.direccion)}&output=embed`;
                        const comoLlegar = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(plantel.direccion)}`;
                        const informes = enlaceInformes(whatsapp, `Hola, quiero informes del plantel ${plantel.nombre}.`);

                        return (
                            <Aparecer key={plantel.id} retraso={indice * 0.1}>
                                <Card className="h-full gap-0 overflow-hidden p-0">
                                    <VistaPlantel plantel={plantel} mapa={mapa} />
                                    <div className="flex flex-1 flex-col p-6">
                                        <div className="flex items-start gap-3">
                                            <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                                                <Building2 className="size-5" />
                                            </span>
                                            <div>
                                                <h3 className="text-lg font-semibold">{plantel.nombre}</h3>
                                                <p className="text-muted-foreground text-sm">{plantel.localidad}</p>
                                            </div>
                                        </div>

                                        <ul className="mt-5 space-y-2.5 text-sm">
                                            <li className="flex items-start gap-2.5">
                                                <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                                                {plantel.direccion}
                                            </li>
                                            {plantel.telefono && (
                                                <li className="flex items-center gap-2.5">
                                                    <Phone className="text-muted-foreground size-4 shrink-0" />
                                                    <a href={`tel:${plantel.telefono}`} className="hover:underline">
                                                        {formatTelefono(plantel.telefono)}
                                                    </a>
                                                </li>
                                            )}
                                            {plantel.email && (
                                                <li className="flex items-center gap-2.5">
                                                    <Mail className="text-muted-foreground size-4 shrink-0" />
                                                    <a href={`mailto:${plantel.email}`} className="hover:underline">
                                                        {plantel.email}
                                                    </a>
                                                </li>
                                            )}
                                        </ul>

                                        {plantel.cursos.length > 0 && (
                                            <div className="mt-5">
                                                <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">Cursos en este plantel</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {plantel.cursos.map((curso) => {
                                                        const estilo = estiloCurso(curso.clave);
                                                        const Icono = estilo.icono;

                                                        return (
                                                            <span
                                                                key={curso.clave}
                                                                className={cn(
                                                                    'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                                                                    estilo.suave,
                                                                    estilo.acento,
                                                                )}
                                                            >
                                                                <Icono className="size-3" />
                                                                {curso.nombre}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-6 flex flex-wrap gap-2 pt-1">
                                            <Button asChild variant="outline" size="sm">
                                                <a href={comoLlegar} target="_blank" rel="noopener">
                                                    <Navigation className="size-3.5" />
                                                    Cómo llegar
                                                </a>
                                            </Button>
                                            {whatsapp && (
                                                <Button asChild size="sm">
                                                    <a href={informes.href} target="_blank" rel="noopener">
                                                        <IconoWhatsApp />
                                                        Pedir informes
                                                    </a>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </Aparecer>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

/** The plantel's photo with a "Foto | Mapa" switch, or just its map while it has no photo. */
function VistaPlantel({ plantel, mapa }: { plantel: PlantelPublico; mapa: string }) {
    const [vista, setVista] = useState<'foto' | 'mapa'>(plantel.imagen ? 'foto' : 'mapa');

    return (
        <div className="bg-muted relative aspect-[16/9]">
            {vista === 'foto' && plantel.imagen ? (
                <Imagen
                    imagen={plantel.imagen}
                    alt={`${plantel.localidad || plantel.nombre}, donde está el plantel`}
                    className="absolute inset-0 size-full object-cover"
                />
            ) : (
                <iframe
                    title={`Mapa de ${plantel.nombre}`}
                    src={mapa}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="absolute inset-0 size-full border-0 grayscale-[30%]"
                />
            )}
            {plantel.imagen && (
                <div
                    className="absolute top-3 left-3 flex gap-1 rounded-full bg-white/95 p-1 text-xs font-medium text-slate-700 shadow"
                    role="tablist"
                >
                    {(['foto', 'mapa'] as const).map((opcion) => (
                        <button
                            key={opcion}
                            type="button"
                            role="tab"
                            aria-selected={vista === opcion}
                            onClick={() => setVista(opcion)}
                            className={cn(
                                'rounded-full px-3 py-1 transition-colors',
                                vista === opcion ? 'bg-primary text-white' : 'hover:bg-slate-100',
                            )}
                        >
                            {opcion === 'foto' ? 'Foto' : 'Mapa'}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/** Anyone holding a boleta or constancia can check it here (or by scanning its QR). */
export function Verificar() {
    const [codigo, setCodigo] = useState('');

    const verificar: FormEventHandler = (e) => {
        e.preventDefault();
        const limpio = codigo.trim().split('/').pop() ?? '';

        if (limpio) window.location.href = route('verificacion.show', limpio);
    };

    return (
        <section id="verificar" className="scroll-mt-20 py-20 sm:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <Aparecer>
                    <div className="bg-sidebar text-sidebar-foreground relative overflow-hidden rounded-3xl px-6 py-12 sm:px-12 lg:flex lg:items-center lg:gap-12">
                        <div className="bg-sidebar-primary/25 absolute -top-24 -right-24 size-80 rounded-full blur-3xl" />
                        <QrCode className="absolute -bottom-10 -left-6 size-56 opacity-[0.06]" />
                        <div className="relative lg:flex-1">
                            <p className="text-sidebar-primary flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
                                <ScanLine className="size-4" />
                                Verificación de documentos
                            </p>
                            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                                ¿Te entregaron una boleta o constancia de CICCIS?
                            </h2>
                            <p className="text-sidebar-foreground/75 mt-3 max-w-xl">
                                Escanea su código QR o escribe el código que aparece debajo para comprobar que es auténtica y sigue vigente.
                            </p>
                        </div>
                        <form onSubmit={verificar} className="relative mt-8 flex w-full flex-col gap-2 sm:flex-row lg:mt-0 lg:max-w-md">
                            <Input
                                value={codigo}
                                onChange={(e) => setCodigo(e.target.value)}
                                placeholder="Código de verificación"
                                aria-label="Código de verificación"
                                className="text-foreground bg-card h-12 border-0"
                            />
                            <Button
                                type="submit"
                                size="lg"
                                className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 h-12"
                            >
                                <BadgeCheck className="size-4" />
                                Verificar
                            </Button>
                        </form>
                    </div>
                </Aparecer>
            </div>
        </section>
    );
}

/** Closing call to action. */
export function Cierre({ whatsapp, conSesion }: { whatsapp: string | null; conSesion: boolean }) {
    const informes = enlaceInformes(whatsapp, 'Hola, quiero informes para inscribirme en CICCIS.');

    return (
        <section className="pb-20 sm:pb-28">
            <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
                <Aparecer>
                    <AppLogoIcon className="text-primary mx-auto size-14" />
                    <h2 className="mt-6 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Tu siguiente paso empieza hoy</h2>
                    <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-lg">
                        Pide informes, conoce el plantel y aparta tu lugar en el próximo grupo.
                    </p>
                    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <Button asChild size="lg" className="h-12 px-6 text-base">
                            <a href={informes.href} target={informes.externo ? '_blank' : undefined} rel="noopener">
                                {whatsapp ? <IconoWhatsApp /> : <MapPin className="size-4" />}
                                {whatsapp ? 'Escríbenos por WhatsApp' : 'Ver planteles'}
                            </a>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
                            <Link href={conSesion ? route('dashboard') : route('login')}>
                                <LogIn className="size-4" />
                                {conSesion ? 'Ir a mi panel' : 'Ya soy alumno'}
                            </Link>
                        </Button>
                    </div>
                </Aparecer>
            </div>
        </section>
    );
}

export function PiePagina({ planteles }: { planteles: PlantelPublico[] }) {
    return (
        <footer className="bg-sidebar text-sidebar-foreground">
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_1fr_1.4fr] lg:px-8">
                <div>
                    <div className="flex items-center gap-2.5">
                        <AppLogoIcon className="text-sidebar-primary size-10" />
                        <span className="text-xl font-bold tracking-widest">CICCIS</span>
                    </div>
                    <p className="text-sidebar-foreground/70 mt-4 max-w-xs text-sm">Cursos y capacitación con plan de estudios por módulos.</p>
                </div>
                <div>
                    <p className="text-sm font-semibold">Explora</p>
                    <ul className="text-sidebar-foreground/70 mt-4 space-y-2 text-sm">
                        {SECCIONES.map((seccion) => (
                            <li key={seccion.id}>
                                <a href={`#${seccion.id}`} className="hover:text-sidebar-foreground transition-colors">
                                    {seccion.titulo}
                                </a>
                            </li>
                        ))}
                        <li>
                            <Link href={route('login')} className="hover:text-sidebar-foreground transition-colors">
                                Acceso para alumnos y personal
                            </Link>
                        </li>
                    </ul>
                </div>
                <div>
                    <p className="text-sm font-semibold">Planteles</p>
                    <ul className="text-sidebar-foreground/70 mt-4 space-y-4 text-sm">
                        {planteles.map((plantel) => (
                            <li key={plantel.id} className="flex items-start gap-2">
                                <MapPin className="text-sidebar-primary mt-0.5 size-4 shrink-0" />
                                <span>
                                    <span className="text-sidebar-foreground block font-medium">{plantel.nombre}</span>
                                    {plantel.direccion}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="border-t border-white/10">
                <p className="text-sidebar-foreground/60 mx-auto max-w-7xl px-4 py-5 text-xs sm:px-6 lg:px-8">
                    © {new Date().getFullYear()} CICCIS. Todos los derechos reservados.
                </p>
            </div>
        </footer>
    );
}
