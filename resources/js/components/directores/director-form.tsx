import { OpcionTarjeta, Seccion } from '@/components/form-seccion';
import { emptyFoto, FotoPersonaFields, type FotoData } from '@/components/foto-persona-fields';
import InputError from '@/components/input-error';
import { PersonaAvatar } from '@/components/persona-avatar';
import { AyudaTelefono, CampoCurp, datosDeCurp, edad, FichaDato, opcional, useObjectUrl } from '@/components/persona-campos';
import { PlantelesAsignadosField, type PlantelOpcion } from '@/components/planteles-asignados-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatFecha, formatTelefono } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import {
    Building2,
    Cake,
    CircleCheck,
    CircleOff,
    IdCard,
    KeyRound,
    LoaderCircle,
    Mail,
    Phone,
    Power,
    ShieldCheck,
    Sparkles,
    UserRound,
} from 'lucide-react';
import { FormEventHandler, type ComponentProps, type ReactNode } from 'react';

// A type alias (not an interface) so it satisfies Inertia's FormDataType index signature.
export type DirectorFormData = FotoData & {
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string;
    curp: string;
    fecha_nacimiento: string;
    telefono: string;
    email: string;
    activo: boolean;
    password: string;
    password_confirmation: string;
    /** Plantel ids as strings. */
    planteles: string[];
};

export const emptyDirector: DirectorFormData = {
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    curp: '',
    fecha_nacimiento: '',
    telefono: '',
    email: '',
    activo: true,
    ...emptyFoto,
    password: '',
    password_confirmation: '',
    planteles: [],
};

type TextField = Exclude<keyof DirectorFormData, keyof FotoData | 'activo' | 'planteles'>;

interface DirectorFormProps {
    data: DirectorFormData;
    setData: <K extends keyof DirectorFormData>(key: K, value: DirectorFormData[K]) => void;
    errors: Partial<Record<keyof DirectorFormData, string>>;
    planteles: PlantelOpcion[];
    /** Current photo; only passed when editing. */
    fotoUrl?: string | null;
    /** Editing an existing director: the password becomes optional. */
    editando?: boolean;
    processing: boolean;
    onSubmit: FormEventHandler;
    submitLabel: string;
    /** Extra block in the side column (what their planteles look like when editing). */
    complemento?: ReactNode;
}

