import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Award, ChevronDown, ClipboardList, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { useState } from 'react';

export type TipoDocumento = 'boleta' | 'constancia';

/** An enrollment a boleta or constancia can be issued for (ReporteController::inscripcionParaDocumento). */
export interface InscripcionDocumento {
    id: number;
    grupo: string;
    curso: string;
    plantel_id: number;
    plantel: string;
    estado: 'activo' | 'baja' | 'egresado' | 'no_acreditado';
    promedio_final: number | null;
    puede_constancia: boolean;
}

/** What issuing needs besides the enrollment (ReporteController::datosEmision). */
export interface DatosEmision {
    firmantes: Record<number, string[]>;
    siguientesFolios: Record<TipoDocumento, string>;
    csrf: string;
}

export interface MesReporte {
    valor: string;
    etiqueta: string;
}

export const TIPOS_DOCUMENTO: Record<TipoDocumento, { nombre: string; icono: typeof FileText; descripcion: string }> = {
    boleta: {
        nombre: 'Boleta de calificaciones',
        icono: FileText,
        descripcion: 'Calificación de cada módulo, promedio, asistencia y situación en el curso.',
    },
    constancia: {
        nombre: 'Constancia de estudios',
        icono: Award,
        descripcion: 'Hace constar que concluyó el curso, con su promedio final.',
    },
};

/**
 * Issues a boleta or constancia: a plain form post to a new tab, where the server takes the folio and
 * answers with the PDF. Plain (not Inertia) so the browser can open the PDF it gets back.
 */
