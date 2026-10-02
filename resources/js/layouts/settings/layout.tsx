import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { KeyRound, type LucideIcon, Palette, Settings, UserRound } from 'lucide-react';
import { motion } from 'motion/react';

const SECCIONES: { titulo: string; descripcion: string; url: string; icono: LucideIcon }[] = [
    { titulo: 'Perfil', descripcion: 'Tu nombre, correo y datos', url: '/settings/profile', icono: UserRound },
    { titulo: 'Contraseña', descripcion: 'Seguridad de tu cuenta', url: '/settings/password', icono: KeyRound },
    { titulo: 'Apariencia', descripcion: 'Tema claro u oscuro', url: '/settings/appearance', icono: Palette },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const actual = window.location.pathname;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex max-w-5xl flex-col gap-6 p-4 sm:p-6"
        >
            <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                    <Settings className="size-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
                    <p className="text-muted-foreground text-sm">Tu cuenta, tu contraseña y cómo se ve el sistema</p>
                </div>
            </div>

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <nav aria-label="Secciones de configuración" className="lg:w-60 lg:shrink-0">
                    <ul className="grid grid-cols-3 gap-2 lg:flex lg:flex-col lg:gap-1">
                        {SECCIONES.map(({ titulo, descripcion, url, icono: Icono }) => {
                            const activa = actual === url;

                            return (
                                <li key={url}>
                                    <Link
                                        href={url}
                                        prefetch
                                        aria-current={activa ? 'page' : undefined}
                                        className={cn(
                                            'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition-colors sm:flex-row sm:gap-3 sm:px-3 sm:text-left lg:py-2.5',
                                            activa
                                                ? 'border-primary/30 bg-primary/10 text-primary'
                                                : 'bg-card hover:bg-muted text-foreground border-transparent lg:bg-transparent',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'flex size-8 shrink-0 items-center justify-center rounded-lg',
                                                activa ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            <Icono className="size-4" />
                                        </span>
                                        <span className="min-w-0 sm:pr-1">
                                            <span className="block text-sm font-medium">{titulo}</span>
                                            <span className="text-muted-foreground hidden text-xs lg:block">{descripcion}</span>
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="min-w-0 flex-1 space-y-6">{children}</div>
            </div>
        </motion.div>
    );
}
