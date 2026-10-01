@extends('reportes.layout')

@php
    use Illuminate\Support\Carbon;

    $fecha = fn (?string $valor) => $valor ? Carbon::parse($valor)->translatedFormat('j M Y') : '—';
    $columnas = count($d['fechas']);
    // Wide enough to write a letter by hand; the alumno column takes the rest.
    $anchoDia = $columnas > 0 ? min(7, max(2.6, (int) floor(($d['en_blanco'] ? 62 : 46) / $columnas * 10) / 10)) : 0;
    $hayReposicion = collect($d['fechas'])->contains('reposicion', true);
    $haySinClase = collect($d['fechas'])->contains(fn ($dia) => $dia['sin_clase'] !== null);
@endphp

@section('titulo', 'Lista de asistencia')
@section('subtitulo', ucfirst($d['mes_etiqueta']).' · Grupo '.$d['grupo']['clave'])

@section('contenido')
    <table class="datos">
        <tr>
            <td class="etiqueta" style="width: 9%;">Curso</td>
            <td>{{ $d['curso']['nombre'] }}</td>
            <td class="etiqueta" style="width: 9%;">Grupo</td>
            <td class="mono">{{ $d['grupo']['clave'] }}</td>
            <td class="etiqueta" style="width: 9%;">Mes</td>
            <td style="font-weight: bold;">{{ ucfirst($d['mes_etiqueta']) }}</td>
        </tr>
        <tr>
            <td class="etiqueta">Profesor</td>
            <td>{{ $d['profesor'] ?? '—' }}</td>
            <td class="etiqueta">Horario</td>
            <td colspan="3">{{ $d['grupo']['horario'] ?: '—' }}</td>
        </tr>
    </table>

    @if ($columnas === 0)
        <div class="aviso">El grupo no tiene clases en {{ $d['mes_etiqueta'] }}.</div>
    @else
        <table class="tabla" style="margin-top: 12px;">
            <thead>
                <tr>
                    <th style="width: 3%;">#</th>
                    <th style="text-align: left;">Alumno</th>
                    @foreach ($d['fechas'] as $dia)
                        <th style="width: {{ $anchoDia }}%; padding: 3px 1px; {{ $dia['sin_clase'] ? 'background: #9ca3af; border-color: #9ca3af;' : '' }}">
                            {{ Carbon::parse($dia['fecha'])->translatedFormat('D') }}<br>
                            <span style="font-size: 10px;">{{ Carbon::parse($dia['fecha'])->day }}</span>{{ $dia['reposicion'] ? '*' : '' }}
                        </th>
                    @endforeach
                    @unless ($d['en_blanco'])
                        <th style="width: 3.5%;">P</th>
                        <th style="width: 3.5%;">R</th>
                        <th style="width: 3.5%;">F</th>
                        <th style="width: 3.5%;">J</th>
                        <th style="width: 5%;">%</th>
                    @endunless
                </tr>
            </thead>
            <tbody>
                @foreach ($d['alumnos'] as $alumno)
                    <tr class="{{ $loop->even ? 'par' : '' }}" style="{{ $alumno['baja'] ? 'color: #6b7280;' : '' }}">
                        <td class="centro">{{ $loop->iteration }}</td>
                        <td style="{{ $d['en_blanco'] ? 'padding-top: 6px; padding-bottom: 6px;' : '' }}">
                            {{ $alumno['nombre'] }}
                            @if ($alumno['baja'])
                                <span style="font-size: 7px;">(baja {{ $fecha($alumno['baja']) }})</span>
                            @endif
                        </td>
                        @foreach ($alumno['dias'] as $i => $letra)
                            @php $sinClase = $d['fechas'][$i]['sin_clase']; @endphp
                            <td class="centro" style="padding: 2px 1px; {{ $sinClase ? 'background: #e5e7eb;' : '' }} {{ $letra === 'F' ? 'color: #b91c1c; font-weight: bold;' : '' }}">
                                {{ $sinClase && $letra === '' ? '' : $letra }}
                            </td>
                        @endforeach
                        @if ($alumno['totales'])
                            <td class="centro">{{ $alumno['totales']['P'] }}</td>
                            <td class="centro">{{ $alumno['totales']['R'] }}</td>
                            <td class="centro">{{ $alumno['totales']['F'] }}</td>
                            <td class="centro">{{ $alumno['totales']['J'] }}</td>
                            <td class="centro" style="font-weight: bold;">{{ $alumno['totales']['porcentaje'] !== null ? $alumno['totales']['porcentaje'].'%' : '—' }}</td>
                        @endif
                    </tr>
                @endforeach
                @if ($d['alumnos'] === [])
                    <tr><td colspan="{{ 2 + $columnas + ($d['en_blanco'] ? 0 : 5) }}" class="centro tenue">No hay alumnos inscritos.</td></tr>
                @endif
            </tbody>
        </table>

        <p class="nota">
            P = presente · R = retardo · F = falta · J = falta justificada. El porcentaje descuenta solo las faltas.
            @if ($haySinClase)
                Las columnas en gris son días sin clase:
                {{ collect($d['fechas'])->filter(fn ($dia) => $dia['sin_clase'])->map(fn ($dia) => Carbon::parse($dia['fecha'])->translatedFormat('j M').' ('.mb_strtolower($dia['sin_clase']).')')->join(', ') }}.
            @endif
            @if ($hayReposicion)
                * Clase de reposición.
            @endif
        </p>
    @endif

    <table style="margin-top: 34px; page-break-inside: avoid;">
        <tr>
            <td style="width: 60%;"></td>
            <td class="firma">
                <div class="linea" style="width: 200px;">{{ $d['profesor'] ?? ' ' }}</div>
                <div class="cargo">Profesor(a)</div>
            </td>
        </tr>
    </table>
@endsection
