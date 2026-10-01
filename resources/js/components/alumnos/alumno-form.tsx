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
import { Cake, CircleCheck, CircleOff, HeartPulse, IdCard, KeyRound, LoaderCircle, Mail, Phone, Power, Sparkles, UserRound } from 'lucide-react';
import { FormEventHandler, type ComponentProps, type ReactNode } from 'react';

// A type alias (not an interface) so it satisfies Inertia's FormDataType index signature.
export type AlumnoFormData = CuentaAccesoData &
    FotoData & {
        nombre: string;
        apellido_paterno: string;
        apellido_materno: string;
        curp: string;
        fecha_nacimiento: string;
        genero: string;
        telefono: string;
        email: string;
        direccion: string;
        contacto_emergencia_nombre: string;
        contacto_emergencia_telefono: string;
        activo: boolean;
    };

export const emptyAlumno: AlumnoFormData = {
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    curp: '',
    fecha_nacimiento: '',
    genero: '',
    telefono: '',
    email: '',
    direccion: '',
    contacto_emergencia_nombre: '',
    contacto_emergencia_telefono: '',
    activo: true,
    ...emptyFoto,
    crear_cuenta: false,
    password: '',
    password_confirmation: '',
};

const GENEROS = [
    { valor: 'femenino', etiqueta: 'Femenino' },
    { valor: 'masculino', etiqueta: 'Masculino' },
    { valor: 'otro', etiqueta: 'Otro' },
];

type TextField = Exclude<keyof AlumnoFormData, keyof CuentaAccesoData | keyof FotoData | 'activo' | 'genero'>;

interface AlumnoFormProps {
    data: AlumnoFormData;
    setData: <K extends keyof AlumnoFormData>(key: K, value: AlumnoFormData[K]) => void;
    errors: Partial<Record<keyof AlumnoFormData, string>>;
    /** Existing matrícula when editing, or the one it will get when registering. */
    matricula: string;
    matriculaPrevista?: boolean;
    /** Current photo; only passed when editing. */
    fotoUrl?: string | null;
    tieneCuenta?: boolean;
    processing: boolean;
    onSubmit: FormEventHandler;
    submitLabel: string;
    /** Extra block in the side column (the alumno's courses when editing). */
    complemento?: ReactNode;
}

