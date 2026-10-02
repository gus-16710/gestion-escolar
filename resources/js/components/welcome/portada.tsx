import AppLogoIcon from '@/components/app-logo-icon';
import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn, formatFecha } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowRight, CalendarClock, CheckCircle2, LayoutGrid, LogIn, Menu, QrCode, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { type AperturaPublica, type CursoPublico, enlaceInformes, IconoWhatsApp, Imagen, type ImagenSitio } from './comun';

export const SECCIONES = [
    { id: 'oferta', titulo: 'Oferta académica' },
    { id: 'aperturas', titulo: 'Próximos grupos' },
    { id: 'planteles', titulo: 'Planteles' },
    { id: 'verificar', titulo: 'Verificar documento' },
];

/** Sticky top bar: brand, section links, theme and the way in (or back to the panel when signed in). */
export function BarraSuperior({ conSesion }: { conSesion: boolean }) {
    const [desplazado, setDesplazado] = useState(false);
    const [menu, setMenu] = useState(false);

    useEffect(() => {
        const alDesplazar = () => setDesplazado(window.scrollY > 12);
        alDesplazar();
        window.addEventListener('scroll', alDesplazar, { passive: true });

        return () => window.removeEventListener('scroll', alDesplazar);
    }, []);

    const acceso = conSesion ? (
        <Button asChild>
            <Link href={route('dashboard')}>
                <LayoutGrid className="size-4" />
                Ir a mi panel
            </Link>
        </Button>
    ) : (
        <Button asChild>
            <Link href={route('login')}>
                <LogIn className="size-4" />
                Iniciar sesión
            </Link>
        </Button>
    );

    return (
        <header
            className={cn(
                'fixed inset-x-0 top-0 z-50 transition-all duration-300',
                desplazado ? 'bg-background/85 border-b shadow-sm backdrop-blur-lg' : 'bg-transparent',
            )}
        >
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                <a href="#inicio" className="flex items-center gap-2.5">
                    <AppLogoIcon className="text-primary size-9" />
                    <span className="leading-tight">
                        <span className="block text-lg font-bold tracking-widest">CICCIS</span>
                        <span className="text-muted-foreground hidden text-[11px] sm:block">Cursos y capacitación</span>
                    </span>
                </a>

                <nav aria-label="Secciones" className="hidden items-center gap-1 lg:flex">
                    {SECCIONES.map((seccion) => (
                        <a
                            key={seccion.id}
                            href={`#${seccion.id}`}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md px-3 py-2 text-sm font-medium transition-colors"
                        >
                            {seccion.titulo}
                        </a>
                    ))}
                </nav>

                <div className="flex items-center gap-2">
                    <AppearanceToggleDropdown />
                    <div className="hidden sm:block">{acceso}</div>
                    <Sheet open={menu} onOpenChange={setMenu}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
                                <Menu className="size-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-72">
                            <SheetHeader>
                                <SheetTitle className="flex items-center gap-2">
                                    <AppLogoIcon className="text-primary size-7" />
                                    CICCIS
                                </SheetTitle>
                            </SheetHeader>
                            <nav aria-label="Secciones" className="flex flex-col gap-1 px-4">
                                {SECCIONES.map((seccion) => (
                                    <a
                                        key={seccion.id}
                                        href={`#${seccion.id}`}
                                        onClick={() => setMenu(false)}
                                        className="hover:bg-muted rounded-md px-3 py-2.5 text-sm font-medium"
                                    >
                                        {seccion.titulo}
                                    </a>
                                ))}
                            </nav>
                            <div className="mt-auto p-4 [&_a]:w-full">{acceso}</div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}

/** The opening screen: headline, calls to action, the catalog figures and a visual built from real data. */
export function Hero({
    cursos,
    aperturas,
    cifras,
    whatsapp,
    portada,
}: {
    cursos: CursoPublico[];
    aperturas: AperturaPublica[];
    cifras: { cursos: number; planteles: number; modulos: number };
    whatsapp: string | null;
    portada: ImagenSitio | null;
}) {
    const informes = enlaceInformes(whatsapp, 'Hola, quiero informes de los cursos de CICCIS.');

    return (
        <section id="inicio" className="relative overflow-hidden pt-28 pb-16 sm:pt-32 lg:pt-36 lg:pb-24">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div className="bg-primary/15 absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full blur-3xl" />
                <div className="bg-sidebar-primary/15 absolute top-40 -left-40 size-96 rounded-full blur-3xl" />
                <div
                    className="text-foreground absolute inset-0 opacity-[0.04]"
                    style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }}
                />
            </div>

            <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-8">
                <div>
                    {aperturas.length > 0 && (
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="bg-card text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-sm"
                        >
                            <span className="bg-sidebar-primary size-2 animate-pulse rounded-full" />
                            Inscripciones abiertas
                        </motion.p>
                    )}

                    <motion.h1
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.05 }}
                        className="mt-5 text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
                    >
                        Aprende un oficio,{' '}
                        <span className="from-primary bg-gradient-to-r to-sky-500 bg-clip-text text-transparent">construye tu futuro.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.12 }}
                        className="text-muted-foreground mt-6 max-w-xl text-lg text-pretty"
                    >
                        Cursos prácticos de{' '}
                        {cursos
                            .map((curso) => curso.nombre.toLowerCase())
                            .join(', ')
                            .replace(/, ([^,]*)$/, ' y $1')}
                        , con un plan de estudios por módulos y grupos pequeños.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.18 }}
                        className="mt-8 flex flex-col gap-3 sm:flex-row"
                    >
                        <Button asChild size="lg" className="h-12 px-6 text-base shadow-lg shadow-blue-500/20">
                            <a href="#oferta">
                                Conoce la oferta académica
                                <ArrowRight className="size-4" />
                            </a>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="bg-card/80 h-12 px-6 text-base">
                            <a href={informes.href} target={informes.externo ? '_blank' : undefined} rel="noopener">
                                {whatsapp ? <IconoWhatsApp className="text-emerald-600" /> : null}
                                {whatsapp ? 'Pedir informes' : 'Visítanos'}
                            </a>
                        </Button>
                    </motion.div>

                    <motion.dl
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t pt-6"
                    >
                        {[
                            { valor: cifras.cursos, etiqueta: cifras.cursos === 1 ? 'curso' : 'cursos' },
                            { valor: cifras.planteles, etiqueta: cifras.planteles === 1 ? 'plantel' : 'planteles' },
                            { valor: cifras.modulos, etiqueta: 'módulos de formación' },
                        ].map((cifra) => (
                            <div key={cifra.etiqueta}>
                                <dt className="sr-only">{cifra.etiqueta}</dt>
                                <dd className="text-3xl font-semibold tabular-nums">{cifra.valor}</dd>
                                <dd className="text-muted-foreground text-sm">{cifra.etiqueta}</dd>
                            </div>
                        ))}
                    </motion.dl>
                </div>

                <Composicion cursos={cursos} apertura={aperturas[0] ?? null} portada={portada} />
            </div>
        </section>
    );
}

