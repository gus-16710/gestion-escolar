import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Table2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';

interface ChartCardProps {
    titulo: string;
    descripcion?: string;
    /** Shown instead of the chart when there is nothing to plot. */
    vacio?: boolean;
    mensajeVacio?: string;
    children: ReactNode;
    /** Same data as a table, the accessible alternative to the chart. */
    tabla?: ReactNode;
}

/** Card that frames a chart with a title, an empty state and a "view as table" toggle. */
export function ChartCard({ titulo, descripcion, vacio = false, mensajeVacio = 'Aún no hay datos para mostrar.', children, tabla }: ChartCardProps) {
    const [verTabla, setVerTabla] = useState(false);

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base">{titulo}</CardTitle>
                    {descripcion && <p className="text-muted-foreground text-xs">{descripcion}</p>}
                </div>
                {tabla && !vacio && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground h-7 px-2 text-xs"
                        onClick={() => setVerTabla(!verTabla)}
                        aria-pressed={verTabla}
                    >
                        {verTabla ? <BarChart3 className="size-3.5" /> : <Table2 className="size-3.5" />}
                        {verTabla ? 'Ver gráfica' : 'Ver tabla'}
                    </Button>
                )}
            </CardHeader>
            <CardContent className="flex-1">
                {vacio ? (
                    <div className="text-muted-foreground flex h-48 items-center justify-center text-center text-sm">{mensajeVacio}</div>
                ) : verTabla ? (
                    tabla
                ) : (
                    children
                )}
            </CardContent>
        </Card>
    );
}

/** Tooltip body shared by the dashboard charts: surface colors, text tokens, series swatch. */
export function ChartTooltipBox({ titulo, filas }: { titulo: string; filas: { color?: string; etiqueta: string; valor: string }[] }) {
    return (
        <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
            <p className="mb-1 font-medium">{titulo}</p>
            {filas.map((fila) => (
                <div key={fila.etiqueta} className="flex items-center gap-2">
                    {fila.color && <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: fila.color }} />}
                    <span className="text-muted-foreground">{fila.etiqueta}</span>
                    <span className="ml-auto pl-3 font-medium tabular-nums">{fila.valor}</span>
                </div>
            ))}
        </div>
    );
}

/** Minimal data table used as the "Ver tabla" view of a chart. */
export function TablaDatos({ columnas, filas }: { columnas: string[]; filas: (string | number)[][] }) {
    return (
        <div className="max-h-72 overflow-auto rounded-md border">
            <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 sticky top-0">
                    <tr>
                        {columnas.map((columna, i) => (
                            <th key={columna} className={`px-3 py-2 font-medium ${i > 0 ? 'text-right' : ''}`}>
                                {columna}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {filas.map((fila, i) => (
                        <tr key={i} className="border-t">
                            {fila.map((celda, j) => (
                                <td key={j} className={`px-3 py-1.5 ${j > 0 ? 'text-right tabular-nums' : ''}`}>
                                    {celda}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