export function AlumnoForm({
    data,
    setData,
    errors,
    matricula,
    matriculaPrevista = false,
    fotoUrl,
    tieneCuenta = false,
    processing,
    onSubmit,
    submitLabel,
    complemento,
}: AlumnoFormProps) {
    const emailRequerido = tieneCuenta || data.crear_cuenta;
    const nombreCompleto = [data.nombre, data.apellido_paterno, data.apellido_materno].filter(Boolean).join(' ');
    const curp = data.curp.toUpperCase();
    const deCurp = datosDeCurp(curp);
    const curpCompletaria = deCurp && (deCurp.fecha_nacimiento !== data.fecha_nacimiento || deCurp.genero !== data.genero);
    const anios = data.fecha_nacimiento ? edad(data.fecha_nacimiento) : null;
    const fotoVistaPrevia = useObjectUrl(data.foto);
    const fotoActual = fotoVistaPrevia ?? (data.remove_foto ? null : (fotoUrl ?? null));

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
                        {field('nombre', 'Nombre(s)', { required: true, maxLength: 255, autoFocus: !tieneCuenta && !data.nombre })}
                        {field('apellido_paterno', 'Apellido paterno', { required: true, maxLength: 255 })}
                        {field('apellido_materno', 'Apellido materno', { maxLength: 255, placeholder: 'Opcional' })}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <CampoCurp
                            value={data.curp}
                            onChange={(value) => setData('curp', value)}
                            error={errors.curp}
                            accion={
                                curpCompletaria && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setData('fecha_nacimiento', deCurp.fecha_nacimiento);
                                            setData('genero', deCurp.genero);
                                        }}
                                        className="text-primary flex items-center gap-1 text-left font-medium hover:underline"
                                    >
                                        <Sparkles className="size-3 shrink-0" />
                                        Tomar de la CURP: {formatFecha(deCurp.fecha_nacimiento)} ·{' '}
                                        {GENEROS.find((genero) => genero.valor === deCurp.genero)?.etiqueta}
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

                    <div className="grid gap-2">
                        <p className="text-sm font-medium" id="genero-label">
                            Género {opcional}
                        </p>
                        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="genero-label">
                            {GENEROS.map((genero) => {
                                const activo = data.genero === genero.valor;

                                return (
                                    <button
                                        key={genero.valor}
                                        type="button"
                                        role="radio"
                                        aria-checked={activo}
                                        // Clicking the chosen one again clears it, since the field is optional.
                                        onClick={() => setData('genero', activo ? '' : genero.valor)}
                                        className={cn(
                                            'rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors',
                                            activo
                                                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                                : 'hover:border-primary/40 hover:bg-muted/40',
                                        )}
                                    >
                                        {genero.etiqueta}
                                    </button>
                                );
                            })}
                        </div>
                        <InputError message={errors.genero} />
                    </div>
                </Seccion>

                <Seccion numero={2} icono={Phone} titulo="Contacto" descripcion="Para avisos de la escuela.">
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
                        <div className="sm:col-span-2">
                            {field('direccion', <>Dirección {opcional}</>, { maxLength: 255, placeholder: 'Calle, número, colonia y localidad' })}
                        </div>
                    </div>
                </Seccion>

                <Seccion numero={3} icono={HeartPulse} titulo="Contacto de emergencia" descripcion="A quién llamar si algo le pasa en clase.">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {field('contacto_emergencia_nombre', <>Nombre y parentesco {opcional}</>, {
                            maxLength: 255,
                            placeholder: 'Ej. María López (mamá)',
                        })}
                        {field(
                            'contacto_emergencia_telefono',
                            <>Teléfono {opcional}</>,
                            { type: 'tel', inputMode: 'tel', maxLength: 15, placeholder: '10 dígitos' },
                            <AyudaTelefono valor={data.contacto_emergencia_telefono} />,
                        )}
                    </div>
                </Seccion>

                <Seccion
                    numero={4}
                    icono={KeyRound}
                    titulo="Acceso al sistema"
                    descripcion="Con cuenta, el alumno consulta sus cursos, horario y asistencia."
                >
                    <CuentaAccesoFields
                        rol="Alumno"
                        persona="el alumno"
                        tieneCuenta={tieneCuenta}
                        data={data}
                        setData={setData}
                        errors={errors}
                        conTitulo={false}
                    />
                </Seccion>

                <Seccion numero={5} icono={Power} titulo="Situación" descripcion="Desactívalo si dejó la escuela; su historial se conserva.">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2" role="radiogroup" aria-label="Situación del alumno">
                        <OpcionTarjeta seleccionada={data.activo} onSelect={() => setData('activo', true)}>
                            <CircleCheck className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <div>
                                <p className="font-medium">Activo</p>
                                <p className="text-muted-foreground text-xs">Se puede inscribir en grupos.</p>
                            </div>
                        </OpcionTarjeta>
                        <OpcionTarjeta seleccionada={!data.activo} onSelect={() => setData('activo', false)}>
                            <CircleOff className="text-muted-foreground size-5 shrink-0" />
                            <div>
                                <p className="font-medium">Inactivo</p>
                                <p className="text-muted-foreground text-xs">Ya no estudia aquí; no aparece al inscribir.</p>
                            </div>
                        </OpcionTarjeta>
                    </div>
                    <InputError message={errors.activo} />
                </Seccion>

                {/* Phones and tablets: actions at the end of the form (on wide screens they live in the side column). */}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end xl:hidden">
                    <Button variant="outline" type="button" asChild>
                        <Link href={route('alumnos.index')}>Cancelar</Link>
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
                        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Ficha del alumno</p>
                    </div>
                    <div className="space-y-4 p-5">
                        <div className="flex items-center gap-3">
                            <PersonaAvatar nombre={nombreCompleto || '?'} fotoUrl={fotoActual} className="size-14" />
                            <div className="min-w-0">
                                <p className="leading-snug font-semibold">{nombreCompleto || 'Nombre del alumno'}</p>
                                <p className="text-muted-foreground font-mono text-xs">{matricula}</p>
                                {matriculaPrevista && <p className="text-muted-foreground text-[11px]">Matrícula que se le asignará</p>}
                            </div>
                        </div>
                        <div className="space-y-2 text-sm">
                            <FichaDato icono={IdCard} valor={curp || undefined} vacio="Sin CURP" mono />
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
                            <Link href={route('alumnos.index')}>Cancelar</Link>
                        </Button>
                    </div>
                </Card>

                {complemento}
            </aside>
        </form>
    );
}
