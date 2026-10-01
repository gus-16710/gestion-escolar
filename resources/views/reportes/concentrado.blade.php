@extends('reportes.layout')

@php
    use App\Support\Reportes\ImpresionPdf;
    use Illuminate\Support\Carbon;

    $fecha = fn (?string $valor) => $valor ? Carbon::parse($valor)->translatedFormat('j M Y') : '—';
    $hayRecuperaciones = collect($d['alumnos'])->merge($d['bajas'])->flatMap(fn ($alumno) => $alumno['calificaciones'])->contains('recuperacion', true);
    $celda = function (array $calificacion) {
        $texto = ImpresionPdf::calificacion($calificacion['final']);

        return $calificacion['recuperacion'] ? $texto.'*' : $texto;
    };
@endphp

@section('titulo', 'Concentrado de calificaciones')
@section('subtitulo', $d['curso']['nombre'].' · Grupo '.$d['grupo']['clave'])

@section('contenido')
    <table class="datos">
        <tr>
            <td class="etiqueta" style="width: 9%;">Curso</td>
            <td>{{ $d['curso']['nombre'] }}</td>
            <td class="etiqueta" style="width: 9%;">Grupo</td>
            <td class="mono">{{ $d['grupo']['clave'] }}</td>
            <td class="etiqueta" style="width: 9%;">Profesor</td>
            <td>{{ $d['profesor'] ?? '—' }}</td>
        </tr>
        <tr>
            <td class="etiqueta">Horario</td>
            <td>{{ $d['grupo']['horario'] ?: '—' }}</td>
            <td class="etiqueta">Periodo</td>
            <td>{{ $fecha($d['grupo']['inicio']) }} – {{ $fecha($d['grupo']['fin']) }}</td>
            <td class="etiqueta">Promedio</td>
            <td style="font-weight: bold;">{{ ImpresionPdf::calificacion($d['promedio_grupo']) }}{{ $d['promedio_grupo'] !== null && $d['promedio_grupo_parcial'] ? '†' : '' }} <span class="tenue" style="font-weight: normal;">({{ count($d['alumnos']) }} alumnos)</span></td>
        </tr>
    </table>

    <table class="tabla" style="margin-top: 12px;">
        <thead>
            <tr>
                <th style="width: 3%;">#</th>
                <th style="width: 8%;">Matrícula</th>
                <th style="text-align: left;">Alumno</th>
                @foreach ($d['modulos'] as $modulo)
                    <th style="width: {{ max(3, (int) floor(44 / max(1, count($d['modulos'])))) }}%;">M{{ $modulo['orden'] }}</th>
                @endforeach
                <th style="width: 6%;">Prom.</th>
                <th style="width: 6%;">Asist.</th>
                <th style="width: 10%;">Situación</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($d['alumnos'] as $alumno)
                <tr class="{{ $loop->even ? 'par' : '' }}">
                    <td class="centro">{{ $loop->iteration }}</td>
                    <td class="mono centro" style="font-size: 8px;">{{ $alumno['matricula'] }}</td>
                    <td>{{ $alumno['nombre'] }}</td>
                    @foreach ($alumno['calificaciones'] as $calificacion)
                        <td class="centro {{ $calificacion['final'] !== null && $calificacion['final'] < 6 ? 'reprobada' : '' }}">{{ $celda($calificacion) }}</td>
                    @endforeach
                    <td class="centro {{ $alumno['promedio'] !== null && $alumno['promedio'] < 6 ? 'reprobada' : '' }}" style="font-weight: bold;">
                        {{ ImpresionPdf::calificacion($alumno['promedio']) }}{{ $alumno['promedio'] !== null && ! $alumno['promedio_completo'] ? '†' : '' }}
                    </td>
                    <td class="centro">{{ $alumno['asistencia'] !== null ? $alumno['asistencia'].'%' : '—' }}</td>
                    <td class="centro">{{ $alumno['estado_etiqueta'] }}</td>
                </tr>
            @endforeach
            @if ($d['alumnos'] === [])
                <tr><td colspan="{{ 6 + count($d['modulos']) }}" class="centro tenue">No hay alumnos inscritos.</td></tr>
            @endif
        </tbody>
    </table>

    @if ($d['bajas'] !== [])
        <h2>Bajas</h2>
        <table class="tabla">
            <tbody>
                @foreach ($d['bajas'] as $alumno)
                    <tr style="color: #6b7280;">
                        <td class="centro" style="width: 3%;">{{ $loop->iteration }}</td>
                        <td class="mono centro" style="width: 8%; font-size: 8px;">{{ $alumno['matricula'] }}</td>
                        <td>{{ $alumno['nombre'] }}</td>
                        @foreach ($alumno['calificaciones'] as $calificacion)
                            <td class="centro" style="width: {{ max(3, (int) floor(44 / max(1, count($d['modulos'])))) }}%;">{{ $celda($calificacion) }}</td>
                        @endforeach
                        <td class="centro" style="width: 6%;">{{ ImpresionPdf::calificacion($alumno['promedio']) }}</td>
                        <td class="centro" style="width: 6%;">{{ $alumno['asistencia'] !== null ? $alumno['asistencia'].'%' : '—' }}</td>
                        <td class="centro" style="width: 10%;">Baja</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <table style="margin-top: 10px; page-break-inside: avoid;">
        <tr>
            <td style="width: 62%; vertical-align: top;">
                <h2 style="margin-top: 0;">Módulos</h2>
                <table style="font-size: 8px;">
                    <tr>
                    @foreach (collect($d['modulos'])->chunk((int) ceil(max(1, count($d['modulos'])) / 2)) as $columna)
                        <td style="vertical-align: top; width: 50%;">
                            @foreach ($columna as $modulo)
                                <div><strong>M{{ $modulo['orden'] }}</strong> {{ $modulo['nombre'] }}</div>
                            @endforeach
                        </td>
                    @endforeach
                    </tr>
                </table>
                <p class="nota">
                    Escala de 0 a 10; mínima aprobatoria 6.0.
                    @if ($hayRecuperaciones) * Calificación obtenida en recuperación. @endif
                    † Promedio parcial: faltan módulos por calificar.
                </p>
            </td>
            <td style="vertical-align: bottom;">
                <table>
                    <tr>
                        <td class="firma" style="padding: 0 8px;">
                            <div class="linea" style="width: 150px;">{{ $d['profesor'] ?? ' ' }}</div>
                            <div class="cargo">Profesor(a)</div>
                        </td>
                        <td class="firma" style="padding: 0 8px;">
                            <div class="linea" style="width: 150px;">&nbsp;</div>
                            <div class="cargo">Dirección del plantel</div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
@endsection
