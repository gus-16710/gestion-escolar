<?php

namespace App\Support;

use App\Models\CursoModulo;
use App\Models\DiaSinClase;
use App\Models\Grupo;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * The real class calendar of a grupo: its class days (`grupos.dias`) from fecha_inicio, minus the school
 * calendar's days without class (dias_sin_clase of its plantel or the whole school) and its own suspended
 * classes, plus the dates those were made up on.
 *
 * Time is walked in 7-day blocks from fecha_inicio. A study-plan stretch of N weeks needs N × (class days
 * per week) classes, and ends with the block in which they are reached; so with nothing lost the result is
 * exactly "N weeks from the start", and every lost class that isn't made up pushes what follows by a week.
 * Grupos without class days keep plain calendar weeks.
 */
class CalendarioGrupo
{
    /** Blocks walked at most, so a calendar where every class is lost can't loop forever. */
    private const MAX_BLOQUES = 1040;

    /** @var array<int, int> ISO weekdays the grupo meets on */
    private array $diasClase;

    /** @var array<string, array<string, mixed>> date => why there's no class that day */
    private array $sinClase = [];

    /** @var array<string, int> make-up date => classes made up that day */
    private array $reposiciones = [];

    /** @var array<string, array<int, string>> make-up date => the dates of the classes made up */
    private array $repuestas = [];

    /**
     * @param  Collection<int, DiaSinClase>|null  $diasSinClase  the school calendar, prefetched when building many grupos (it is filtered to the grupo's plantel here)
     */
    public function __construct(private Grupo $grupo, ?Collection $diasSinClase = null)
    {
        $this->diasClase = collect(explode(',', (string) $grupo->dias))
            ->map(fn (string $dia) => array_search($dia, Grupo::DIAS, true))
            ->filter(fn ($indice) => $indice !== false)
            ->map(fn (int $indice) => $indice + 1)
            ->values()
            ->all();

        $diasSinClase ??= DiaSinClase::aplicaA($grupo->plantel_id)->get();

        foreach ($diasSinClase->filter(fn (DiaSinClase $dia) => $dia->cubrePlantel($grupo->plantel_id)) as $dia) {
            for ($fecha = $dia->fecha_inicio->copy(); $fecha->lte($dia->fecha_fin); $fecha->addDay()) {
                $this->sinClase[$fecha->toDateString()] = [
                    'tipo' => 'festivo',
                    'id' => $dia->id,
                    'motivo' => $dia->motivo,
                    'alcance' => $dia->plantel_id === null ? 'escuela' : 'plantel',
                ];
            }
        }

        foreach ($grupo->clasesSuspendidas as $clase) {
            $this->sinClase[$clase->fecha->toDateString()] = [
                'tipo' => 'suspendida',
                'id' => $clase->id,
                'motivo' => $clase->etiquetaMotivo(),
                'clave_motivo' => $clase->motivo,
                'observaciones' => $clase->observaciones,
                'fecha_reposicion' => $clase->fecha_reposicion?->toDateString(),
            ];

            if ($clase->fecha_reposicion) {
                $dia = $clase->fecha_reposicion->toDateString();
                $this->reposiciones[$dia] = ($this->reposiciones[$dia] ?? 0) + 1;
                $this->repuestas[$dia][] = $clase->fecha->toDateString();
            }
        }
    }

    /**
     * The curso's modules laid over the real calendar, each finished, current or upcoming against today.
     * A concluded grupo has them all finished.
     *
     * @param  Collection<int, CursoModulo>  $modulos
     * @return array<int, array{id: int, orden: int, nombre: string, descripcion: ?string, semanas: int, inicio: string, fin: string, estado: string}>
     */
    public function modulos(Collection $modulos): array
    {
        $hoy = today();
        $tramos = $this->tramos($modulos->pluck('duracion_semanas')->all());

        return $modulos->values()->map(function (CursoModulo $modulo, int $indice) use ($tramos, $hoy) {
            [$desde, $hasta] = $tramos[$indice];

            $estado = match (true) {
                $this->grupo->estado === 'concluido', $hasta->lt($hoy) => 'terminado',
                $desde->lte($hoy) && $this->grupo->estado === 'en_curso' => 'actual',
                default => 'proximo',
            };

            return [
                'id' => $modulo->id,
                'orden' => $modulo->orden,
                'nombre' => $modulo->nombre,
                'descripcion' => $modulo->descripcion,
                'semanas' => $modulo->duracion_semanas,
                'inicio' => $desde->toDateString(),
                'fin' => $hasta->toDateString(),
                'estado' => $estado,
            ];
        })->all();
    }

    /**
     * The scheduled end: fecha_fin, or the start plus the curso's duration when none was set.
     */
    public function finProgramado(): ?CarbonInterface
    {
        return $this->grupo->fecha_fin
            ?? ($this->grupo->curso->duracion_semanas ? $this->grupo->fecha_inicio->copy()->addWeeks($this->grupo->curso->duracion_semanas) : null);
    }

    /**
     * The scheduled end pushed by the weeks lost to classes not given and not made up.
     */
    public function finAjustado(): ?CarbonInterface
    {
        return $this->finProgramado()?->copy()->addWeeks($this->semanasRecorridas());
    }

