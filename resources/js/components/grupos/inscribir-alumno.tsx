import InputError from '@/components/input-error';
import { PersonaAvatar } from '@/components/persona-avatar';
import { Input } from '@/components/ui/input';
import { useForm } from '@inertiajs/react';
import { Loader2, Search, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';

export interface AlumnoDisponible {
    id: number;
    matricula: string;
    nombre_completo: string;
    foto_url: string | null;
}

interface InscribirAlumnoProps {
    grupoId: number;
    alumnos: AlumnoDisponible[];
    /** Called after a successful enrollment (e.g. to close the dialog that holds the picker). */
    onInscrito?: () => void;
    autoFocus?: boolean;
}

/** Search box that enrolls the picked alumno in the grupo right away. */
export function InscribirAlumno({ grupoId, alumnos, onInscrito, autoFocus = false }: InscribirAlumnoProps) {
    const [query, setQuery] = useState('');
    const { post, processing, errors, transform } = useForm({ alumno_id: '' });

    const matches = useMemo(() => {
        const term = query.trim().toLowerCase();

        if (!term) return [];

        return alumnos.filter((a) => a.nombre_completo.toLowerCase().includes(term) || a.matricula.toLowerCase().includes(term)).slice(0, 8);
    }, [alumnos, query]);

    const inscribir = (alumno: AlumnoDisponible) => {
        // setData is async, so send the picked id through transform instead.
        transform(() => ({ alumno_id: String(alumno.id) }));
        post(route('inscripciones.store', grupoId), {
            preserveScroll: true,
            onSuccess: () => {
                setQuery('');
                onInscrito?.();
            },
        });
    };

    return (
        <div className="space-y-2">
            <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nombre o matrícula del alumno..."
                    autoFocus={autoFocus}
                    className="pl-9"
                    disabled={processing}
                />
                {processing && <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />}
            </div>
            <InputError message={errors.alumno_id} />

            {query.trim() && (
                <div className="overflow-hidden rounded-lg border">
                    {matches.length > 0 ? (
                        matches.map((alumno) => (
                            <button
                                key={alumno.id}
                                type="button"
                                disabled={processing}
                                className="hover:bg-muted flex w-full items-center gap-3 border-b px-3 py-2.5 text-left last:border-0 disabled:opacity-50"
                                onClick={() => inscribir(alumno)}
                            >
                                <PersonaAvatar nombre={alumno.nombre_completo} fotoUrl={alumno.foto_url} className="size-8" />
                                <span className="flex-1 truncate text-sm font-medium">{alumno.nombre_completo}</span>
                                <span className="text-muted-foreground font-mono text-xs">{alumno.matricula}</span>
                                <UserPlus className="text-primary size-4" />
                            </button>
                        ))
                    ) : (
                        <p className="text-muted-foreground p-4 text-center text-sm">
                            No hay alumnos disponibles con ese nombre. Regístralo primero en el módulo Alumnos.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