/** The hero's visual: the cover photo (or, without one, the emblem on the brand panel) with floating cards taken from the catalog. */
function Composicion({ cursos, apertura, portada }: { cursos: CursoPublico[]; apertura: AperturaPublica | null; portada: ImagenSitio | null }) {
    const ejemplo = cursos.find((curso) => curso.modulos.length > 0) ?? null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            className={cn('relative mx-auto w-full', portada ? 'max-w-md lg:mr-0 lg:max-w-[32rem]' : 'max-w-lg lg:max-w-none')}
        >
            {portada ? (
                <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[#1f5a96] shadow-2xl shadow-blue-900/30">
                    <Imagen
                        imagen={portada}
                        alt="Alumnos de CICCIS de enfermería, barbería, estilismo e informática caminando juntos por el plantel"
                        prioridad
                        className="absolute inset-0 size-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
                    <span className="absolute top-4 right-4 flex size-12 items-center justify-center rounded-2xl bg-white/90 shadow-lg backdrop-blur">
                        <AppLogoIcon className="text-primary size-8" />
                    </span>
                </div>
            ) : (
                <div className="relative aspect-[5/4] overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1f5a96] via-[#1b4d82] to-[#123a63] text-white shadow-2xl shadow-blue-900/30">
                    <div className="bg-sidebar-primary/30 absolute -top-20 -left-16 size-72 rounded-full blur-3xl" />
                    <div className="absolute -right-24 -bottom-24 size-96 rounded-full bg-sky-400/25 blur-3xl" />
                    <div
                        className="absolute inset-0 opacity-[0.08]"
                        style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                    />
                    <AppLogoIcon className="text-sidebar-primary absolute top-1/2 left-1/2 size-48 -translate-x-1/2 -translate-y-1/2 opacity-90 drop-shadow-2xl sm:size-56" />
                </div>
            )}

            {apertura && (
                <Flotante className="-top-5 -left-3 sm:-left-8" retraso={0.35}>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <CalendarClock className="size-5" />
                    </span>
                    <span>
                        <span className="text-muted-foreground block text-[11px] font-medium uppercase">Próximo inicio</span>
                        <span className="block text-sm font-semibold">{apertura.curso}</span>
                        <span className="text-muted-foreground block text-xs">
                            {formatFecha(apertura.fecha_inicio)}
                            {apertura.lugares !== null && ` · ${apertura.lugares} lugares`}
                        </span>
                    </span>
                </Flotante>
            )}

            {ejemplo && (
                <Flotante className="top-1/3 -right-3 hidden sm:-right-8 sm:flex" retraso={0.5}>
                    <span className="w-44">
                        <span className="text-muted-foreground block text-[11px] font-medium uppercase">Plan de estudios</span>
                        <span className="block truncate text-sm font-semibold">{ejemplo.nombre}</span>
                        <span className="mt-2 flex gap-1">
                            {ejemplo.modulos.slice(0, 8).map((modulo, indice) => (
                                <span key={modulo.orden} className={cn('h-1.5 flex-1 rounded-full', indice < 3 ? 'bg-primary' : 'bg-muted')} />
                            ))}
                        </span>
                        <span className="text-muted-foreground mt-1 block text-xs">{ejemplo.modulos.length} módulos</span>
                    </span>
                </Flotante>
            )}

            <Flotante className="-bottom-6 left-6 sm:left-10" retraso={0.65}>
                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                    <QrCode className="size-5" />
                </span>
                <span>
                    <span className="flex items-center gap-1 text-sm font-semibold">
                        Constancia verificable
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                    </span>
                    <span className="text-muted-foreground block text-xs">Con folio y código QR</span>
                </span>
            </Flotante>

            <Flotante className="right-6 -bottom-6 hidden md:flex" retraso={0.8}>
                <span className="bg-sidebar-primary/15 text-sidebar-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                    <Users className="size-5" />
                </span>
                <span className="text-sm font-semibold">Grupos pequeños</span>
            </Flotante>
        </motion.div>
    );
}

function Flotante({ children, className, retraso }: { children: React.ReactNode; className?: string; retraso: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: [0, -6, 0] }}
            transition={{ opacity: { duration: 0.4, delay: retraso }, y: { duration: 5, delay: retraso, repeat: Infinity, ease: 'easeInOut' } }}
            className={cn('bg-card/95 absolute z-10 flex items-center gap-3 rounded-2xl border p-3 shadow-xl backdrop-blur', className)}
        >
            {children}
        </motion.div>
    );
}
