import { OpcionTarjeta, Seccion } from '@/components/form-seccion';
import InputError from '@/components/input-error';
import { PlantelTarjeta, urlMapa } from '@/components/planteles/plantel-tarjeta';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatTelefono } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { AlertTriangle, Building2, CircleCheck, CircleOff, ExternalLink, LoaderCircle, MapPin, Phone, Power, Sparkles } from 'lucide-react';
import { FormEventHandler, useRef, type ComponentProps, type ReactNode } from 'react';

// A type alias (not an interface) so it satisfies Inertia's FormDataType index signature.
export type PlantelFormData = {
    nombre: string;
    clave: string;
    calle: string;
    numero_exterior: string;
    numero_interior: string;
    colonia: string;
    codigo_postal: string;
    localidad: string;
    municipio: string;
    estado: string;
    telefono: string;
    email: string;
    activo: boolean;
};

export const emptyPlantel: PlantelFormData = {
    nombre: '',
    clave: '',
    calle: '',
    numero_exterior: '',
    numero_interior: '',
    colonia: '',
    codigo_postal: '',
    localidad: '',
    municipio: '',
    estado: 'Veracruz',
    telefono: '',
    email: '',
    activo: true,
};

const ESTADOS = [
    'Aguascalientes',
    'Baja California',
    'Baja California Sur',
    'Campeche',
    'Chiapas',
    'Chihuahua',
    'Ciudad de México',
    'Coahuila',
    'Colima',
    'Durango',
    'Estado de México',
    'Guanajuato',
    'Guerrero',
    'Hidalgo',
    'Jalisco',
    'Michoacán',
    'Morelos',
    'Nayarit',
    'Nuevo León',
    'Oaxaca',
    'Puebla',
    'Querétaro',
    'Quintana Roo',
    'San Luis Potosí',
    'Sinaloa',
    'Sonora',
    'Tabasco',
    'Tamaulipas',
    'Tlaxcala',
    'Veracruz',
    'Yucatán',
    'Zacatecas',
];

