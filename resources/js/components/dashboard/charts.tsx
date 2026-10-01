import { ChartTooltipBox } from '@/components/dashboard/chart-card';
import { type AlumnosPorCurso, type AsistenciaSemana, type MovimientoMensual } from '@/components/dashboard/types';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    Legend,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    type TooltipContentProps,
    XAxis,
    YAxis,
} from 'recharts';

// Series colors come from theme tokens validated with the dataviz palette checker (light + dark).
const SERIE_1 = 'var(--chart-1)';
const SERIE_2 = 'var(--chart-2)';

// Recessive axes and grid: muted ink, thin border-colored lines.
const TICK = { fill: 'var(--muted-foreground)', fontSize: 12 };
const GRID = 'var(--border)';
const CURSOR = { fill: 'var(--muted)', opacity: 0.6 };

/** Distinct enrolled alumnos per curso: one hue, horizontal bars, value at the end of each bar. */
export function AlumnosPorCursoChart({ datos }: { datos: AlumnosPorCurso[] }) {
    const alto = Math.max(120, datos.length * 40 + 16);

    return (
        <ResponsiveContainer width="100%" height={alto}>
            <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="curso" width={112} tick={TICK} axisLine={false} tickLine={false} />
                <Tooltip
                    cursor={CURSOR}
                    content={({ active, payload }: TooltipContentProps) =>
                        active && payload?.length ? (
                            <ChartTooltipBox
                                titulo={(payload[0].payload as AlumnosPorCurso).curso}
                                filas={[{ color: SERIE_1, etiqueta: 'Alumnos', valor: String(payload[0].value) }]}
                            />
                        ) : null
                    }
                />
                <Bar dataKey="alumnos" name="Alumnos" fill={SERIE_1} radius={[0, 4, 4, 0]} barSize={18}>
                    <LabelList dataKey="alumnos" position="right" fill="var(--foreground)" fontSize={12} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

/** Weekly attendance %: a single series as a line over a faint area, with the risk threshold marked. */
export function AsistenciaSemanalChart({ datos, umbral }: { datos: AsistenciaSemana[]; umbral: number }) {
    return (
        <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={datos} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <defs>
                    <linearGradient id="asistencia-relleno" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SERIE_1} stopOpacity={0.18} />
                        <stop offset="100%" stopColor={SERIE_1} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="etiqueta" tick={TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(v: number) => `${v}%`}
                    tick={TICK}
                    axisLine={false}
                    tickLine={false}
                />
                <ReferenceLine
                    y={umbral}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="4 4"
                    label={{ value: `Riesgo < ${umbral}%`, position: 'insideBottomRight', fill: 'var(--muted-foreground)', fontSize: 11 }}
                />
                <Tooltip
                    cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
                    content={({ active, payload }: TooltipContentProps) => {
                        if (!active || !payload?.length) return null;
                        const semana = payload[0].payload as AsistenciaSemana;

                        return (
                            <ChartTooltipBox
                                titulo={`Semana del ${semana.etiqueta}`}
                                filas={
                                    semana.porcentaje === null
                                        ? [{ etiqueta: 'Sin pase de lista', valor: '—' }]
                                        : [
                                              { color: SERIE_1, etiqueta: 'Asistencia', valor: `${semana.porcentaje}%` },
                                              { etiqueta: 'Faltas', valor: String(semana.faltas) },
                                              { etiqueta: 'Registros', valor: String(semana.total) },
                                          ]
                                }
                            />
                        );
                    }}
                />
                <Area
                    type="monotone"
                    dataKey="porcentaje"
                    name="Asistencia"
                    stroke={SERIE_1}
                    strokeWidth={2}
                    fill="url(#asistencia-relleno)"
                    connectNulls={false}
                    dot={{ r: 4, fill: SERIE_1, stroke: 'var(--card)', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: SERIE_1, stroke: 'var(--card)', strokeWidth: 2 }}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

/** Enrollments vs. drops per month: two series on one shared scale, grouped columns with a surface gap. */
export function MovimientosChart({ datos }: { datos: MovimientoMensual[] }) {
    // Direct labels only where there is something to read; zero bars stay unlabeled.
    const etiqueta = (valor: unknown) => (Number(valor) > 0 ? String(valor) : '');

    return (
        <ResponsiveContainer width="100%" height={240}>
            <BarChart data={datos} margin={{ top: 20, right: 8, bottom: 0, left: -20 }} barGap={2}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="etiqueta" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} />
                <Tooltip
                    cursor={CURSOR}
                    content={({ active, payload }: TooltipContentProps) => {
                        if (!active || !payload?.length) return null;
                        const mes = payload[0].payload as MovimientoMensual;

                        return (
                            <ChartTooltipBox
                                titulo={mes.etiqueta}
                                filas={[
                                    { color: SERIE_1, etiqueta: 'Inscripciones', valor: String(mes.inscripciones) },
                                    { color: SERIE_2, etiqueta: 'Bajas', valor: String(mes.bajas) },
                                ]}
                            />
                        );
                    }}
                />
                <Legend
                    verticalAlign="top"
                    align="right"
                    height={28}
                    iconType="square"
                    iconSize={10}
                    formatter={(value: string) => <span className="text-muted-foreground text-xs">{value}</span>}
                />
                <Bar dataKey="inscripciones" name="Inscripciones" fill={SERIE_1} radius={[4, 4, 0, 0]} maxBarSize={24}>
                    <LabelList dataKey="inscripciones" position="top" fill="var(--foreground)" fontSize={11} formatter={etiqueta} />
                </Bar>
                <Bar dataKey="bajas" name="Bajas" fill={SERIE_2} radius={[4, 4, 0, 0]} maxBarSize={24}>
                    <LabelList dataKey="bajas" position="top" fill="var(--foreground)" fontSize={11} formatter={etiqueta} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
