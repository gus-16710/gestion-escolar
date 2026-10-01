@extends('reportes.layout')

@php
    use App\Support\Reportes\ImpresionPdf;
    use Illuminate\Support\Carbon;

    $fecha = fn (?string $valor) => $valor ? Carbon::parse($valor)->translatedFormat('j M Y') : '—';
    $situaciones = ['aprobado' => 'Aprobado', 'reprobado' => 'No aprobado', 'en_curso' => 'En curso', 'sin_calificaciones' => 'Sin calificaciones'];
@endphp

@section('titulo', 'Boleta de calificaciones')
@section('subtitulo', $d['parcial'] ? 'Parcial · '.$d['calificados'].' de '.$d['total_modulos'].' módulos calificados' : 'Final')

@section('contenido')
    <table class="datos">
        <tr>
            <td class="etiqueta">Alumno</td>
            <td style="font-weight: bold; font-size: 11px;">{{ $d['alumno']['nombre'] }}</td>
            <td class="etiqueta">Matrícula</td>
            <td class="mono">{{ $d['alumno']['matricula'] }}</td>
        </tr>
        <tr>
            <td class="etiqueta">Curso</td>
            <td>{{ $d['curso']['nombre'] }}</td>
            <td class="etiqueta">Grupo</td>
            <td class="mono">{{ $d['grupo']['clave'] }}</td>
        </tr>
        <tr>
            <td class="etiqueta">Horario</td>
            <td>{{ $d['grupo']['horario'] ?: '—' }}</td>
            <td class="etiqueta">Periodo</td>
            <td>{{ $fecha($d['grupo']['inicio']) }} – {{ $fecha($d['fecha_cierre'] ?? $d['grupo']['fin']) }}</td>
        </tr>
        <tr>
            <td class="etiqueta">Profesor</td>
            <td>{{ $d['profesor'] ?? '—' }}</td>
            <td class="etiqueta">Situación</td>
            <td style="font-weight: bold;">{{ $d['estado_etiqueta'] }}</td>
        </tr>
    </table>

    <h2>Calificaciones por módulo</h2>
    <table class="tabla">
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th style="text-align: left;">Módulo</th>
                <th style="width: 11%;">Fecha</th>
                <th style="width: 11%;">Calificación</th>
                <th style="width: 11%;">Recuperación</th>
                <th style="width: 9%;">Final</th>
                <th style="width: 12%;">Resultado</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($d['modulos'] as $modulo)
                <tr class="{{ $loop->even ? 'par' : '' }}">
                    <td class="centro">{{ $modulo['orden'] }}</td>
                    <td>{{ $modulo['nombre'] }}</td>
                    <td class="centro">{{ $modulo['fecha'] ? $fecha($modulo['fecha']) : '—' }}</td>
                    <td class="centro">{{ ImpresionPdf::calificacion($modulo['calificacion']) }}</td>
                    <td class="centro">{{ $modulo['recuperacion'] !== null ? ImpresionPdf::calificacion($modulo['recuperacion']) : '' }}</td>
                    <td class="centro {{ $modulo['aprobada'] === false ? 'reprobada' : '' }}" style="font-weight: bold;">{{ ImpresionPdf::calificacion($modulo['final']) }}</td>
                    <td class="centro {{ $modulo['final'] === null ? 'tenue' : ($modulo['aprobada'] ? 'aprobada' : 'reprobada') }}">
                        {{ $modulo['final'] === null ? 'Pendiente' : ($modulo['aprobada'] ? 'Aprobado' : 'No aprobado') }}
                    </td>
                </tr>
            @endforeach
            @if ($d['modulos'] === [])
                <tr><td colspan="7" class="centro tenue">El curso no tiene plan de estudios.</td></tr>
            @endif
        </tbody>
        <tfoot>
            <tr>
                <td colspan="5" class="derecha" style="font-weight: bold; background: #f3f6fa;">
                    {{ $d['promedio_final'] !== null ? 'Promedio final' : 'Promedio parcial ('.$d['calificados'].' de '.$d['total_modulos'].' módulos)' }}
                </td>
                <td class="centro {{ ($d['promedio_final'] ?? $d['promedio_parcial']) !== null && ($d['promedio_final'] ?? $d['promedio_parcial']) < 6 ? 'reprobada' : '' }}" style="font-weight: bold; font-size: 12px; background: #f3f6fa;">
                    {{ ImpresionPdf::calificacion($d['promedio_final'] ?? $d['promedio_parcial']) }}
                </td>
                <td class="centro" style="background: #f3f6fa; font-weight: bold;">{{ $situaciones[$d['situacion']] ?? '' }}</td>
            </tr>
        </tfoot>
    </table>
    <p class="nota">Escala de 0 a 10; calificación mínima aprobatoria: 6.0. Una recuperación sustituye a la calificación original del módulo. El curso se acredita con promedio final de 6.0 o más.</p>

    @if ($d['parcial'])
        <div class="aviso">Boleta parcial: el curso sigue en curso. El promedio final se obtiene cuando todos los módulos están calificados.</div>
    @endif

    <h2>Asistencia</h2>
    <table class="tabla" style="width: 70%;">
        <thead>
            <tr>
                <th>Clases registradas</th>
                <th>Asistencias</th>
                <th>Retardos</th>
                <th>Faltas</th>
                <th>Justificadas</th>
                <th>% de asistencia</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="centro">{{ $d['asistencia']['registros'] }}</td>
                <td class="centro">{{ $d['asistencia']['presentes'] }}</td>
                <td class="centro">{{ $d['asistencia']['retardos'] }}</td>
                <td class="centro">{{ $d['asistencia']['faltas'] }}</td>
                <td class="centro">{{ $d['asistencia']['justificadas'] }}</td>
                <td class="centro" style="font-weight: bold;">{{ $d['asistencia']['porcentaje'] !== null ? $d['asistencia']['porcentaje'].'%' : '—' }}</td>
            </tr>
        </tbody>
    </table>

    @include('reportes._firma-qr')
@endsection
