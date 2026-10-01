<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Asistencia extends Model
{
    protected $fillable = [
        'inscripcion_id',
        'fecha',
        'estado',
        'observaciones',
        'registrado_por',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date',
        ];
    }

    /**
     * Attendance percentage: records minus absences over records. Late arrivals and justified
     * absences don't count against it. Null when there are no records yet.
     */
    public static function porcentaje(int $total, int $faltas): ?int
    {
        return $total > 0 ? (int) round(100 * ($total - $faltas) / $total) : null;
    }

    public function inscripcion(): BelongsTo
    {
        return $this->belongsTo(Inscripcion::class);
    }

    public function registradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registrado_por');
    }
}
