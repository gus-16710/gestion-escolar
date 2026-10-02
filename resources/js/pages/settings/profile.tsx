import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { CalendarDays, IdCard, Info, LoaderCircle, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import { PersonaAvatar } from '@/components/persona-avatar';
import { AvisoGuardado, TarjetaAjustes } from '@/components/settings/tarjeta-ajustes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { ETIQUETA_ROLES } from '@/lib/permisos';
import { formatFecha } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Configuración', href: '/settings/profile' },
    { title: 'Perfil', href: '/settings/profile' },
];

type TipoFicha = 'director' | 'profesor' | 'alumno';

interface Cuenta {
    nombre: string;
    email: string;
    foto_url: string | null;
    roles: string[];
    tipo: TipoFicha | null;
    /** False when the account belongs to a person record: its name and email are changed there. */
    editable: boolean;
    miembro_desde: string | null;
    datos: { etiqueta: string; valor: string }[];
}

const FICHA: Record<TipoFicha, string> = { director: 'director', profesor: 'profesor', alumno: 'alumno' };

export default function Profile({ cuenta }: { cuenta: Cuenta }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Perfil" />

            <SettingsLayout>
                <Resumen cuenta={cuenta} />
                {cuenta.editable ? <FormularioCuenta cuenta={cuenta} /> : <DatosDeFicha cuenta={cuenta} />}
            </SettingsLayout>
        </AppLayout>
    );
}

/** Who the account is: photo, name, email, roles and since when. */
function Resumen({ cuenta }: { cuenta: Cuenta }) {
    return (
        <Card className="relative gap-0 overflow-hidden p-0">
            <div className="bg-sidebar relative h-20 overflow-hidden sm:h-24">
                <div className="bg-sidebar-primary/30 absolute -top-16 -left-10 size-48 rounded-full blur-3xl" />
                <div className="absolute -right-10 -bottom-20 size-56 rounded-full bg-sky-400/25 blur-3xl" />
            </div>
            <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:px-6">
                <PersonaAvatar
                    nombre={cuenta.nombre}
                    fotoUrl={cuenta.foto_url}
                    className="ring-card bg-card -mt-10 size-20 shadow-md ring-4 sm:-mt-12 sm:size-24"
                    fallbackClassName="text-xl sm:text-2xl bg-primary/10 text-primary font-semibold"
                />
                <div className="min-w-0 flex-1 sm:pb-1">
                    <h2 className="truncate text-xl font-semibold tracking-tight">{cuenta.nombre}</h2>
                    <p className="text-muted-foreground flex items-center gap-1.5 truncate text-sm">
                        <Mail className="size-3.5 shrink-0" />
                        {cuenta.email}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:pb-1">
                    {cuenta.roles.map((rol) => (
                        <span key={rol} className="bg-primary/10 text-primary flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
                            <ShieldCheck className="size-3" />
                            {ETIQUETA_ROLES[rol] ?? rol}
                        </span>
                    ))}
                    {cuenta.miembro_desde && (
                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                            <CalendarDays className="size-3" />
                            Desde {formatFecha(cuenta.miembro_desde)}
                        </span>
                    )}
                </div>
            </div>
        </Card>
    );
}

/** Administration accounts change their own name and email. */
function FormularioCuenta({ cuenta }: { cuenta: Cuenta }) {
    const { data, setData, patch, errors, processing, recentlySuccessful, isDirty } = useForm({
        name: cuenta.nombre,
        email: cuenta.email,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('profile.update'), { preserveScroll: true });
    };

    return (
        <form onSubmit={submit}>
            <TarjetaAjustes
                icono={UserRound}
                titulo="Datos de la cuenta"
                descripcion="Tu nombre como aparece en el sistema y el correo con el que inicias sesión."
                pie={
                    <>
                        <AvisoGuardado visible={recentlySuccessful} />
                        <Button disabled={processing || !isDirty}>
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            Guardar cambios
                        </Button>
                    </>
                }
            >
                <div className="grid gap-5 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nombre</Label>
                        <div className="relative">
                            <UserRound className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                            <Input
                                id="name"
                                className="h-11 pl-10"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                autoComplete="name"
                                placeholder="Nombre completo"
                            />
                        </div>
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email">Correo electrónico</Label>
                        <div className="relative">
                            <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                            <Input
                                id="email"
                                type="email"
                                className="h-11 pl-10"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                autoComplete="username"
                                placeholder="correo@ejemplo.com"
                            />
                        </div>
                        <InputError message={errors.email} />
                    </div>
                </div>
                <p className="text-muted-foreground mt-4 flex items-start gap-2 text-xs">
                    <Info className="mt-px size-3.5 shrink-0" />
                    Si cambias el correo, a partir de entonces inicias sesión con el nuevo.
                </p>
            </TarjetaAjustes>
        </form>
    );
}

/** Accounts of a director, profesor or alumno: their data comes from their record, read-only here. */
function DatosDeFicha({ cuenta }: { cuenta: Cuenta }) {
    const filas = [{ etiqueta: 'Nombre', valor: cuenta.nombre }, { etiqueta: 'Correo electrónico', valor: cuenta.email }, ...cuenta.datos];

    return (
        <TarjetaAjustes
            icono={IdCard}
            titulo="Tus datos"
            descripcion={cuenta.tipo ? `Vienen de tu ficha de ${FICHA[cuenta.tipo]} en la escuela.` : undefined}
        >
            <dl className="divide-y">
                {filas.map((fila) => (
                    <div key={fila.etiqueta} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[11rem_1fr] sm:gap-4">
                        <dt className="text-muted-foreground text-sm">{fila.etiqueta}</dt>
                        <dd className="text-sm font-medium break-words">{fila.valor}</dd>
                    </div>
                ))}
            </dl>
            <p className="bg-primary/5 text-foreground/80 border-primary/15 mt-5 flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm">
                <Info className="text-primary mt-0.5 size-4 shrink-0" />
                Tu nombre y tu correo los actualiza la dirección de tu plantel desde tu ficha. Si algo está mal, avísales; tu contraseña sí la puedes
                cambiar tú en «Contraseña».
            </p>
        </TarjetaAjustes>
    );
}
