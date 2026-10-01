<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A holiday or vacation in the school calendar: no grupo has class from fecha_inicio to fecha_fin,
 * in the whole school (plantel_id null) or only at one plantel.
 */
class DiaSinClase extends Model
{
    protected $table = 'dias_sin_clase';

    protected $fillable = [
        'plantel_id',
        'fecha_inicio',
        'fecha_fin',
        'motivo',
        'registrado_por',
    ];

    protected function casts(): array
    {
        return [
            'fecha_inicio' => 'date',
            'fecha_fin' => 'date',
        ];
    }

    /**
     * The days that apply to a plantel: its own plus the school-wide ones.
     */
    public function scopeAplicaA(Builder $query, int $plantelId): Builder
    {
        return $query->where(fn ($query) => $query->whereNull('plantel_id')->orWhere('plantel_id', $plantelId));
    }

    public function cubrePlantel(int $plantelId): bool
    {
        return $this->plantel_id === null || $this->plantel_id === $plantelId;
    }

    public function plantel(): BelongsTo
    {
        return $this->belongsTo(Plantel::class);
    }

    public function registradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registrado_por');
    }
}
