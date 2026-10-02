import AppLogoIcon from '@/components/app-logo-icon';
import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { CalendarDays, ClipboardCheck, FileText, GraduationCap, type LucideIcon, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthLayoutProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
}

const FUNCIONES: { icono: LucideIcon; titulo: string; texto: string }[] = [
    { icono: ClipboardCheck, titulo: 'Pase de lista', texto: 'Asistencia por clase y alertas de alumnos en riesgo.' },
    { icono: GraduationCap, titulo: 'Calificaciones', texto: 'Boletas por módulo, recuperaciones y cierre de grupo.' },
    { icono: FileText, titulo: 'Reportes en PDF', texto: 'Boletas y constancias con folio y código QR.' },
    { icono: CalendarDays, titulo: 'Calendario escolar', texto: 'Días sin clase y fin de curso ajustado solo.' },
];

/**
 * CICCIS sign-in pages: a brand panel (blue, with the emblem and what the system does) beside the form;
 * on phones the panel shrinks to a header strip.
 */
export default function AuthCiccisLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="bg-background grid min-h-svh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            <PanelMarca />

            <main className="relative flex min-h-svh flex-col lg:min-h-0">
                {/* Phone header: the brand strip. */}
                <div className="bg-sidebar text-sidebar-foreground relative overflow-hidden px-4 pt-5 pb-14 lg:hidden">
                    <Decoracion compacta />
                    <div className="relative flex items-center justify-between">
                        <Marca />
                        <AppearanceToggleDropdown className="[&_button]:text-sidebar-foreground [&_button]:hover:bg-white/10" />
                    </div>
                </div>

                <AppearanceToggleDropdown className="absolute top-5 right-5 hidden lg:block" />

                <div className="-mt-9 flex flex-1 items-start justify-center px-4 pb-8 sm:px-8 lg:mt-0 lg:items-center lg:py-12">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className="bg-card relative w-full max-w-md rounded-2xl border p-6 shadow-xl shadow-black/5 sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
                    >
                        <div className="mb-7 space-y-1.5">
                            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
                            {description && <p className="text-muted-foreground text-sm text-pretty">{description}</p>}
                        </div>
                        {children}
                    </motion.div>
                </div>

                <p className="text-muted-foreground px-4 pb-6 text-center text-xs">
                    © {new Date().getFullYear()} CICCIS · Sistema de gestión escolar
                </p>
            </main>
        </div>
    );
}

function Marca() {
    return (
        <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <AppLogoIcon className="text-sidebar-primary size-7" />
            </span>
            <span className="leading-tight">
                <span className="block text-lg font-bold tracking-widest">CICCIS</span>
                <span className="text-sidebar-foreground/70 block text-xs">Gestión escolar</span>
            </span>
        </div>
    );
}

function PanelMarca() {
    return (
        <aside className="bg-sidebar text-sidebar-foreground relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
            <Decoracion />

            <div className="relative">
                <Marca />
            </div>

            <div className="relative max-w-lg">
                <motion.h2
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance xl:text-5xl"
                >
                    Tu plantel, <span className="text-sidebar-primary">en orden</span> y en un solo lugar.
                </motion.h2>
                <p className="text-sidebar-foreground/75 mt-4 max-w-md text-base">
                    Grupos, alumnos, asistencias y calificaciones de cada curso, al día para la dirección, los profesores y los alumnos.
                </p>

                <ul className="mt-10 grid gap-3 xl:grid-cols-2">
                    {FUNCIONES.map(({ icono: Icono, titulo, texto }, indice) => (
                        <motion.li
                            key={titulo}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: 0.15 + indice * 0.07, ease: 'easeOut' }}
                            className="flex gap-3 rounded-xl bg-white/[0.06] p-3.5 ring-1 ring-white/10 backdrop-blur-sm"
                        >
                            <span className="bg-sidebar-primary/15 text-sidebar-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                                <Icono className="size-[18px]" />
                            </span>
                            <span>
                                <span className="block text-sm font-semibold">{titulo}</span>
                                <span className="text-sidebar-foreground/70 block text-xs leading-snug">{texto}</span>
                            </span>
                        </motion.li>
                    ))}
                </ul>
            </div>

            <p className="text-sidebar-foreground/60 relative flex items-center gap-2 text-xs">
                <ShieldCheck className="size-3.5" />
                Acceso exclusivo para el personal y los alumnos de CICCIS
            </p>
        </aside>
    );
}

/** Soft light, a dotted texture and the emblem as a large watermark. */
function Decoracion({ compacta = false }: { compacta?: boolean }) {
    return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="bg-sidebar-primary/25 absolute -top-32 -left-24 size-96 rounded-full blur-3xl" />
            <div className="absolute -right-32 -bottom-40 size-[28rem] rounded-full bg-sky-400/20 blur-3xl" />
            <div
                className="absolute inset-0 opacity-[0.07]"
                style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '22px 22px' }}
            />
            {compacta ? (
                <AppLogoIcon className="absolute -top-6 -right-8 size-40 text-white/[0.06]" />
            ) : (
                <AppLogoIcon className="absolute -right-24 -bottom-24 size-[30rem] text-white/[0.05]" />
            )}
        </div>
    );
}
