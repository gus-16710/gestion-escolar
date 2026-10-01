import AppLogoIcon from '@/components/app-logo-icon';
import { Card } from '@/components/ui/card';
import { cn, formatFecha } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import { CheckCircle2, SearchX, XCircle } from 'lucide-react';

interface DocumentoVerificado {
    tipo: string;
    clave_tipo: 'boleta' | 'constancia';
    folio: string;
    vigente: boolean;
    anulado_en: string | null;
    motivo_anulacion: string | null;
    emitido_en: string;
    alumno: string | null;
    matricula: string | null;
    curso: string | null;
    grupo: string | null;
    plantel: string | null;
    promedio: number | null;
    promedio_parcial: boolean;
    resultado: string | null;
}

/**
 * Public page opened by the QR of a boleta or constancia (VerificacionController): no session needed.
 */
export default function Verificar({ documento }: { documento: DocumentoVerificado | null }) {
    const estado = documento === null ? 'desconocido' : documento.vigente ? 'vigente' : 'anulado';

    const encabezado = {
        vigente: {
            icono: CheckCircle2,
            titulo: 'Documento válido',
            texto: 'Este documento fue emitido por CICCIS y sigue vigente.',
            clase: 'bg-emerald-600 text-white',
        },
        anulado: {
            icono: XCircle,
            titulo: 'Documento anulado',
            texto: 'Este documento fue emitido por CICCIS pero ya no es válido.',
            clase: 'bg-red-600 text-white',
        },
        desconocido: {
            icono: SearchX,
            titulo: 'Documento no encontrado',
            texto: 'El código no corresponde a ningún documento emitido por CICCIS. Revisa que el enlace esté completo.',
            clase: 'bg-muted text-foreground',
        },
    }[estado];
    const Icono = encabezado.icono;

    return (
        <div className="bg-muted/40 flex min-h-svh flex-col items-center px-4 py-10">
            <Head title="Verificar documento" />
            <div className="flex w-full max-w-md flex-col items-center gap-6">
                <div className="flex flex-col items-center gap-2">
                    <AppLogoIcon className="text-primary size-14" />
                    <p className="text-primary text-lg font-bold tracking-widest">CICCIS</p>
                    <p className="text-muted-foreground text-sm">Verificación de documentos</p>
                </div>

                <Card className="w-full gap-0 overflow-hidden p-0">
                    <div className={cn('flex items-center gap-3 px-5 py-4', encabezado.clase)}>
                        <Icono className="size-8 shrink-0" />
                        <div>
                            <h1 className="text-lg font-semibold">{encabezado.titulo}</h1>
                            <p className="text-sm opacity-90">{encabezado.texto}</p>
                        </div>
                    </div>

                    {documento && (
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 px-5 py-4 text-sm">
                            <Dato etiqueta="Documento">{documento.tipo}</Dato>
                            <Dato etiqueta="Folio">
                                <span className="font-mono font-semibold">{documento.folio}</span>
                            </Dato>
                            <Dato etiqueta="Emitido">{formatFecha(documento.emitido_en)}</Dato>
                            <Dato etiqueta="Alumno">
                                <span className="font-medium">{documento.alumno}</span>
                                {documento.matricula && <span className="text-muted-foreground block font-mono text-xs">{documento.matricula}</span>}
                            </Dato>
                            <Dato etiqueta="Curso">
                                {documento.curso}
                                {documento.grupo && <span className="text-muted-foreground block font-mono text-xs">{documento.grupo}</span>}
                            </Dato>
                            <Dato etiqueta="Plantel">{documento.plantel}</Dato>
                            {documento.promedio !== null && (
                                <Dato etiqueta={documento.promedio_parcial ? 'Promedio parcial' : 'Promedio final'}>
                                    <span className="font-semibold tabular-nums">{documento.promedio.toFixed(1)}</span>
                                </Dato>
                            )}
                            {documento.clave_tipo === 'boleta' && documento.resultado && <Dato etiqueta="Situación">{documento.resultado}</Dato>}
                            {!documento.vigente && (
                                <Dato etiqueta="Anulado">
                                    {documento.anulado_en && formatFecha(documento.anulado_en)}
                                    {documento.motivo_anulacion && <span className="text-muted-foreground block">{documento.motivo_anulacion}</span>}
                                </Dato>
                            )}
                        </dl>
                    )}
                </Card>

                <p className="text-muted-foreground text-center text-xs">
                    Los datos mostrados son los que contiene el documento impreso al momento de su emisión.
                </p>
            </div>
        </div>
    );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
    return (
        <>
            <dt className="text-muted-foreground">{etiqueta}</dt>
            <dd className="min-w-0">{children}</dd>
        </>
    );
}
