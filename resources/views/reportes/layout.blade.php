{{-- Base of every printed report (dompdf): plantel header, footer with who issued it and page numbers. --}}
@php
    use Illuminate\Support\Carbon;

    $emitidoEn = Carbon::parse($emision['fecha'] ?? ($documento['emitido'] ?? now()));
    $emitidoPor = $emision['por'] ?? ($documento['emitido_por'] ?? null);
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>@yield('titulo')</title>
    <style>
        @page { margin: 118px 36px 58px 36px; }
        * { box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 9.5px; color: #1f2937; line-height: 1.35; }
        header { position: fixed; top: -100px; left: 0; right: 0; height: 88px; border-bottom: 2px solid #256db1; }
        footer { position: fixed; bottom: -38px; left: 0; right: 0; height: 24px; border-top: 1px solid #d1d5db; padding-top: 5px; font-size: 7.5px; color: #6b7280; }
        table { border-collapse: collapse; width: 100%; }
        .encabezado td { vertical-align: middle; }
        .plantel { font-size: 14px; font-weight: bold; color: #256db1; }
        .direccion { font-size: 7.5px; color: #4b5563; margin-top: 2px; }
        .titulo-doc { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #111827; text-align: right; }
        .folio { display: inline-block; margin-top: 4px; border: 1px solid #256db1; color: #256db1; padding: 3px 8px; font-weight: bold; font-size: 10px; }
        .subtitulo-doc { font-size: 8px; color: #4b5563; text-align: right; margin-top: 3px; }
        h2 { font-size: 10.5px; color: #256db1; margin: 14px 0 5px; text-transform: uppercase; letter-spacing: .5px; }
        .datos td { padding: 3px 6px; border: 1px solid #e5e7eb; }
        .datos .etiqueta { width: 16%; background: #f3f6fa; color: #4b5563; font-size: 8px; text-transform: uppercase; }
        .tabla th { background: #256db1; color: #fff; font-size: 8px; text-transform: uppercase; padding: 4px 5px; border: 1px solid #256db1; }
        .tabla td { padding: 3.5px 5px; border: 1px solid #d1d5db; }
        .tabla tr.par td { background: #f8fafc; }
        .centro { text-align: center; }
        .derecha { text-align: right; }
        .mono { font-family: 'DejaVu Sans Mono', monospace; }
        .tenue { color: #6b7280; }
        .reprobada { color: #b91c1c; font-weight: bold; }
        .aprobada { color: #166534; }
        .nota { font-size: 7.5px; color: #4b5563; margin-top: 6px; }
        .aviso { border: 1px solid #f59e0b; background: #fffbeb; color: #92400e; padding: 5px 8px; margin-top: 8px; }
        .marca-agua { position: fixed; top: 38%; left: 0; right: 0; text-align: center; font-size: 90px; font-weight: bold; color: #dc2626; opacity: .13; transform: rotate(-30deg); }
        .firma { text-align: center; }
        .firma .linea { border-top: 1px solid #111827; margin: 0 auto; width: 230px; padding-top: 4px; font-weight: bold; }
        .firma .cargo { font-size: 8px; color: #4b5563; }
        .qr img { width: 82px; height: 82px; }
        .qr .texto { font-size: 7px; color: #4b5563; }
    </style>
</head>
<body>
    <header>
        <table class="encabezado">
            <tr>
                <td style="width: 70px;">
                    <img src="{{ public_path('images/logo-ciccis-impresion.png') }}" style="height: 70px;" alt="CICCIS">
                </td>
                <td style="padding-left: 10px;">
                    <div class="plantel">{{ $d['plantel']['nombre'] }}</div>
                    <div class="direccion">{{ $d['plantel']['direccion'] }}</div>
                    @if ($d['plantel']['telefono'] || $d['plantel']['email'])
                        <div class="direccion">{{ collect([$d['plantel']['telefono'] ? 'Tel. '.$d['plantel']['telefono'] : null, $d['plantel']['email']])->filter()->join(' · ') }}</div>
                    @endif
                </td>
                <td style="width: 34%;">
                    <div class="titulo-doc">@yield('titulo')</div>
                    @isset($documento)
                        <div class="derecha"><span class="folio">Folio {{ $documento['folio'] }}</span></div>
                    @endisset
                    <div class="subtitulo-doc">@yield('subtitulo')</div>
                </td>
            </tr>
        </table>
    </header>

    <footer>
        <table>
            <tr>
                <td>Emitido el {{ $emitidoEn->translatedFormat('j \d\e F \d\e Y, H:i') }}{{ $emitidoPor ? ' por '.$emitidoPor : '' }}</td>
            </tr>
        </table>
    </footer>

    @if (! empty($documento['anulado']))
        <div class="marca-agua">ANULADO</div>
    @endif

    <main>
        @yield('contenido')
    </main>
</body>
</html>
