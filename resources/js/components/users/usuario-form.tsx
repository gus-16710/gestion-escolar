import { IconoRol, ResumenPermisos } from '@/components/admin/resumen-permisos';
import { OpcionTarjeta, Seccion } from '@/components/form-seccion';
import InputError from '@/components/input-error';
import { PermisosDirectosField } from '@/components/permisos-directos-field';
import { PersonaAvatar } from '@/components/persona-avatar';
import { opcional } from '@/components/persona-campos';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DESCRIPCION_ROLES, permisosEfectivos } from '@/lib/permisos';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { AlertTriangle, Check, KeyRound, LoaderCircle, Mail, Shield, SlidersHorizontal, UserRound } from 'lucide-react';
import { FormEventHandler, type ReactNode } from 'react';

// A type alias (not an interface) so it satisfies Inertia's FormDataType index signature.
export type UsuarioFormData = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    roles: string[];
    permissions: string[];
};

/** Laravel's Password::defaults() minimum. */
const MIN_CONTRASENA = 8;

interface UsuarioFormProps {
    data: UsuarioFormData;
    setData: <K extends keyof UsuarioFormData>(key: K, value: UsuarioFormData[K]) => void;
    errors: Partial<Record<keyof UsuarioFormData, string>>;
    /** Roles that can be given here (not Director, Profesor or Alumno). */
    roles: string[];
    /** Every role's permissions, for the preview. */
    permisosDeRoles: Record<string, string[]>;
    /** Every permission that exists. */
    permisos: string[];
    /** Roles that come from a record the account also has; kept on save and shown read-only. */
    rolesDeFicha?: string[];
    editando?: boolean;
    processing: boolean;
    onSubmit: FormEventHandler;
    submitLabel: string;
    /** Extra lines in the side card (creation date, last activity). */
    detalles?: ReactNode;
}

