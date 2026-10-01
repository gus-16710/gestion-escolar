import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatTelefono } from '@/lib/utils';
import { AlertTriangle, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, type ReactNode } from 'react';

/** Pieces shared by the person forms (alumnos, profesores): CURP, age, phone hints, photo preview and the side "ficha". */

/** Structure of a CURP: 4 letters, birth date YYMMDD, sex (H/M/X), state and consonants, homoclave and check digit. */
const FORMATO_CURP = /^[A-Z]{4}(\d{2})(\d{2})(\d{2})([HMX])[A-Z]{5}([A-Z0-9])\d$/;

/** Birth date and sex encoded in a complete CURP; the homoclave is a digit for people born before 2000 and a letter after. */
export function datosDeCurp(curp: string): { fecha_nacimiento: string; genero: 'masculino' | 'femenino' | 'otro' } | null {
    const partes = curp.toUpperCase().match(FORMATO_CURP);

    if (!partes) return null;

    const [, yy, mm, dd, sexo, homoclave] = partes;
    const fecha = `${/\d/.test(homoclave) ? '19' : '20'}${yy}-${mm}-${dd}`;
    const valida = !Number.isNaN(new Date(`${fecha}T00:00:00`).getTime()) && Number(mm) >= 1 && Number(mm) <= 12 && Number(dd) >= 1;

    return valida ? { fecha_nacimiento: fecha, genero: sexo === 'H' ? 'masculino' : sexo === 'M' ? 'femenino' : 'otro' } : null;
}

export function edad(fechaNacimiento: string): number | null {
    const [y, m, d] = fechaNacimiento.split('-').map(Number);

    if (!y || !m || !d) return null;

    const hoy = new Date();
    const anios = hoy.getFullYear() - y - (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d) ? 1 : 0);

    return anios >= 0 && anios < 120 ? anios : null;
}

export const opcional = <span className="text-muted-foreground font-normal">(opcional)</span>;

/** Under a phone input: how many digits are still missing, or how it will be shown. */
export function AyudaTelefono({ valor }: { valor: string }) {
    const digitos = valor.replace(/\D/g, '');

    if (digitos.length === 0) return null;

    return (
        <p className={cn('text-xs', digitos.length === 10 ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-300')}>
            {digitos.length === 10 ? `Se mostrará como ${formatTelefono(valor)}.` : `Lleva ${digitos.length} de 10 dígitos.`}
        </p>
    );
}

/** CURP input with a character count, a format warning and, once complete, an optional action (e.g. "Tomar de la CURP"). */
export function CampoCurp({
    value,
    onChange,
    error,
    accion,
}: {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    accion?: ReactNode;
}) {
    const curp = value.toUpperCase();
    const invalida = curp.length === 18 && !datosDeCurp(curp);

    return (
        <div className="grid content-start gap-2">
            <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor="curp">CURP {opcional}</Label>
                {curp && <span className="text-muted-foreground text-xs tabular-nums">{curp.length}/18</span>}
            </div>
            <Input
                id="curp"
                value={value}
                onChange={(e) => onChange(e.target.value.toUpperCase().replace(/\s/g, ''))}
                maxLength={18}
                className="font-mono uppercase placeholder:font-sans placeholder:normal-case"
                placeholder="18 caracteres"
                aria-describedby="curp-ayuda"
            />
            <div id="curp-ayuda" className="text-xs">
                {invalida ? (
                    <p className="flex items-start gap-1 text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                        Revisa la CURP: el formato no coincide.
                    </p>
                ) : (
                    accion
                )}
            </div>
            <InputError message={error} />
        </div>
    );
}

/** One line of the side "ficha": icon plus value, or a muted placeholder when empty. */
export function FichaDato({ icono: Icono, valor, vacio, mono = false }: { icono: LucideIcon; valor?: string; vacio: string; mono?: boolean }) {
    return (
        <div className="flex min-w-0 items-center gap-2.5">
            <Icono className="text-muted-foreground size-4 shrink-0" />
            <span className={cn('truncate', !valor && 'text-muted-foreground', valor && mono && 'font-mono text-xs')}>{valor ?? vacio}</span>
        </div>
    );
}

/** A temporary URL to preview a picked file, released when it changes. */
export function useObjectUrl(file: File | null): string | null {
    const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

    useEffect(
        () => () => {
            if (url) URL.revokeObjectURL(url);
        },
        [url],
    );

    return url;
}
