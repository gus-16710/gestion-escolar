<?php

namespace App\Support\Reportes;

use App\Models\DocumentoEmitido;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DocumentoPdf;
use chillerlan\QRCode\Output\QRGdImagePNG;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

/**
 * Renders the reports' Blade views (resources/views/reportes) as PDF, opened inline in the browser.
 */
class ImpresionPdf
{
    /**
     * @param  array<string, mixed>  $datos
     */
    public static function vista(string $vista, array $datos, string $archivo, string $orientacion = 'portrait'): Response
    {
        $pdf = Pdf::loadView('reportes.'.$vista, $datos)->setPaper('letter', $orientacion);
        self::numerarPaginas($pdf);

        return $pdf->stream(Str::slug($archivo).'.pdf');
    }

    /**
     * "Página N de M" at the footer's right edge. CSS counter(pages) isn't supported by dompdf, so it is
     * drawn on the canvas once every page exists.
     */
    public static function numerarPaginas(DocumentoPdf $pdf): void
    {
        $pdf->render();
        $dompdf = $pdf->getDomPDF();
        $canvas = $dompdf->getCanvas();
        $fuente = $dompdf->getFontMetrics()->getFont('DejaVu Sans');
        $texto = 'Página {PAGE_NUM} de {PAGE_COUNT}';
        $ancho = $dompdf->getFontMetrics()->getTextWidth('Página 0 de 0', $fuente, 5.6);

        // 36px side margin and 24px from the bottom edge, in points (0.75pt per px).
        $canvas->page_text($canvas->get_width() - 27 - $ancho, $canvas->get_height() - 30.5, $texto, $fuente, 5.6, [0.42, 0.45, 0.5]);
    }

    /**
     * An issued boleta or constancia, rendered from the copy it keeps.
     */
    public static function documento(DocumentoEmitido $documento): Response
    {
        return self::vista($documento->tipo, [
            'd' => $documento->datos,
            'documento' => [
                'folio' => $documento->folio,
                'tipo' => DocumentoEmitido::TIPOS[$documento->tipo],
                'firmante' => $documento->firmante,
                'emitido' => $documento->created_at,
                'emitido_por' => $documento->datos['emitido_por'] ?? null,
                'anulado' => ! $documento->vigente(),
                'url' => $documento->urlVerificacion(),
                'qr' => self::qr($documento->urlVerificacion()),
            ],
        ], $documento->folio);
    }

    /**
     * A QR code of the given URL as a PNG data URI, for an <img> in the PDF.
     */
    public static function qr(string $url): string
    {
        $opciones = new QROptions([
            'outputInterface' => QRGdImagePNG::class,
            'scale' => 6,
            'quietzoneSize' => 1,
            'outputBase64' => true,
        ]);

        return (new QRCode($opciones))->render($url);
    }

    /**
     * Grade formatting shared by the views: one decimal, or a dash when there is none.
     */
    public static function calificacion(int|float|null $valor): string
    {
        return $valor === null ? '—' : number_format((float) $valor, 1);
    }
}