export function EmitirDocumentoDialog({
    inscripcion,
    alumno,
    tipo,
    emision,
    open,
    onOpenChange,
    onEmitido,
}: {
    inscripcion: InscripcionDocumento;
    alumno: string;
    tipo: TipoDocumento;
    emision: DatosEmision;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEmitido?: () => void;
}) {
    const firmantes = emision.firmantes[inscripcion.plantel_id] ?? [];
    const [firmante, setFirmante] = useState(firmantes[0] ?? '');
    const datos = TIPOS_DOCUMENTO[tipo];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form
                    method="post"
                    action={route('documentos.store', inscripcion.id)}
                    target="_blank"
                    onSubmit={() => {
                        // Let the browser send the form before the dialog unmounts it.
                        setTimeout(() => {
                            onOpenChange(false);
                            onEmitido?.();
                        }, 300);
                    }}
                    className="flex flex-col gap-5"
                >
                    <input type="hidden" name="_token" value={emision.csrf} />
                    <input type="hidden" name="tipo" value={tipo} />
                    {firmantes.length > 1 && <input type="hidden" name="firmante" value={firmante} />}

                    <DialogHeader>
                        <DialogTitle>Emitir {datos.nombre.toLowerCase()}</DialogTitle>
                        <DialogDescription>{datos.descripcion}</DialogDescription>
                    </DialogHeader>

                    <dl className="bg-muted/50 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg px-4 py-3 text-sm">
                        <dt className="text-muted-foreground">Alumno</dt>
                        <dd className="font-medium">{alumno}</dd>
                        <dt className="text-muted-foreground">Curso</dt>
                        <dd>
                            {inscripcion.curso} · <span className="font-mono text-xs">{inscripcion.grupo}</span>
                        </dd>
                        <dt className="text-muted-foreground">Folio</dt>
                        <dd className="font-mono font-medium">{emision.siguientesFolios[tipo]}</dd>
                    </dl>

                    {firmantes.length > 1 ? (
                        <div className="grid gap-2">
                            <Label htmlFor="firmante">Firma</Label>
                            <Select value={firmante} onValueChange={setFirmante}>
                                <SelectTrigger id="firmante">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {firmantes.map((nombre) => (
                                        <SelectItem key={nombre} value={nombre}>
                                            {nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-sm">
                            {firmantes.length === 1
                                ? `Lo firma ${firmantes[0]}, director(a) de ${inscripcion.plantel}.`
                                : `${inscripcion.plantel} no tiene director asignado: la línea de firma quedará sin nombre.`}
                        </p>
                    )}

                    <p className="text-muted-foreground text-xs">
                        Cada emisión toma un folio nuevo y queda registrada en Reportes → Documentos emitidos, desde donde se puede volver a descargar
                        sin gastar otro.
                    </p>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit">
                            <Printer className="size-4" />
                            Emitir y abrir PDF
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/** "Boleta" and, for a graduate, "Constancia" buttons for one enrollment. */
export function BotonesDocumento({
    inscripcion,
    alumno,
    emision,
    onEmitido,
    className,
}: {
    inscripcion: InscripcionDocumento;
    alumno: string;
    emision: DatosEmision;
    onEmitido?: () => void;
    className?: string;
}) {
    const [tipo, setTipo] = useState<TipoDocumento | null>(null);
    const tipos: TipoDocumento[] = inscripcion.puede_constancia ? ['boleta', 'constancia'] : ['boleta'];

    return (
        <div className={cn('flex flex-wrap gap-2', className)}>
            {tipos.map((clave) => {
                const Icono = TIPOS_DOCUMENTO[clave].icono;

                return (
                    <Button key={clave} type="button" variant="outline" size="sm" onClick={() => setTipo(clave)}>
                        <Icono className="size-3.5" />
                        {clave === 'boleta' ? 'Boleta' : 'Constancia'}
                    </Button>
                );
            })}
            {tipo && (
                <EmitirDocumentoDialog
                    inscripcion={inscripcion}
                    alumno={alumno}
                    tipo={tipo}
                    emision={emision}
                    open
                    onOpenChange={(abierto) => !abierto && setTipo(null)}
                    onEmitido={onEmitido}
                />
            )}
        </div>
    );
}

/** Picks the month (and whether blank) of a grupo's roll-call sheet and opens the PDF. */
export function ListaAsistenciaDialog({
    grupoId,
    grupoClave,
    meses,
    mesSugerido,
    open,
    onOpenChange,
}: {
    grupoId: number;
    grupoClave: string;
    meses: MesReporte[];
    mesSugerido: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [mes, setMes] = useState(mesSugerido ?? meses[0]?.valor ?? '');
    const [enBlanco, setEnBlanco] = useState(false);

    const abrir = () => {
        window.open(route('reportes.asistencia', { grupo: grupoId, mes, en_blanco: enBlanco ? 1 : 0 }), '_blank');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Lista de asistencia</DialogTitle>
                    <DialogDescription>
                        Las clases del mes de <span className="font-mono">{grupoClave}</span> según su calendario, con las asistencias registradas o
                        en blanco para pasar lista a mano.
                    </DialogDescription>
                </DialogHeader>

                {meses.length === 0 ? (
                    <p className="text-muted-foreground text-sm">El grupo todavía no tiene meses de clase.</p>
                ) : (
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="mes-lista">Mes</Label>
                            <Select value={mes} onValueChange={setMes}>
                                <SelectTrigger id="mes-lista">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {meses.map((opcion) => (
                                        <SelectItem key={opcion.valor} value={opcion.valor}>
                                            {opcion.etiqueta}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <label className="flex items-start gap-3 text-sm">
                            <Checkbox checked={enBlanco} onCheckedChange={(valor) => setEnBlanco(valor === true)} className="mt-0.5" />
                            <span>
                                <span className="font-medium">En blanco</span>
                                <span className="text-muted-foreground block">Sin las asistencias registradas, para llenarla a mano.</span>
                            </span>
                        </label>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={abrir} disabled={!mes}>
                        <Printer className="size-4" />
                        Abrir PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/** The grupo page's "Reportes" menu: grade sheet and monthly roll-call sheet. */
export function ReportesGrupoMenu({
    grupoId,
    grupoClave,
    meses,
    mesSugerido,
    className,
}: {
    grupoId: number;
    grupoClave: string;
    meses: MesReporte[];
    mesSugerido: string | null;
    className?: string;
}) {
    const [lista, setLista] = useState(false);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className={className}>
                        <Printer className="size-4" />
                        Reportes
                        <ChevronDown className="size-3.5 opacity-60" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">PDF para imprimir</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <a href={route('reportes.concentrado', grupoId)} target="_blank" rel="noopener">
                            <FileSpreadsheet className="size-4" />
                            <span>
                                Concentrado de calificaciones
                                <span className="text-muted-foreground block text-xs">Alumnos × módulos, promedio y asistencia</span>
                            </span>
                        </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLista(true)}>
                        <ClipboardList className="size-4" />
                        <span>
                            Lista de asistencia…
                            <span className="text-muted-foreground block text-xs">Por mes, llena o en blanco</span>
                        </span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <a href={route('reportes.index')}>
                            <FileText className="size-4" />
                            Boletas y constancias
                        </a>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <ListaAsistenciaDialog
                grupoId={grupoId}
                grupoClave={grupoClave}
                meses={meses}
                mesSugerido={mesSugerido}
                open={lista}
                onOpenChange={setLista}
            />
        </>
    );
}
