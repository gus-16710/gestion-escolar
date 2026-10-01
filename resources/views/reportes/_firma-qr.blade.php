{{-- Signature of the plantel's director and the verification QR of an issued document. --}}
<table style="margin-top: {{ $margen ?? 46 }}px; page-break-inside: avoid;">
    <tr>
        <td style="width: 22%;"></td>
        <td class="firma" style="vertical-align: bottom;">
            <div class="linea">{{ $documento['firmante'] ?? ' ' }}</div>
            <div class="cargo">Director(a) del plantel {{ $d['plantel']['nombre'] }}</div>
        </td>
        <td class="qr derecha" style="width: 22%; vertical-align: bottom;">
            <img src="{{ $documento['qr'] }}" alt="QR de verificación">
            <div class="texto">Verifica este documento<br>escaneando el código</div>
        </td>
    </tr>
</table>
<p class="nota" style="text-align: right; margin-top: 2px;">{{ $documento['url'] }}</p>