    /**
     * Weeks the grupo's end moved because of lost classes.
     */
    public function semanasRecorridas(): int
    {
        $fin = $this->finProgramado();

        if ($fin === null || $this->diasClase === []) {
            return 0;
        }

        $semanas = $this->grupo->curso->duracion_semanas ?: max(1, (int) ceil($this->grupo->fecha_inicio->diffInDays($fin) / 7));
        [, $hasta] = $this->tramos([$semanas])[0];
        $nominal = $this->grupo->fecha_inicio->copy()->startOfDay()->addWeeks($semanas)->subDay();

        return (int) round($nominal->diffInDays($hasta) / 7);
    }

    /**
     * Why the grupo has no class on a date (holiday or suspended class), or null.
     *
     * @return array<string, mixed>|null
     */
    public function sinClaseEn(CarbonInterface $fecha): ?array
    {
        return $this->sinClase[$fecha->toDateString()] ?? null;
    }

    /**
     * The dates of the classes made up on the given date (empty when it isn't a make-up date).
     *
     * @return array<int, string>
     */
    public function clasesRepuestasEn(CarbonInterface $fecha): array
    {
        return $this->repuestas[$fecha->toDateString()] ?? [];
    }

    /**
     * The most recent date up to the given one when the grupo met (today included), looking back at most
     * $dias days; null if it had no class in that span.
     */
    public function ultimaClaseHasta(CarbonInterface $hasta, int $dias = 63): ?Carbon
    {
        for ($i = 0, $fecha = Carbon::parse($hasta)->startOfDay(); $i < $dias; $i++, $fecha->subDay()) {
            if ($this->hayClase($fecha)) {
                return $fecha;
            }
        }

        return null;
    }

    /**
     * Whether the grupo meets on a date: one of its class days without a holiday or suspension, or a make-up date.
     */
    public function hayClase(CarbonInterface $fecha): bool
    {
        if (isset($this->reposiciones[$fecha->toDateString()])) {
            return true;
        }

        return in_array($fecha->dayOfWeekIso, $this->diasClase, true) && ! isset($this->sinClase[$fecha->toDateString()]);
    }

    /**
     * Whether the date is one of the grupo's regular class days (holiday or not).
     */
    public function esDiaDeClase(CarbonInterface $fecha): bool
    {
        return in_array($fecha->dayOfWeekIso, $this->diasClase, true);
    }

    /**
     * The latest regular class day up to the given date that had no class (holiday or suspension), or null.
     */
    public function ultimaSinClase(CarbonInterface $hasta): ?Carbon
    {
        $fechas = collect(array_keys($this->sinClase))
            ->map(fn (string $fecha) => Carbon::parse($fecha))
            ->filter(fn (Carbon $fecha) => $fecha->lte($hasta) && $fecha->gte($this->grupo->fecha_inicio) && $this->esDiaDeClase($fecha));

        return $fechas->sortDesc()->first();
    }

    /**
     * Holidays and suspended classes that fall on the grupo's class days within its period, oldest first.
     *
     * @return array<int, array<string, mixed>>
     */
    public function clasesSinImpartir(): array
    {
        $fin = $this->finAjustado();

        return collect($this->sinClase)
            ->map(fn (array $info, string $fecha) => ['fecha' => $fecha, ...$info])
            ->filter(function (array $fila) use ($fin) {
                $fecha = Carbon::parse($fila['fecha']);

                return $fecha->gte($this->grupo->fecha_inicio)
                    && ($fin === null || $fecha->lte($fin))
                    && ($fila['tipo'] === 'suspendida' || $this->esDiaDeClase($fecha));
            })
            ->sortKeys()
            ->values()
            ->all();
    }

    /**
     * Consecutive stretches of the given lengths in weeks, as [start, end] dates on the real calendar.
     *
     * @param  array<int, int>  $semanas
     * @return array<int, array{0: Carbon, 1: Carbon}>
     */
    private function tramos(array $semanas): array
    {
        $inicio = $this->grupo->fecha_inicio->copy()->startOfDay();
        $porSemana = count($this->diasClase);
        $tramos = [];

        if ($porSemana === 0) {
            foreach ($semanas as $duracion) {
                $hasta = $inicio->copy()->addWeeks($duracion)->subDay();
                $tramos[] = [$inicio->copy(), $hasta];
                $inicio = $hasta->copy()->addDay();
            }

            return $tramos;
        }

        $bloque = 0;
        $clases = 0;
        $necesarias = 0;
        $desde = $inicio->copy();

        foreach ($semanas as $duracion) {
            $necesarias += $duracion * $porSemana;

            while ($clases < $necesarias && $bloque < self::MAX_BLOQUES) {
                $clases += $this->clasesEnBloque($inicio->copy()->addWeeks($bloque));
                $bloque++;
            }

            $hasta = $inicio->copy()->addWeeks($bloque)->subDay();
            $tramos[] = [$desde, $hasta];
            $desde = $hasta->copy()->addDay();
        }

        return $tramos;
    }

    /**
     * Classes held in the 7 days starting on the given date.
     */
    private function clasesEnBloque(Carbon $desde): int
    {
        $clases = 0;

        for ($i = 0, $fecha = $desde->copy(); $i < 7; $i++, $fecha->addDay()) {
            $dia = $fecha->toDateString();

            if (in_array($fecha->dayOfWeekIso, $this->diasClase, true) && ! isset($this->sinClase[$dia])) {
                $clases++;
            }

            $clases += $this->reposiciones[$dia] ?? 0;
        }

        return $clases;
    }
}
