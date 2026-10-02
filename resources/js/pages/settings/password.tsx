import { CampoContrasena } from '@/components/campo-contrasena';
import InputError from '@/components/input-error';
import { AvisoGuardado, TarjetaAjustes } from '@/components/settings/tarjeta-ajustes';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Check, KeyRound, Lightbulb, LoaderCircle, X } from 'lucide-react';
import { FormEventHandler, useRef } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Configuración', href: '/settings/profile' },
    { title: 'Contraseña', href: '/settings/password' },
];

/** Laravel's Password::defaults() only asks for 8 characters; the rest make it harder to guess. */
const REQUISITOS: { texto: string; cumple: (clave: string) => boolean; obligatorio?: boolean }[] = [
    { texto: 'Al menos 8 caracteres', cumple: (clave) => clave.length >= 8, obligatorio: true },
    { texto: 'Mayúsculas y minúsculas', cumple: (clave) => /[a-zñ]/.test(clave) && /[A-ZÑ]/.test(clave) },
    { texto: 'Al menos un número', cumple: (clave) => /\d/.test(clave) },
    { texto: 'Un símbolo, como ! # $', cumple: (clave) => /[^A-Za-z0-9ñÑ]/.test(clave) },
];

const NIVELES = [
    { etiqueta: 'Muy débil', clase: 'bg-red-500', texto: 'text-red-700 dark:text-red-400' },
    { etiqueta: 'Débil', clase: 'bg-orange-500', texto: 'text-orange-700 dark:text-orange-400' },
    { etiqueta: 'Aceptable', clase: 'bg-amber-500', texto: 'text-amber-700 dark:text-amber-400' },
    { etiqueta: 'Buena', clase: 'bg-lime-500', texto: 'text-lime-700 dark:text-lime-400' },
    { etiqueta: 'Muy segura', clase: 'bg-emerald-500', texto: 'text-emerald-700 dark:text-emerald-400' },
];

/** 0–4: the requirements met, plus a point for 12 or more characters, never above 1 while it is too short. */
function nivelDe(clave: string): number {
    const cumplidos = REQUISITOS.filter((requisito) => requisito.cumple(clave)).length + (clave.length >= 12 ? 1 : 0);

    return clave.length < 8 ? Math.min(cumplidos, 1) : Math.min(cumplidos - 1, 4);
}

export default function Password() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    const nivel = nivelDe(data.password);
    const coinciden = data.password_confirmation !== '' && data.password === data.password_confirmation;
    const listo = data.current_password !== '' && data.password.length >= 8 && coinciden;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Contraseña" />

            <SettingsLayout>
                <form onSubmit={updatePassword}>
                    <TarjetaAjustes
                        icono={KeyRound}
                        titulo="Cambiar contraseña"
                        descripcion="Escribe tu contraseña actual y después la nueva dos veces."
                        pie={
                            <>
                                <AvisoGuardado visible={recentlySuccessful} texto="Contraseña actualizada" />
                                <Button disabled={processing || !listo}>
                                    {processing && <LoaderCircle className="size-4 animate-spin" />}
                                    Guardar contraseña
                                </Button>
                            </>
                        }
                    >
                        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_14rem]">
                            <div className="grid gap-5">
                                <div className="grid gap-2">
                                    <Label htmlFor="current_password">Contraseña actual</Label>
                                    <CampoContrasena
                                        id="current_password"
                                        ref={currentPasswordInput}
                                        value={data.current_password}
                                        onChange={(e) => setData('current_password', e.target.value)}
                                        autoComplete="current-password"
                                        placeholder="La que usas hoy"
                                    />
                                    <InputError message={errors.current_password} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password">Nueva contraseña</Label>
                                    <CampoContrasena
                                        id="password"
                                        ref={passwordInput}
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        autoComplete="new-password"
                                        placeholder="Mínimo 8 caracteres"
                                    />
                                    {data.password !== '' && (
                                        <div className="flex items-center gap-3" aria-live="polite">
                                            <div className="flex flex-1 gap-1">
                                                {NIVELES.map((n, indice) => (
                                                    <span
                                                        key={n.etiqueta}
                                                        className={cn(
                                                            'h-1.5 flex-1 rounded-full transition-colors',
                                                            indice <= nivel ? NIVELES[nivel].clase : 'bg-muted',
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                            <span className={cn('w-20 text-right text-xs font-medium', NIVELES[nivel].texto)}>
                                                {NIVELES[nivel].etiqueta}
                                            </span>
                                        </div>
                                    )}
                                    <InputError message={errors.password} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password_confirmation">Confirmar nueva contraseña</Label>
                                    <CampoContrasena
                                        id="password_confirmation"
                                        value={data.password_confirmation}
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        autoComplete="new-password"
                                        placeholder="Escríbela otra vez"
                                    />
                                    {data.password_confirmation !== '' && (
                                        <p
                                            className={cn(
                                                'flex items-center gap-1.5 text-xs font-medium',
                                                coinciden ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive',
                                            )}
                                        >
                                            {coinciden ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                                            {coinciden ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                                        </p>
                                    )}
                                    <InputError message={errors.password_confirmation} />
                                </div>
                            </div>

                            <div className="bg-muted/50 h-fit rounded-xl p-4">
                                <p className="mb-3 text-sm font-medium">Tu nueva contraseña</p>
                                <ul className="space-y-2">
                                    {REQUISITOS.map((requisito) => {
                                        const cumple = requisito.cumple(data.password);

                                        return (
                                            <li
                                                key={requisito.texto}
                                                className={cn(
                                                    'flex items-start gap-2 text-xs transition-colors',
                                                    cumple ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground',
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'mt-px flex size-4 shrink-0 items-center justify-center rounded-full',
                                                        cumple ? 'bg-emerald-500 text-white' : 'border',
                                                    )}
                                                >
                                                    {cumple && <Check className="size-2.5" strokeWidth={3} />}
                                                </span>
                                                <span>
                                                    {requisito.texto}
                                                    {requisito.obligatorio && <span className="text-muted-foreground"> (obligatorio)</span>}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    </TarjetaAjustes>
                </form>

                <TarjetaAjustes icono={Lightbulb} titulo="Consejos para una contraseña segura">
                    <ul className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-2">
                        <li>• Usa una frase fácil de recordar, como «MiPerro-Come3Veces».</li>
                        <li>• No la compartas ni la anotes donde otros la vean.</li>
                        <li>• No uses la misma que en tu correo o redes sociales.</li>
                        <li>• Si crees que alguien la conoce, cámbiala de inmediato.</li>
                    </ul>
                </TarjetaAjustes>
            </SettingsLayout>
        </AppLayout>
    );
}