export function DirectorForm({
    data,
    setData,
    errors,
    planteles,
    fotoUrl,
    editando = false,
    processing,
    onSubmit,
    submitLabel,
    complemento,
}: DirectorFormProps) {
    const nombreCompleto = [data.nombre, data.apellido_paterno, data.apellido_materno].filter(Boolean).join(' ');
    const deCurp = datosDeCurp(data.curp);
    const anios = data.fecha_nacimiento ? edad(data.fecha_nacimiento) : null;
    const fotoVistaPrevia = useObjectUrl(data.foto);
    const fotoActual = fotoVistaPrevia ?? (data.remove_foto ? null : (fotoUrl ?? null));
    const elegidos = planteles.filter((plantel) => data.planteles.includes(String(plantel.id)));

    const field = (key: TextField, label: ReactNode, props: ComponentProps<typeof Input> = {}, ayuda?: ReactNode) => (
        <div className="grid content-start gap-2">
            <Label htmlFor={key}>{label}</Label>
            <Input id={key} value={data[key]} onChange={(e) => setData(key, e.target.value)} {...props} />
            {ayuda}
            <InputError message={errors[key]} />
        </div>
    );

    return (
        <form onSubmit={onSubmit} className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="flex min-w-0 flex-col gap-6">
                <Seccion numero={1} icono={UserRound} titulo="Datos personales" descripcion="Tal como aparecen en su identificación.">
                    <FotoPersonaFields fotoUrl={fotoUrl} data={data} setData={setData} errors={errors} conTitulo={false} />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {field('nombre', 'Nombre(s)', { required: true, maxLength: 255, autoFocus: !editando })}
                        {field('apellido_paterno', 'Apellido paterno', { required: true, maxLength: 255 })}
                        {field('apellido_materno', 'Apellido materno', { maxLength: 255, placeholder: 'Opcional' })}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <CampoCurp
                            value={data.curp}
                            onChange={(value) => setData('curp', value)}
                            error={errors.curp}
                            accion={
                                deCurp &&
                                deCurp.fecha_nacimiento !== data.fecha_nacimiento && (
                                    <button
                                        type="button"
                                        onClick={() => setData('fecha_nacimiento', deCurp.fecha_nacimiento)}
                                        className="text-primary flex items-center gap-1 text-left font-medium hover:underline"
                                    >
                                        <Sparkles className="size-3 shrink-0" />
                                        Tomar de la CURP: nació el {formatFecha(deCurp.fecha_nacimiento)}
                                    </button>
                                )
                            }
                        />
                        {field(
                            'fecha_nacimiento',
                            <>Fecha de nacimiento {opcional}</>,
                            { type: 'date', max: new Date().toISOString().slice(0, 10) },
                            anios !== null && <p className="text-muted-foreground text-xs">{anios} años</p>,
                        )}
                    </div>
                </Seccion>

                <Seccion
                    numero={2}
                    icono={Building2}
                    titulo="Planteles que dirige"
                    descripcion="Su inicio, sus listas de grupos, alumnos y profesores se limitan a estos planteles."
                >
                    <PlantelesAsignadosField
                        planteles={planteles}
                        selected={data.planteles}
                        onChange={(value) => setData('planteles', value)}
                        error={errors.planteles}
                    />
                </Seccion>

                <Seccion
                    numero={3}
                    icono={KeyRound}
                    titulo="Contacto y acceso"
                    descripcion="Un director siempre entra al sistema: su correo es su usuario."
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {field(
                            'telefono',
                            <>Teléfono {opcional}</>,
                            { type: 'tel', inputMode: 'tel', maxLength: 15, placeholder: '10 dígitos' },
                            <AyudaTelefono valor={data.telefono} />,
                        )}
                        {field('email', 'Correo electrónico', { type: 'email', required: true, maxLength: 255, autoComplete: 'off' })}
                        {field('password', editando ? <>Nueva contraseña {opcional}</> : 'Contraseña', {
                            type: 'password',
                            autoComplete: 'new-password',
                            required: !editando,
                            placeholder: editando ? 'Dejar en blanco para no cambiarla' : undefined,
                        })}
                        {field('password_confirmation', 'Confirmar contraseña', {
                            type: 'password',
                            autoComplete: 'new-password',
                            required: !editando,
                        })}
                    </div>
                    <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
                        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                        {editando
                            ? 'Si cambias el correo, también cambia su usuario para iniciar sesión.'
                            : 'Comparte la contraseña con el director; podrá cambiarla en su configuración.'}
                    </p>
                </Seccion>

                <Seccion numero={4} icono={Power} titulo="Situación" descripcion="Desactívalo si deja el cargo; su historial se conserva.">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2" role="radiogroup" aria-label="Situación del director">
                        <OpcionTarjeta seleccionada={data.activo} onSelect={() => setData('activo', true)}>
                            <CircleCheck className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <div>
                                <p className="font-medium">Activo</p>
                                <p className="text-muted-foreground text-xs">En funciones.</p>
                            </div>
                        </OpcionTarjeta>
                        <OpcionTarjeta seleccionada={!data.activo} onSelect={() => setData('activo', false)}>
                            <CircleOff className="text-muted-foreground size-5 shrink-0" />
                            <div>
                                <p className="font-medium">Inactivo</p>
                                <p className="text-muted-foreground text-xs">Ya no ocupa el cargo.</p>
                            </div>
                        </OpcionTarjeta>
                    </div>
                    <InputError message={errors.activo} />
                </Seccion>

                {/* Phones and tablets: actions at the end of the form (on wide screens they live in the side column). */}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end xl:hidden">
                    <Button variant="outline" type="button" asChild>
                        <Link href={route('admin.directores.index')}>Cancelar</Link>
                    </Button>
                    <Button disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        {submitLabel}
                    </Button>
                </div>
            </div>

            <aside className={cn('order-first flex flex-col gap-6 xl:sticky xl:top-6 xl:order-none', !complemento && 'hidden xl:flex')}>
                <Card className="hidden gap-0 overflow-hidden p-0 xl:flex xl:flex-col">
                    <div className="bg-muted/40 border-b px-5 py-3">
                        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Ficha del director</p>
                    </div>
                    <div className="space-y-4 p-5">
                        <div className="flex items-center gap-3">
                            <PersonaAvatar nombre={nombreCompleto || '?'} fotoUrl={fotoActual} className="size-14" />
                            <div className="min-w-0">
                                <p className="leading-snug font-semibold">{nombreCompleto || 'Nombre del director'}</p>
                                <p className="text-muted-foreground text-sm">Dirección</p>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm">
                            <FichaDato
                                icono={Building2}
                                valor={elegidos.length ? elegidos.map((plantel) => plantel.clave).join(' · ') : undefined}
                                vacio="Sin planteles"
                            />
                            <FichaDato icono={IdCard} valor={data.curp.toUpperCase() || undefined} vacio="Sin CURP" mono />
                            <FichaDato
                                icono={Cake}
                                valor={
                                    data.fecha_nacimiento
                                        ? `${formatFecha(data.fecha_nacimiento)}${anios !== null ? ` · ${anios} años` : ''}`
                                        : undefined
                                }
                                vacio="Sin fecha de nacimiento"
                            />
                            <FichaDato icono={Phone} valor={data.telefono ? formatTelefono(data.telefono) : undefined} vacio="Sin teléfono" />
                            <FichaDato icono={Mail} valor={data.email || undefined} vacio="Sin correo" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 border-t p-5">
                        <Button disabled={processing} className="w-full">
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            {submitLabel}
                        </Button>
                        <Button variant="ghost" type="button" asChild className="w-full">
                            <Link href={route('admin.directores.index')}>Cancelar</Link>
                        </Button>
                    </div>
                </Card>

                {complemento}
            </aside>
        </form>
    );
}
