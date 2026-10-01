import InputError from '@/components/input-error';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { KeyRound, ShieldCheck } from 'lucide-react';

/** Form fields every person form with an optional login account shares. */
export type CuentaAccesoData = {
    crear_cuenta: boolean;
    password: string;
    password_confirmation: string;
};

// Generic over the full form type so each form can pass its own useForm setData.
interface CuentaAccesoFieldsProps<T extends CuentaAccesoData> {
    /** Role granted to the account, e.g. "Profesor" or "Alumno". */
    rol: string;
    /** How the person is referred to in the copy, e.g. "el profesor". */
    persona: string;
    tieneCuenta: boolean;
    data: T;
    setData: <K extends keyof T>(key: K, value: T[K]) => void;
    errors: Partial<Record<keyof T, string>>;
    /** False when the surrounding form section already names it. */
    conTitulo?: boolean;
}

export function CuentaAccesoFields<T extends CuentaAccesoData>({
    rol,
    persona,
    tieneCuenta,
    data,
    setData,
    errors,
    conTitulo = true,
}: CuentaAccesoFieldsProps<T>) {
    return (
        <div className="space-y-4">
            {conTitulo && (
                <>
                    <h3 className="text-sm font-medium">Acceso al sistema</h3>
                    <Separator />
                </>
            )}
            {tieneCuenta ? (
                <div className="bg-secondary text-secondary-foreground flex items-start gap-2 rounded-md px-3 py-2 text-sm">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                    <span>Ya tiene cuenta con el rol {rol}. Inicia sesión con el correo de arriba; si lo cambias, también cambia su usuario.</span>
                </div>
            ) : (
                <div className="flex items-start gap-2">
                    <Checkbox
                        id="crear_cuenta"
                        className="mt-0.5"
                        checked={data.crear_cuenta}
                        onCheckedChange={(checked) => setData('crear_cuenta', (checked === true) as T['crear_cuenta'])}
                    />
                    <div className="grid gap-0.5">
                        <Label htmlFor="crear_cuenta">Dar acceso al sistema</Label>
                        <p className="text-muted-foreground text-xs">
                            {persona.charAt(0).toUpperCase() + persona.slice(1)} podrá iniciar sesión con su correo y verá las opciones de{' '}
                            {rol.toLowerCase()}.
                        </p>
                    </div>
                </div>
            )}

            {(tieneCuenta || data.crear_cuenta) && (
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="password">{tieneCuenta ? 'Nueva contraseña (opcional)' : 'Contraseña'}</Label>
                        <Input
                            id="password"
                            type="password"
                            autoComplete="new-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value as T['password'])}
                            required={!tieneCuenta}
                            placeholder={tieneCuenta ? 'Dejar en blanco para no cambiarla' : undefined}
                        />
                        <InputError message={errors.password} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">Confirmar contraseña</Label>
                        <Input
                            id="password_confirmation"
                            type="password"
                            autoComplete="new-password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value as T['password_confirmation'])}
                            required={!tieneCuenta}
                        />
                        <InputError message={errors.password_confirmation} />
                    </div>
                    {!tieneCuenta && (
                        <p className="text-muted-foreground flex items-center gap-1.5 text-xs sm:col-span-2">
                            <KeyRound className="size-3.5" />
                            Comparte la contraseña con {persona}; podrá cambiarla en su configuración.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
