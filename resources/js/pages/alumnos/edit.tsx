import { AlumnoForm, type AlumnoFormData } from '@/components/alumnos/alumno-form';
import { AsistenciaCompacta, type CursoInscrito } from '@/components/alumnos/cursos-alumno';
import { type Boleta, BoletaDesplegable } from '@/components/calificaciones/calificacion';
import { PersonaAvatar } from '@/components/persona-avatar';
import { BotonesDocumento, type DatosEmision, type InscripcionDocumento } from '@/components/reportes/documentos';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { cn, formatFecha } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';
import { FormEventHandler } from 'react';

interface EditableAlumno {
    id: number;
    matricula: string;
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string | null;
    curp: string | null;
    fecha_nacimiento: string | null;
    genero: string | null;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
    contacto_emergencia_nombre: string | null;
    contacto_emergencia_telefono: string | null;
    activo: boolean;
    foto_url: string | null;
    tiene_cuenta: boolean;
    registrado: string | null;
}

interface InscripcionAlumno extends CursoInscrito {
    estado: 'activo' | 'baja' | 'egresado' | 'no_acreditado';
    promedio_final: number | null;
    fecha_cierre: string | null;
    fecha_inscripcion: string | null;
    fecha_baja: string | null;
    calificaciones: Boleta;
    puede_ver_calificaciones: boolean;
    /** Set when the user prints this enrollment's boleta / constancia. */
    documento: InscripcionDocumento | null;
}

interface EditAlumnoProps {
    alumno: EditableAlumno;
    inscripciones: InscripcionAlumno[];
    emision: DatosEmision | null;
}

const ESTADO_INSCRIPCION: Record<InscripcionAlumno['estado'], string> = {
    activo: 'Inscrito',
    baja: 'Baja',
    egresado: 'Egresado',
    no_acreditado: 'No acreditado',
};

