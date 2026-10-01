import { moduleNavItems } from '@/components/app-sidebar';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Inicio', href: '/dashboard' }];

/** Start page for roles that don't have their own dashboard yet: a greeting and shortcuts to their modules. */
export default function Dashboard() {
    const { auth } = usePage<SharedData>().props;
    const nombre = auth.user.name.split(' ')[0];
    const modulos = moduleNavItems.filter((item) => auth.permissions.includes(item.permission));
    const fecha = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inicio" />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex max-w-4xl flex-col gap-6 p-4 sm:p-6"
            >
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Hola, {nombre}</h1>
                    <p className="text-muted-foreground text-sm first-letter:uppercase">{fecha}</p>
                </div>

                {modulos.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {modulos.map((modulo) => (
                            <Link key={modulo.url} href={modulo.url}>
                                <Card className="hover:border-primary/40 flex flex-row items-center gap-3 p-4 transition-colors">
                                    <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-md">
                                        {modulo.icon && <modulo.icon className="size-5" />}
                                    </div>
                                    <span className="flex-1 font-medium">{modulo.title}</span>
                                    <ChevronRight className="text-muted-foreground size-4" />
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <Card className="text-muted-foreground p-6 text-sm">
                        Tu cuenta todavía no tiene módulos asignados. Si crees que es un error, contacta a la administración.
                    </Card>
                )}
            </motion.div>
        </AppLayout>
    );
}
