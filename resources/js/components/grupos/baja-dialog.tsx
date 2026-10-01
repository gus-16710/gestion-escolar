import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { UserMinus } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface BajaDialogProps {
    inscripcionId: number;
    alumno: string;
    /** Icon-only trigger, for dense lists. */
    compacto?: boolean;
}

/** Drops an alumno from a grupo, asking for an optional reason. */
export function BajaDialog({ inscripcionId, alumno, compacto = false }: BajaDialogProps) {
    const [open, setOpen] = useState(false);
    const { data, setData, patch, processing, errors, reset } = useForm({ motivo_baja: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('inscripciones.baja', inscripcionId), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setOpen(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {compacto ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive size-8"
                        aria-label={`Dar de baja a ${alumno}`}
                        title="Dar de baja"
                    >
                        <UserMinus className="size-4" />
                    </Button>
                ) : (
                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <UserMinus className="size-4" />
                        Dar de baja
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>¿Dar de baja a {alumno}?</DialogTitle>
                        <DialogDescription>
                            Dejará de contar en el cupo del grupo. Su inscripción y su historial de asistencias se conservan.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label htmlFor={`motivo_baja_${inscripcionId}`}>Motivo (opcional)</Label>
                        <Textarea
                            id={`motivo_baja_${inscripcionId}`}
                            rows={3}
                            value={data.motivo_baja}
                            onChange={(e) => setData('motivo_baja', e.target.value)}
                            placeholder="Cambio de horario, motivos económicos, cambio de grupo..."
                        />
                        <InputError message={errors.motivo_baja} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="destructive" disabled={processing}>
                            Dar de baja
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