export function UsuarioForm({
    data,
    setData,
    errors,
    roles,
    permisosDeRoles,
    permisos,
    rolesDeFicha = [],
    editando = false,
    processing,
    onSubmit,
    submitLabel,
    detalles,
}: UsuarioFormProps) {
    const efectivos = permisosEfectivos([...data.roles, ...rolesDeFicha], permisosDeRoles, data.permissions);
    const contrasena = data.password;
    const coincide = data.password_confirmation === '' || data.password_confirmation === contrasena;

    const alternarRol = (rol: string) =>
        setData('roles', data.roles.includes(rol) ? data.roles.filter((otro) => otro !== rol) : [...data.roles, rol]);

    return (
        <form onSubmit={onSubmit} className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="flex min-w-0 flex-col gap-6">
                <Seccion numero={1} icono={UserRound} titulo="Datos de la cuenta" descripcion="El correo es el usuario para iniciar sesión.">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="grid content-start gap-2">
                            <Label htmlFor="name">Nombre</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                maxLength={255}
                                autoComplete="name"
                                autoFocus={!editando}
                            />
                            <InputError message={errors.name} />
                        </div>
                        <div className="grid content-start gap-2">
                            <Label htmlFor="email">Correo electrónico</Label>
                            <Input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value.toLowerCase())}
                                required
                                maxLength={255}
                                autoComplete="username"
                            />
                            <InputError message={errors.email} />
                        </div>
                    </div>
                </Seccion>

                <Seccion
                    numero={2}
                    icono={KeyRound}
                    titulo="Contraseña"
                    descripcion={editando ? 'Déjala en blanco para no cambiarla.' : 'Compártela con la persona; podrá cambiarla en su configuración.'}
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="grid content-start gap-2">
                            <Label htmlFor="password">{editando ? <>Nueva contraseña {opcional}</> : 'Contraseña'}</Label>
                            <Input
                                id="password"
                                type="password"
                                value={contrasena}
                                onChange={(e) => setData('password', e.target.value)}
                                required={!editando}
                                autoComplete="new-password"
                            />
                            {contrasena && (
                                <p
                                    className={cn(
                                        'flex items-center gap-1 text-xs',
                                        contrasena.length >= MIN_CONTRASENA ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground',
                                    )}
                                >
                                    {contrasena.length >= MIN_CONTRASENA && <Check className="size-3" />}
                                    {contrasena.length >= MIN_CONTRASENA
                                        ? 'Largo suficiente'
                                        : `Faltan ${MIN_CONTRASENA - contrasena.length} caracteres (mínimo ${MIN_CONTRASENA})`}
                                </p>
                            )}
                            <InputError message={errors.password} />
                        </div>
                        <div className="grid content-start gap-2">
                            <Label htmlFor="password_confirmation">Confirmar contraseña</Label>
                            <Input
                                id="password_confirmation"
                                type="password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                required={!editando || contrasena !== ''}
                                autoComplete="new-password"
                                aria-invalid={!coincide || undefined}
                            />
                            {!coincide && <p className="text-destructive text-xs">No coincide con la contraseña.</p>}
                            <InputError message={errors.password_confirmation} />
                        </div>
                    </div>
                </Seccion>

                <Seccion
                    numero={3}
                    icono={Shield}
                    titulo="Roles"
                    descripcion="Directores, profesores y alumnos se registran en su propio módulo, con su ficha."
                >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2" role="group" aria-label="Roles de la cuenta">
                        {roles.map((rol) => (
                            <OpcionTarjeta key={rol} tipo="checkbox" seleccionada={data.roles.includes(rol)} onSelect={() => alternarRol(rol)}>
                                <IconoRol nombre={rol} className="size-9" />
                                <div className="min-w-0">
                                    <p className="font-medium">{rol}</p>
                                    <p className="text-muted-foreground text-xs">
                                        {DESCRIPCION_ROLES[rol] ?? `${(permisosDeRoles[rol] ?? []).length} permisos`}
                                    </p>
                                </div>
                            </OpcionTarjeta>
                        ))}
                    </div>
                    {rolesDeFicha.length > 0 && (
                        <p className="text-muted-foreground text-xs">
                            También tiene {rolesDeFicha.length === 1 ? 'el rol' : 'los roles'} {rolesDeFicha.join(', ')} por su ficha; se conserva al
                            guardar.
                        </p>
                    )}
                    {data.roles.length === 0 && rolesDeFicha.length === 0 && (
                        <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                            Sin rol, la cuenta solo verá su página de inicio.
                        </p>
                    )}
                    <InputError message={errors.roles} />
                </Seccion>

                <Seccion
                    numero={4}
                    icono={SlidersHorizontal}
                    titulo="Permisos extra"
                    descripcion="Normalmente basta con el rol. Úsalo solo para una excepción de esta cuenta."
                >
                    <PermisosDirectosField
                        permisos={permisos}
                        selected={data.permissions}
                        onChange={(value) => setData('permissions', value)}
                        error={errors.permissions}
                    />
                </Seccion>

                {/* Phones and tablets: actions at the end of the form (on wide screens they live in the side column). */}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end xl:hidden">
                    <Button variant="outline" type="button" asChild>
                        <Link href={route('admin.users.index')}>Cancelar</Link>
                    </Button>
                    <Button disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        {submitLabel}
                    </Button>
                </div>
            </div>

            <aside className="hidden xl:sticky xl:top-6 xl:block">
                <Card className="gap-0 overflow-hidden p-0">
                    <div className="bg-muted/40 border-b px-5 py-3">
                        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Cuenta</p>
                    </div>
                    <div className="space-y-4 p-5">
                        <div className="flex items-center gap-3">
                            <PersonaAvatar nombre={data.name || '?'} className="size-12" />
                            <div className="min-w-0">
                                <p className="truncate font-semibold">{data.name || 'Nombre'}</p>
                                <p className="text-muted-foreground flex items-center gap-1.5 truncate text-xs">
                                    <Mail className="size-3 shrink-0" />
                                    {data.email || 'correo@ejemplo.com'}
                                </p>
                            </div>
                        </div>
                        {detalles && <div className="text-muted-foreground space-y-1 text-xs">{detalles}</div>}
                        <div className="border-t pt-3">
                            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">Lo que podrá hacer</p>
                            <ResumenPermisos permisos={efectivos} vacio="Nada todavía: elige al menos un rol." />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 border-t p-5">
                        <Button disabled={processing} className="w-full">
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            {submitLabel}
                        </Button>
                        <Button variant="ghost" type="button" asChild className="w-full">
                            <Link href={route('admin.users.index')}>Cancelar</Link>
                        </Button>
                    </div>
                </Card>
            </aside>
        </form>
    );
}
