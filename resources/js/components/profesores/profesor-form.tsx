import { CuentaAccesoFields, type CuentaAccesoData } from '@/components/cuenta-acceso-fields';
import { OpcionTarjeta, Seccion } from '@/components/form-seccion';
import { emptyFoto, FotoPersonaFields, type FotoData } from '@/components/foto-persona-fields';
import InputError from '@/components/input-error';
import { PersonaAvatar } from '@/components/persona-avatar';
import { AyudaTelefono, CampoCurp, datosDeCurp, edad, FichaDato, opcional, useObjectUrl } from '@/components/persona-campos';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatFecha, formatTelefono } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { BookOpen, Cake, Check, CircleCheck, CircleOff, IdCard, KeyRound, LoaderCircle, Mail, Phone, Power, Sparkles, UserRound } from 'lucide-react';
import { FormEventHandler, type ComponentProps, type ReactNode } from 'react';

// A type alias (not an interface) so it satisfies Inertia's FormDataType index signature.
export type ProfesorFormData = CuentaAccesoData &
    FotoData & {
        nombre: string;
        apellido_paterno: string;
        apellido_materno: string;
        curp: string;
        fecha_nacimiento: string;
        telefono: string;
        email: string;
        especialidad: string;
        activo: boolean;
    };

export const emptyProfesor: ProfesorFormData = {
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    curp: '',
    fecha_nacimiento: '',
    telefono: '',
    email: '',
    especialidad: '',
    activo: true,
    ...emptyFoto,
    crear_cuenta: false,
    password: '',
    password_confirmation: '',
};

type TextField = Exclude<keyof ProfesorFormData, keyof CuentaAccesoData | keyof FotoData | 'activo'>;

/** The specialty as a list ("Estilismo y Barbería" → ["Estilismo", "Barbería"]), to toggle the quick picks. */
function partesEspecialidad(especialidad: string): string[] {
    return especialidad
        .split(/\s*(?:,|\by\b)\s*/i)
        .map((parte) => parte.trim())
        .filter(Boolean);
}

