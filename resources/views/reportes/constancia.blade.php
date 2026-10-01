@extends('reportes.layout')

@php
    use App\Support\Reportes\ImpresionPdf;
    use Illuminate\Support\Carbon;

    $fecha = fn (?string $valor) => $valor ? Carbon::parse($valor)->translatedFormat('j \d\e F \d\e Y') : '—';
    $emitido = Carbon::parse($documento['emitido']);
    $meses = $d['duracion_semanas'] ? (int) round($d['duracion_semanas'] / 4.345) : null;
    $duracion = $d['duracion_semanas'] ? ($meses >= 2 ? $meses.' meses' : $d['duracion_semanas'].' semanas') : null;
@endphp

@section('titulo', 'Constancia de estudios')

@section('contenido')
    <div style="margin: 40px 30px 0;">
        <p style="font-size: 11px; font-weight: bold; letter-spacing: 1px;">A QUIEN CORRESPONDA:</p>

        <p style="font-size: 11.5px; line-height: 1.9; text-align: justify; margin-top: 26px;">
            La Dirección del plantel <strong>{{ $d['plantel']['nombre'] }}</strong> de CICCIS hace constar que
            <strong style="font-size: 13px;">{{ mb_strtoupper($d['alumno']['nombre']) }}</strong>, con matrícula
            <strong class="mono">{{ $d['alumno']['matricula'] }}</strong>, concluyó satisfactoriamente el curso de
            <strong>{{ $d['curso']['nombre'] }}</strong>{{ $duracion ? ', con duración de '.$duracion : '' }}, cursado en el grupo
            <span class="mono">{{ $d['grupo']['clave'] }}</span> del {{ $fecha($d['grupo']['inicio']) }} al {{ $fecha($d['fecha_cierre'] ?? $d['grupo']['fin']) }},
            obteniendo un promedio final de <strong style="font-size: 13px;">{{ ImpresionPdf::calificacion($d['promedio_final']) }}</strong>
            en una escala de 0 a 10.
        </p>

        <p style="font-size: 11.5px; line-height: 1.9; text-align: justify; margin-top: 18px;">
            Se extiende la presente a petición de la persona interesada para los fines que le convengan, en
            {{ collect([$d['plantel']['localidad'], $d['plantel']['estado']])->filter()->join(', ') }}, el {{ $emitido->translatedFormat('j \d\e F \d\e Y') }}.
        </p>

        <p style="font-size: 11px; font-weight: bold; text-align: center; margin-top: 40px; letter-spacing: 1px;">ATENTAMENTE</p>
    </div>

    @include('reportes._firma-qr', ['margen' => 70])
@endsection
