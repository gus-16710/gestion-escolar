import { Head } from '@inertiajs/react';
import { Check, Monitor, Moon, Palette, Sun, type LucideIcon } from 'lucide-react';

import { TarjetaAjustes } from '@/components/settings/tarjeta-ajustes';
import { useAppearance, type Appearance } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Configuración', href: '/settings/profile' },
    { title: 'Apariencia', href: '/settings/appearance' },
];

const TEMAS: { valor: Appearance; titulo: string; descripcion: string; icono: LucideIcon }[] = [
    { valor: 'light', titulo: 'Claro', descripcion: 'Fondo claro, ideal de día.', icono: Sun },
    { valor: 'dark', titulo: 'Oscuro', descripcion: 'Descansa la vista de noche.', icono: Moon },
    { valor: 'system', titulo: 'Sistema', descripcion: 'Sigue el tema de tu equipo.', icono: Monitor },
];

export default function Appearance() {
    const { appearance, updateAppearance } = useAppearance();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Apariencia" />

            <SettingsLayout>
                <TarjetaAjustes icono={Palette} titulo="Tema" descripcion="Cómo se ve el sistema en este equipo. Se guarda en este navegador.">
                    <div role="radiogroup" aria-label="Tema" className="grid gap-4 sm:grid-cols-3">
                        {TEMAS.map(({ valor, titulo, descripcion, icono: Icono }) => {
                            const activo = appearance === valor;

                            return (
                                <button
                                    key={valor}
                                    type="button"
                                    role="radio"
                                    aria-checked={activo}
                                    onClick={() => updateAppearance(valor)}
                                    className={cn(
                                        'group relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all',
                                        activo
                                            ? 'border-primary shadow-md'
                                            : 'hover:border-primary/40 border-transparent ring-1 ring-black/5 dark:ring-white/10',
                                    )}
                                >
                                    <Miniatura tema={valor} />
                                    <span className="bg-card flex items-start gap-2.5 border-t p-3">
                                        <Icono className={cn('mt-0.5 size-4 shrink-0', activo ? 'text-primary' : 'text-muted-foreground')} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-medium">{titulo}</span>
                                            <span className="text-muted-foreground block text-xs">{descripcion}</span>
                                        </span>
                                        <span
                                            className={cn(
                                                'flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                                                activo ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30',
                                            )}
                                        >
                                            {activo && <Check className="size-3" strokeWidth={3} />}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </TarjetaAjustes>
            </SettingsLayout>
        </AppLayout>
    );
}

/** A tiny sketch of the app (sidebar, header, cards) in each theme; "system" shows both halves. */
function Miniatura({ tema }: { tema: Appearance }) {
    if (tema === 'system') {
        return (
            <span className="relative block h-28 overflow-hidden">
                <span className="absolute inset-0 [clip-path:polygon(0_0,100%_0,0_100%)]">
                    <Boceto oscuro={false} />
                </span>
                <span className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]">
                    <Boceto oscuro />
                </span>
            </span>
        );
    }

    return (
        <span className="block h-28 overflow-hidden">
            <Boceto oscuro={tema === 'dark'} />
        </span>
    );
}

function Boceto({ oscuro }: { oscuro: boolean }) {
    return (
        <span className={cn('flex h-full gap-2 p-2.5', oscuro ? 'bg-[#0f1722]' : 'bg-[#eef3f8]')}>
            <span className={cn('flex w-1/4 flex-col gap-1.5 rounded-md p-1.5', oscuro ? 'bg-[#131c29]' : 'bg-[#1f5a96]')}>
                <span className="h-1.5 w-3/4 rounded-full bg-[#84c441]" />
                <span className={cn('h-1 rounded-full', oscuro ? 'bg-white/20' : 'bg-white/40')} />
                <span className={cn('h-1 rounded-full', oscuro ? 'bg-white/20' : 'bg-white/40')} />
                <span className={cn('h-1 w-2/3 rounded-full', oscuro ? 'bg-white/20' : 'bg-white/40')} />
            </span>
            <span className="flex flex-1 flex-col gap-1.5">
                <span className={cn('h-2 w-1/2 rounded-full', oscuro ? 'bg-white/30' : 'bg-slate-400/60')} />
                <span className="grid flex-1 grid-cols-2 gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                        <span key={i} className={cn('flex flex-col gap-1 rounded-md p-1.5', oscuro ? 'bg-[#1a2433]' : 'bg-white shadow-sm')}>
                            <span className={cn('h-1 w-2/3 rounded-full', oscuro ? 'bg-white/25' : 'bg-slate-300')} />
                            <span className={cn('h-1.5 w-1/3 rounded-full', i === 0 ? 'bg-[#2f7fd1]' : oscuro ? 'bg-white/15' : 'bg-slate-200')} />
                        </span>
                    ))}
                </span>
            </span>
        </span>
    );
}