function unirEspecialidad(partes: string[]): string {
    return partes.length <= 1 ? (partes[0] ?? '') : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

interface ProfesorFormProps {
    data: ProfesorFormData;
    setData: <K extends keyof ProfesorFormData>(key: K, value: ProfesorFormData[K]) => void;
    errors: Partial<Record<keyof ProfesorFormData, string>>;
    /** Active curso names, offered as quick picks for the specialty. */
    especialidades: string[];
    /** Current photo; only passed when editing. */
    fotoUrl?: string | null;
    tieneCuenta?: boolean;
    processing: boolean;
    onSubmit: FormEventHandler;
    submitLabel: string;
    /** Extra block in the side column (the profesor's grupos when editing). */
    complemento?: ReactNode;
}

export function ProfesorForm({
    data,
    setData,
    errors,
    especialidades,
    fotoUrl,
    tieneCuenta = false,
    processing,
    onSubmit,
    submitLabel,
    complemento,
}: ProfesorFormProps) {
    const emailRequerido = tieneCuenta || data.crear_cuenta;
    const nombreCompleto = [data.nombre, data.apellido_paterno, data.apellido_materno].filter(Boolean).join(' ');
    const deCurp = datosDeCurp(data.curp);
    const anios = data.fecha_nacimiento ? edad(data.fecha_nacimiento) : null;
    const fotoVistaPrevia = useObjectUrl(data.foto);
    const fotoActual = fotoVistaPrevia ?? (data.remove_foto ? null : (fotoUrl ?? null));
    const elegidas = partesEspecialidad(data.especialidad).map((parte) => parte.toLowerCase());

    const alternarEspecialidad = (nombre: string) => {
        const partes = partesEspecialidad(data.especialidad);
        const siguientes = elegidas.includes(nombre.toLowerCase())
            ? partes.filter((parte) => parte.toLowerCase() !== nombre.toLowerCase())
            : [...partes, nombre];

        setData('especialidad', unirEspecialidad(siguientes));
    };

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
                        {field('nombre', 'Nombre(s)', { required: true, maxLength: 255, autoFocus: !data.nombre })}
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

                <Seccion numero={2} icono={BookOpen} titulo="Especialidad" descripcion="Qué enseña; ayuda a elegir profesor al abrir un grupo.">
                    {especialidades.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium" id="especialidad-rapida">
                                Elige de los cursos
                            </p>
                            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="especialidad-rapida">
                                {especialidades.map((nombre) => {
                                    const activa = elegidas.includes(nombre.toLowerCase());

                                    return (
                                        <button
                                            key={nombre}
                                            type="button"
                                            aria-pressed={activa}
                                            onClick={() => alternarEspecialidad(nombre)}
                                            className={cn(
                                                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                                                activa
                                                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                                    : 'hover:border-primary/40 hover:bg-muted/40',
                                            )}
                                        >
                                            {activa && <Check className="size-3.5" />}
                                            {nombre}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {field('especialidad', <>O escríbela {opcional}</>, { maxLength: 255, placeholder: 'Ej. Estilismo y Barbería' })}
                </Seccion>

                <Seccion numero={3} icono={Phone} titulo="Contacto" descripcion="Para avisos de la escuela.">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {field(
                            'telefono',
                            <>Teléfono {opcional}</>,
                            { type: 'tel', inputMode: 'tel', maxLength: 15, placeholder: '10 dígitos' },
                            <AyudaTelefono valor={data.telefono} />,
                        )}
                        {field(
                            'email',
                            emailRequerido ? 'Correo electrónico' : <>Correo electrónico {opcional}</>,
                            { type: 'email', required: emailRequerido, maxLength: 255 },
                            emailRequerido && <p className="text-muted-foreground text-xs">Es su usuario para iniciar sesión.</p>,
                        )}
                    </div>
                </Seccion>

                <Seccion numero={4} icono={KeyRound} titulo="Acceso al sistema" descripcion="Con cuenta, el profesor ve sus grupos y pasa lista.">
                    <CuentaAccesoFields
                        rol="Profesor"
                        persona="el profesor"
                        tieneCuenta={tieneCuenta}
                        data={data}
                        setData={setData}
                        errors={errors}
                        conTitulo={false}
                    />
                </Seccion>

                <Seccion
                    numero={5}
                    icono={Power}
                    titulo="Situación"
                    descripcion="Desactívalo si ya no da clases; sus grupos anteriores se conservan."
                >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2" role="radiogroup" aria-label="Situación del profesor">
                        <OpcionTarjeta seleccionada={data.activo} onSelect={() => setData('activo', true)}>
                            <CircleCheck className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <div>
                                <p className="font-medium">Activo</p>
                                <p className="text-muted-foreground text-xs">Se le pueden asignar grupos.</p>
                            </div>
                        </OpcionTarjeta>
                        <OpcionTarjeta seleccionada={!data.activo} onSelect={() => setData('activo', false)}>
                            <CircleOff className="text-muted-foreground size-5 shrink-0" />
                            <div>
                                <p className="font-medium">Inactivo</p>
                                <p className="text-muted-foreground text-xs">Ya no da clases; no aparece al abrir grupos.</p>
                            </div>
                        </OpcionTarjeta>
                    </div>
                    <InputError message={errors.activo} />
                </Seccion>

                {/* Phones and tablets: actions at the end of the form (on wide screens they live in the side column). */}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end xl:hidden">
                    <Button variant="outline" type="button" asChild>
                        <Link href={route('profesores.index')}>Cancelar</Link>
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
                        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Ficha del profesor</p>
                    </div>
                    <div className="space-y-4 p-5">
                        <div className="flex items-center gap-3">
                            <PersonaAvatar nombre={nombreCompleto || '?'} fotoUrl={fotoActual} className="size-14" />
                            <div className="min-w-0">
                                <p className="leading-snug font-semibold">{nombreCompleto || 'Nombre del profesor'}</p>
                                <p className="text-muted-foreground text-sm">{data.especialidad || 'Sin especialidad'}</p>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm">
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
                            <FichaDato
                                icono={KeyRound}
                                valor={tieneCuenta ? 'Puede iniciar sesión' : data.crear_cuenta ? 'Tendrá acceso al sistema' : undefined}
                                vacio="Sin acceso al sistema"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 border-t p-5">
                        <Button disabled={processing} className="w-full">
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            {submitLabel}
                        </Button>
                        <Button variant="ghost" type="button" asChild className="w-full">
                            <Link href={route('profesores.index')}>Cancelar</Link>
                        </Button>
                    </div>
                </Card>

                {complemento}
            </aside>
        </form>
    );
}