export default function EditAlumno({ alumno, inscripciones, emision }: EditAlumnoProps) {
    const nombreCompleto = [alumno.nombre, alumno.apellido_paterno, alumno.apellido_materno].filter(Boolean).join(' ');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Alumnos', href: '/alumnos' },
        { title: nombreCompleto, href: `/alumnos/${alumno.id}/edit` },
    ];

    const { data, setData, post, transform, errors, processing } = useForm<AlumnoFormData>({
        nombre: alumno.nombre,
        apellido_paterno: alumno.apellido_paterno,
        apellido_materno: alumno.apellido_materno ?? '',
        curp: alumno.curp ?? '',
        fecha_nacimiento: alumno.fecha_nacimiento ?? '',
        genero: alumno.genero ?? '',
        telefono: alumno.telefono ?? '',
        email: alumno.email ?? '',
        direccion: alumno.direccion ?? '',
        contacto_emergencia_nombre: alumno.contacto_emergencia_nombre ?? '',
        contacto_emergencia_telefono: alumno.contacto_emergencia_telefono ?? '',
        activo: alumno.activo,
        foto: null,
        remove_foto: false,
        crear_cuenta: false,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        // PHP only parses multipart bodies on POST, so the photo travels in a spoofed PUT.
        transform((data) => ({ ...data, _method: 'put' }));
        post(route('alumnos.update', alumno.id), { forceFormData: true });
    };

    const actuales = inscripciones.filter((inscripcion) => inscripcion.estado === 'activo');
    const anteriores = inscripciones.filter((inscripcion) => inscripcion.estado !== 'activo');
    const enRiesgo = actuales.filter((inscripcion) => inscripcion.asistencia.en_riesgo).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${nombreCompleto}`} />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex max-w-6xl flex-col gap-6 p-4 sm:p-6"
            >
                <div className="flex items-center gap-3">
                    <Link
                        href={route('alumnos.index')}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                        aria-label="Volver a alumnos"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>
                    <PersonaAvatar nombre={nombreCompleto} fotoUrl={alumno.foto_url} className="size-11" />
                    <div className="min-w-0">
                        <p className="text-muted-foreground text-sm">
                            Editar alumno · <span className="font-mono">{alumno.matricula}</span>
                        </p>
                        <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl leading-tight font-semibold tracking-tight">
                            {nombreCompleto}
                            {!alumno.activo && (
                                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">Inactivo</span>
                            )}
                        </h1>
                    </div>
                </div>

                <AlumnoForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    matricula={alumno.matricula}
                    fotoUrl={alumno.foto_url}
                    tieneCuenta={alumno.tiene_cuenta}
                    processing={processing}
                    onSubmit={submit}
                    submitLabel="Guardar cambios"
                    complemento={
                        <Card className="gap-0 p-0">
                            <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
                                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Sus cursos</p>
                                {alumno.registrado && <p className="text-muted-foreground text-xs">Alta: {formatFecha(alumno.registrado)}</p>}
                            </div>

                            {enRiesgo > 0 && (
                                <p className="bg-destructive/10 text-destructive mx-5 mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm">
                                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                    Su asistencia está por debajo del 80% en {enRiesgo === 1 ? 'un curso' : `${enRiesgo} cursos`}.
                                </p>
                            )}

                            {inscripciones.length === 0 ? (
                                <p className="text-muted-foreground px-5 py-4 text-sm">
                                    Todavía no está inscrito en ningún grupo. Inscríbelo desde la página del grupo («Inscribir alumno»).
                                </p>
                            ) : (
                                <ul className="divide-y">
                                    {[...actuales, ...anteriores].map((inscripcion) => (
                                        <li
                                            key={inscripcion.inscripcion_id}
                                            className={cn('space-y-1.5 px-5 py-3', inscripcion.estado !== 'activo' && 'opacity-70')}
                                        >
                                            <div className="flex items-start gap-2.5">
                                                <span className="bg-primary/10 text-primary mt-0.5 w-10 shrink-0 rounded-md py-0.5 text-center text-[11px] font-bold">
                                                    {inscripcion.curso_clave}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <Link
                                                        href={route('grupos.show', inscripcion.grupo_id)}
                                                        className="text-sm font-medium hover:underline"
                                                    >
                                                        {inscripcion.curso}
                                                    </Link>
                                                    <p className="text-muted-foreground truncate font-mono text-[11px]">
                                                        {inscripcion.grupo_clave} · {inscripcion.plantel_clave}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 pl-12.5 text-xs">
                                                {inscripcion.estado === 'activo' ? (
                                                    <AsistenciaCompacta grupoEstado={inscripcion.grupo_estado} asistencia={inscripcion.asistencia} />
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        {ESTADO_INSCRIPCION[inscripcion.estado]}
                                                        {inscripcion.promedio_final !== null &&
                                                            ` · promedio ${inscripcion.promedio_final.toFixed(1)}`}
                                                        {(inscripcion.fecha_baja ?? inscripcion.fecha_cierre) &&
                                                            ` el ${formatFecha((inscripcion.fecha_baja ?? inscripcion.fecha_cierre)!)}`}
                                                        {inscripcion.asistencia.porcentaje !== null &&
                                                            ` · ${inscripcion.asistencia.porcentaje}% asistencia`}
                                                    </span>
                                                )}
                                                {inscripcion.estado === 'activo' && inscripcion.fecha_inscripcion && (
                                                    <span className="text-muted-foreground">desde {formatFecha(inscripcion.fecha_inscripcion)}</span>
                                                )}
                                            </div>
                                            {inscripcion.puede_ver_calificaciones && inscripcion.calificaciones.total > 0 && (
                                                <div className="pt-1 pl-12.5">
                                                    <BoletaDesplegable boleta={inscripcion.calificaciones} />
                                                </div>
                                            )}
                                            {inscripcion.documento && emision && (
                                                <BotonesDocumento
                                                    inscripcion={inscripcion.documento}
                                                    alumno={nombreCompleto}
                                                    emision={emision}
                                                    onEmitido={() => router.reload({ only: ['emision'] })}
                                                    className="pt-1 pl-12.5"
                                                />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {alumno.tiene_cuenta && (
                                <p className="text-muted-foreground flex items-center gap-2 border-t px-5 py-3 text-xs">
                                    <KeyRound className="size-3.5 shrink-0" />
                                    Entra al sistema con {alumno.email}
                                </p>
                            )}
                        </Card>
                    }
                />
            </motion.div>
        </AppLayout>
    );
}