/** Words skipped when suggesting a clave: the school's name and connectors ("CICCIS Rafael Lucio" → RL). */
const PALABRAS_VACIAS = new Set(['CICCIS', 'PLANTEL', 'DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'Y', 'E', 'EN']);

/** Initials of the place name, or its first two letters for a one-word name ("Tlacolulan" → TL), kept unused. */
export function sugerirClavePlantel(nombre: string, usadas: Record<string, string>): string {
    const palabras = nombre
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((palabra) => palabra && !PALABRAS_VACIAS.has(palabra));

    if (palabras.length === 0) return '';

    const base =
        palabras.length > 1
            ? palabras
                  .map((palabra) => palabra[0])
                  .join('')
                  .slice(0, 4)
            : palabras[0].slice(0, 2);
    const candidatas = [base, palabras[0].slice(0, 3)];
    const libre = candidatas.find((clave) => !(clave in usadas));

    if (libre) return libre;

    for (let n = 2; n < 100; n++) {
        if (!(`${base}${n}` in usadas)) return `${base}${n}`;
    }

    return base;
}

interface PlantelFormProps {
    data: PlantelFormData;
    setData: <K extends keyof PlantelFormData>(key: K, value: PlantelFormData[K]) => void;
    errors: Partial<Record<keyof PlantelFormData, string>>;
    /** Claves of the other planteles, keyed to their name. */
    clavesUsadas: Record<string, string>;
    processing: boolean;
    onSubmit: FormEventHandler;
    submitLabel: string;
    /** When creating, the clave follows the name until it is edited by hand. */
    sugerirClaveAutomatica?: boolean;
    /** Extra block in the side column (the plantel's current activity, or what comes next). */
    complemento?: ReactNode;
}

export function PlantelForm({
    data,
    setData,
    errors,
    clavesUsadas,
    processing,
    onSubmit,
    submitLabel,
    sugerirClaveAutomatica = false,
    complemento,
}: PlantelFormProps) {
    const claveManual = useRef(!sugerirClaveAutomatica || data.clave !== '');
    const clave = data.clave.trim().toUpperCase();
    const claveOcupadaPor = clave ? clavesUsadas[clave] : undefined;
    const sugerencia = sugerirClavePlantel(data.nombre, clavesUsadas);
    const digitosTelefono = data.telefono.replace(/\D/g, '');
    const direccionLista = data.calle && data.localidad && data.estado;

    const cambiarNombre = (nombre: string) => {
        setData('nombre', nombre);

        if (!claveManual.current) {
            setData('clave', sugerirClavePlantel(nombre, clavesUsadas));
        }
    };

    const cambiarClave = (valor: string) => {
        // Clearing it hands the clave back to the suggestion.
        claveManual.current = valor !== '';
        setData('clave', valor.toUpperCase());
    };

    const field = (
        key: Exclude<keyof PlantelFormData, 'activo' | 'estado'>,
        label: ReactNode,
        props: ComponentProps<typeof Input> = {},
        ayuda?: ReactNode,
    ) => (
        <div className="grid content-start gap-2">
            <Label htmlFor={key}>{label}</Label>
            <Input id={key} value={data[key]} onChange={(e) => setData(key, e.target.value)} {...props} />
            {ayuda}
            <InputError message={errors[key]} />
        </div>
    );

    const opcional = <span className="text-muted-foreground font-normal">(opcional)</span>;

    return (
        <form onSubmit={onSubmit} className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="flex min-w-0 flex-col gap-6">
                <Seccion numero={1} icono={Building2} titulo="Datos del plantel" descripcion="Cómo se identifica en grupos, filtros y reportes.">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
                        {field('nombre', 'Nombre', {
                            required: true,
                            maxLength: 255,
                            placeholder: 'Ej. CICCIS Rafael Lucio',
                            autoFocus: sugerirClaveAutomatica,
                            onChange: (e) => cambiarNombre(e.target.value),
                        })}
                        <div className="grid content-start gap-2">
                            <Label htmlFor="clave">Clave</Label>
                            <Input
                                id="clave"
                                value={data.clave}
                                onChange={(e) => cambiarClave(e.target.value)}
                                required
                                maxLength={20}
                                placeholder="RL"
                                className="font-mono uppercase placeholder:font-sans"
                                aria-invalid={claveOcupadaPor ? true : undefined}
                                aria-describedby="clave-ayuda"
                            />
                            <div id="clave-ayuda" className="text-xs">
                                {claveOcupadaPor ? (
                                    <p className="text-destructive flex items-start gap-1">
                                        <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                                        Ya la usa {claveOcupadaPor}.
                                    </p>
                                ) : clave === '' && sugerencia ? (
                                    <button
                                        type="button"
                                        onClick={() => cambiarClave(sugerencia)}
                                        className="text-primary flex items-center gap-1 font-medium hover:underline"
                                    >
                                        <Sparkles className="size-3 shrink-0" />
                                        Usar {sugerencia}
                                    </button>
                                ) : (
                                    <p className="text-muted-foreground">Va en las claves de sus grupos.</p>
                                )}
                            </div>
                            <InputError message={errors.clave} />
                        </div>
                    </div>
                </Seccion>

                <Seccion numero={2} icono={MapPin} titulo="Dirección" descripcion="Dónde está la sede; se muestra con un enlace al mapa.">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                        <div className="sm:col-span-6">
                            {field('calle', 'Calle', { required: true, maxLength: 255, placeholder: 'Ej. División del Norte' })}
                        </div>
                        <div className="sm:col-span-2">{field('numero_exterior', 'Número exterior', { required: true, maxLength: 20 })}</div>
                        <div className="sm:col-span-2">{field('numero_interior', <>Número interior {opcional}</>, { maxLength: 20 })}</div>
                        <div className="sm:col-span-2">
                            {field(
                                'codigo_postal',
                                'Código postal',
                                { required: true, inputMode: 'numeric', maxLength: 5, pattern: '\\d{5}', placeholder: '00000' },
                                data.codigo_postal && data.codigo_postal.length < 5 && (
                                    <p className="text-muted-foreground text-xs">Faltan {5 - data.codigo_postal.length} dígitos.</p>
                                ),
                            )}
                        </div>
                        <div className="sm:col-span-3">{field('colonia', 'Colonia', { required: true, maxLength: 255 })}</div>
                        <div className="sm:col-span-3">{field('localidad', 'Localidad', { required: true, maxLength: 255 })}</div>
                        <div className="sm:col-span-3">
                            {field(
                                'municipio',
                                'Municipio',
                                { required: true, maxLength: 255 },
                                !data.municipio && data.localidad && (
                                    <button
                                        type="button"
                                        onClick={() => setData('municipio', data.localidad)}
                                        className="text-primary flex items-center gap-1 text-left text-xs font-medium hover:underline"
                                    >
                                        <Sparkles className="size-3 shrink-0" />
                                        Usar {data.localidad}
                                    </button>
                                ),
                            )}
                        </div>
                        <div className="grid content-start gap-2 sm:col-span-3">
                            <Label htmlFor="estado">Estado</Label>
                            <Select value={data.estado} onValueChange={(value) => setData('estado', value)}>
                                <SelectTrigger id="estado">
                                    <SelectValue placeholder="Selecciona un estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ESTADOS.map((estado) => (
                                        <SelectItem key={estado} value={estado}>
                                            {estado}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.estado} />
                        </div>
                    </div>
                    {direccionLista && (
                        <a
                            href={urlMapa(data)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                        >
                            <MapPin className="size-4" />
                            Comprobar en el mapa
                            <ExternalLink className="size-3.5" />
                        </a>
                    )}
                </Seccion>

                <Seccion numero={3} icono={Phone} titulo="Contacto" descripcion="Para que alumnos y personal puedan comunicarse con la sede.">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {field(
                            'telefono',
                            <>Teléfono {opcional}</>,
                            { type: 'tel', inputMode: 'tel', maxLength: 15, placeholder: '10 dígitos' },
                            digitosTelefono.length > 0 && (
                                <p
                                    className={cn(
                                        'text-xs',
                                        digitosTelefono.length === 10 ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-300',
                                    )}
                                >
                                    {digitosTelefono.length === 10
                                        ? `Se mostrará como ${formatTelefono(data.telefono)}.`
                                        : `Lleva ${digitosTelefono.length} de 10 dígitos.`}
                                </p>
                            ),
                        )}
                        {field('email', <>Correo electrónico {opcional}</>, { type: 'email', maxLength: 255, placeholder: 'plantel@ciccis.mx' })}
                    </div>
                </Seccion>

                <Seccion numero={4} icono={Power} titulo="Disponibilidad" descripcion="Solo en los planteles activos se pueden abrir grupos nuevos.">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2" role="radiogroup" aria-label="Disponibilidad del plantel">
                        <OpcionTarjeta seleccionada={data.activo} onSelect={() => setData('activo', true)}>
                            <CircleCheck className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <div>
                                <p className="font-medium">Activo</p>
                                <p className="text-muted-foreground text-xs">Opera y recibe grupos nuevos.</p>
                            </div>
                        </OpcionTarjeta>
                        <OpcionTarjeta seleccionada={!data.activo} onSelect={() => setData('activo', false)}>
                            <CircleOff className="text-muted-foreground size-5 shrink-0" />
                            <div>
                                <p className="font-medium">Inactivo</p>
                                <p className="text-muted-foreground text-xs">Aún no abre o dejó de operar; sus grupos actuales siguen igual.</p>
                            </div>
                        </OpcionTarjeta>
                    </div>
                    <InputError message={errors.activo} />
                </Seccion>

                {/* Phones and tablets: actions at the end of the form (on wide screens they live in the side column). */}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end xl:hidden">
                    <Button variant="outline" type="button" asChild>
                        <Link href={route('planteles.index')}>Cancelar</Link>
                    </Button>
                    <Button disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        {submitLabel}
                    </Button>
                </div>
            </div>

            <aside className={cn('order-first flex flex-col gap-6 xl:sticky xl:top-6 xl:order-none', !complemento && 'hidden xl:flex')}>
                {' '}
                <Card className="hidden gap-0 overflow-hidden p-0 xl:flex xl:flex-col">
                    <div className="bg-muted/40 border-b px-5 py-3">
                        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Vista previa</p>
                    </div>
                    <div className="p-4">
                        <PlantelTarjeta
                            plantel={{
                                ...data,
                                clave,
                                numero_interior: data.numero_interior || null,
                                telefono: data.telefono || null,
                                email: data.email || null,
                            }}
                            className="hover:shadow-none"
                        />
                    </div>
                    <div className="flex flex-col gap-2 border-t p-5">
                        <Button disabled={processing} className="w-full">
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            {submitLabel}
                        </Button>
                        <Button variant="ghost" type="button" asChild className="w-full">
                            <Link href={route('planteles.index')}>Cancelar</Link>
                        </Button>
                    </div>
                </Card>
                {complemento}
            </aside>
        </form>
    );
}
