import { IconoRol, ResumenPermisos } from '@/components/admin/resumen-permisos';
import { Seccion } from '@/components/form-seccion';
import InputError from '@/components/input-error';
import { PermisosPorModuloField } from '@/components/permisos-por-modulo-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DESCRIPCION_ROLES } from '@/lib/permisos';
import { Link } from '@inertiajs/react';
import { ArrowRight, KeyRound, LoaderCircle, Lock, Shield, Users } from 'lucide-react';
import { FormEventHandler } from 'react';

// A type alias (not an interface) so it satisfies Inertia's FormDataType index signature.
export type RolFormData = {
    name: string;
    permissions: string[];
};

interface RolFormProps {
    data: RolFormData;
    setData: <K extends keyof RolFormData>(key: K, value: RolFormData[K]) => void;
    errors: Partial<Record<keyof RolFormData, string>>;
    /** Every permission that exists. */
    permisos: string[];
    /** System roles keep their name. */
    esSistema?: boolean;
    /** Accounts that will feel the change, and where they are registered (editing only). */
    cuentas?: { total: number; altaEn: { modulo: string; url: string } };
    processing: boolean;
    onSubmit: FormEventHandler;
    submitLabel: string;
}

export function RolForm({ data, setData, errors, permisos, esSistema = false, cuentas, processing, onSubmit, submitLabel }: RolFormProps) {
    // The Admin role always has every permission (the server re-syncs it), so it is shown read-only.
    const esAdmin = esSistema && data.name === 'Admin';
    const seleccionados = esAdmin ? permisos : data.permissions;

    return (
        <form onSubmit={onSubmit} className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="flex min-w-0 flex-col gap-6">
                <Seccion
                    numero={1}
                    icono={Shield}
                    titulo="Nombre"
                    descripcion={esSistema ? 'Los roles del sistema no se renombran ni se eliminan.' : 'Por ejemplo Recepción o Caja.'}
                >
                    <div className="grid gap-2 sm:max-w-sm">
                        <Label htmlFor="name">Nombre del rol</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                            maxLength={255}
                            disabled={esSistema}
                            autoFocus={!esSistema}
                        />
                        {esSistema && (
                            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                <Lock className="size-3" />
                                Rol del sistema: el programa lo usa por su nombre.
                            </p>
                        )}
                        <InputError message={errors.name} />
                    </div>
                </Seccion>

                <Seccion
                    numero={2}
                    icono={KeyRound}
                    titulo="Permisos por módulo"
                    descripcion={
                        esAdmin
                            ? 'El administrador siempre tiene todos los permisos.'
                            : '"Gestionar" incluye crear, editar y eliminar, y también ver.'
                    }
                >
                    {!esAdmin && (
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setData('permissions', [])}>
                                Quitar todo
                            </Button>
                        </div>
                    )}
                    <PermisosPorModuloField
                        permisos={permisos}
                        selected={seleccionados}
                        onChange={(value) => setData('permissions', value)}
                        error={errors.permissions}
                        soloLectura={esAdmin}
                    />
                </Seccion>

                {/* Phones and tablets: actions at the end of the form (on wide screens they live in the side column). */}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end xl:hidden">
                    <Button variant="outline" type="button" asChild>
                        <Link href={route('admin.roles.index')}>Cancelar</Link>
                    </Button>
                    {!esAdmin && (
                        <Button disabled={processing}>
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            {submitLabel}
                        </Button>
                    )}
                </div>
            </div>

            <aside className="hidden xl:sticky xl:top-6 xl:block">
                <Card className="gap-0 overflow-hidden p-0">
                    <div className="bg-muted/40 border-b px-5 py-3">
                        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Lo que podrá hacer</p>
                    </div>
                    <div className="space-y-4 p-5">
                        <div className="flex items-center gap-3">
                            <IconoRol nombre={data.name} />
                            <div className="min-w-0">
                                <p className="truncate font-semibold">{data.name || 'Nuevo rol'}</p>
                                <p className="text-muted-foreground text-xs">
                                    {DESCRIPCION_ROLES[data.name] ?? (esSistema ? 'Rol del sistema' : 'Rol personalizado; se asigna en Usuarios.')}
                                </p>
                            </div>
                        </div>
                        <ResumenPermisos permisos={seleccionados} vacio="Sin permisos: las cuentas con este rol no verán ningún módulo." />
                        {cuentas && (
                            <div className="flex items-center gap-2 border-t pt-3 text-sm">
                                <Users className="text-muted-foreground size-4 shrink-0" />
                                <span className="flex-1">
                                    Afecta a <span className="font-medium tabular-nums">{cuentas.total}</span>{' '}
                                    {cuentas.total === 1 ? 'cuenta' : 'cuentas'}
                                </span>
                                <Link href={cuentas.altaEn.url} className="text-primary flex items-center gap-1 text-xs font-medium hover:underline">
                                    {cuentas.altaEn.modulo}
                                    <ArrowRight className="size-3.5" />
                                </Link>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-2 border-t p-5">
                        {!esAdmin && (
                            <Button disabled={processing} className="w-full">
                                {processing && <LoaderCircle className="size-4 animate-spin" />}
                                {submitLabel}
                            </Button>
                        )}
                        <Button variant={esAdmin ? 'outline' : 'ghost'} type="button" asChild className="w-full">
                            <Link href={route('admin.roles.index')}>{esAdmin ? 'Volver' : 'Cancelar'}</Link>
                        </Button>
                    </div>
                </Card>
            </aside>
        </form>
    );
}
