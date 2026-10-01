<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * An official document handed to an alumno (boleta or constancia). `datos` keeps a copy of what was
 * printed: re-downloading and verifying use it, so they match the paper even if grades change later.
 */
class DocumentoEmitido extends Model
{
    protected $table = 'documentos_emitidos';

    /** Folio prefix of each type: BOL-2026-0001, CON-2026-0001. */
    public const PREFIJOS = ['boleta' => 'BOL', 'constancia' => 'CON'];

    public const TIPOS = ['boleta' => 'Boleta de calificaciones', 'constancia' => 'Constancia de estudios'];

    protected $fillable = [
        'tipo',
        'folio',
        'codigo',
        'inscripcion_id',
        'datos',
        'firmante',
        'emitido_por',
        'anulado_en',
        'anulado_por',
        'motivo_anulacion',
    ];

    protected function casts(): array
    {
        return [
            'datos' => 'array',
            'anulado_en' => 'datetime',
        ];
    }

    /**
     * The next folio of a type in a year: consecutive per type and year, voided ones included. Call it inside
     * a transaction; the unique index on `folio` guards against two issues at once.
     */
    public static function siguienteFolio(string $tipo, int $year): string
    {
        $prefijo = self::PREFIJOS[$tipo].'-'.$year.'-';

        $ultimo = static::where('folio', 'like', $prefijo.'%')
            ->lockForUpdate()
            ->pluck('folio')
            ->map(fn (string $folio) => (int) Str::after($folio, $prefijo))
            ->max() ?? 0;

        return $prefijo.str_pad((string) ($ultimo + 1), 4, '0', STR_PAD_LEFT);
    }

    /**
     * A random verification code for the QR.
     */
    public static function nuevoCodigo(): string
    {
        do {
            $codigo = Str::lower(Str::random(16));
        } while (static::where('codigo', $codigo)->exists());

        return $codigo;
    }

    public function vigente(): bool
    {
        return $this->anulado_en === null;
    }

    public function urlVerificacion(): string
    {
        return route('verificacion.show', $this->codigo);
    }

    public function inscripcion(): BelongsTo
    {
        return $this->belongsTo(Inscripcion::class);
    }

    public function emitidoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'emitido_por');
    }

    public function anuladoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'anulado_por');
    }
}
