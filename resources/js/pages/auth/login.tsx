import { Head, useForm } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Info, LoaderCircle, Lock, Mail, TriangleAlert } from 'lucide-react';
import { FormEventHandler, useState, type KeyboardEvent } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Turnstile } from '@/components/turnstile';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { cn } from '@/lib/utils';

// A type alias (not an interface) so it satisfies Inertia's FormDataType index signature.
type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
    'cf-turnstile-response': string;
};

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
    /** Cloudflare Turnstile site key; null while the check is off. */
    turnstileSiteKey: string | null;
}

export default function Login({ status, canResetPassword, turnstileSiteKey }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
        'cf-turnstile-response': '',
    });
    const [verClave, setVerClave] = useState(false);
    const [mayusculas, setMayusculas] = useState(false);
    const [reinicio, setReinicio] = useState(0);
    const faltaVerificar = turnstileSiteKey !== null && data['cf-turnstile-response'] === '';

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
            // A Turnstile token works once: a failed attempt needs a fresh check.
            onError: () => setReinicio((n) => n + 1),
        });
    };

    const revisarMayusculas = (e: KeyboardEvent<HTMLInputElement>) => setMayusculas(e.getModifierState('CapsLock'));

    return (
        <AuthLayout title="Inicia sesión" description="Entra con el correo electrónico y la contraseña de tu cuenta CICCIS.">
            <Head title="Iniciar sesión" />

            {status && (
                <p className="mb-6 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    {status}
                </p>
            )}

            <form className="flex flex-col gap-5" onSubmit={submit}>
                <div className="grid gap-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <div className="relative">
                        <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                        <Input
                            id="email"
                            type="email"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="correo@ejemplo.com"
                            aria-invalid={errors.email ? true : undefined}
                            className={cn('h-11 pl-10', errors.email && 'border-destructive')}
                        />
                    </div>
                    <InputError message={errors.email} />
                </div>

                <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="password">Contraseña</Label>
                        {canResetPassword && (
                            <TextLink href={route('password.request')} className="text-sm" tabIndex={5}>
                                ¿La olvidaste?
                            </TextLink>
                        )}
                    </div>
                    <div className="relative">
                        <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                        <Input
                            id="password"
                            type={verClave ? 'text' : 'password'}
                            required
                            tabIndex={2}
                            autoComplete="current-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            onKeyUp={revisarMayusculas}
                            onKeyDown={revisarMayusculas}
                            onBlur={() => setMayusculas(false)}
                            placeholder="Tu contraseña"
                            className="h-11 pr-11 pl-10"
                        />
                        <button
                            type="button"
                            onClick={() => setVerClave((valor) => !valor)}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md transition-colors"
                            aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            aria-pressed={verClave}
                        >
                            {verClave ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                    </div>
                    {mayusculas && (
                        <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                            <TriangleAlert className="size-3.5" />
                            Bloq Mayús está activado
                        </p>
                    )}
                    <InputError message={errors.password} />
                </div>

                <div className="flex items-center gap-3">
                    <Checkbox
                        id="remember"
                        name="remember"
                        tabIndex={3}
                        checked={data.remember}
                        onCheckedChange={(checked) => setData('remember', checked === true)}
                    />
                    <Label htmlFor="remember" className="font-normal">
                        Mantener la sesión iniciada en este equipo
                    </Label>
                </div>

                {turnstileSiteKey && (
                    <div className="grid gap-2">
                        <Turnstile
                            siteKey={turnstileSiteKey}
                            reinicio={reinicio}
                            onToken={(token) => setData('cf-turnstile-response', token ?? '')}
                        />
                        <InputError message={errors['cf-turnstile-response']} />
                    </div>
                )}

                <Button
                    type="submit"
                    size="lg"
                    className="group mt-2 h-11 w-full text-base shadow-sm"
                    tabIndex={4}
                    disabled={processing || faltaVerificar}
                >
                    {processing ? (
                        <>
                            <LoaderCircle className="size-4 animate-spin" />
                            Entrando…
                        </>
                    ) : (
                        <>
                            Iniciar sesión
                            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                    )}
                </Button>
            </form>

            <p className="bg-muted/60 text-muted-foreground mt-8 flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-xs leading-relaxed">
                <Info className="mt-px size-4 shrink-0" />
                ¿Aún no tienes cuenta? Las cuentas las crea la dirección de tu plantel; pídela ahí con tu correo electrónico.
            </p>
        </AuthLayout>
    );
}
