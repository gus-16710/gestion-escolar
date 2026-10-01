<?php

namespace App\Support\Calificaciones;

use App\Models\Calificacion;
use App\Models\CursoModulo;
use Illuminate\Support\Collection;

/**
 * An enrollment's report card: its grade in each module of the study plan, the partial average of the
 * modules graded so far and the final average, which only exists once every module has a grade.
 */
class Boleta
{
    /**
     * @param  Collection<int, CursoModulo>  $modulos  the curso's study plan, in order
     * @param  Collection<int, Calificacion>  $calificaciones  the enrollment's grades
     * @return array{modulos: array<int, array<string, mixed>>, promedio_parcial: ?float, promedio_final: ?float, calificados: int, total: int, reprobados: int, situacion: string}
     */
    public static function de(Collection $modulos, Collection $calificaciones): array
    {
        $porModulo = $calificaciones->keyBy('curso_modulo_id');

        $filas = $modulos->values()->map(function (CursoModulo $modulo) use ($porModulo) {
            /** @var Calificacion|null $calificacion */
            $calificacion = $porModulo->get($modulo->id);

            return [
                'modulo_id' => $modulo->id,
                'calificacion' => $calificacion?->calificacion,
                'recuperacion' => $calificacion?->recuperacion,
                'final' => $calificacion?->final(),
                'aprobada' => $calificacion?->aprobada(),
            ];
        });

        $finales = $filas->pluck('final')->filter(fn ($final) => $final !== null);
        $parcial = $finales->isEmpty() ? null : round($finales->avg(), 1);
        $completa = $modulos->isNotEmpty() && $finales->count() === $modulos->count();
        $reprobados = $filas->whereStrict('aprobada', false)->count();

        return [
            'modulos' => $filas->all(),
            'promedio_parcial' => $parcial,
            'promedio_final' => $completa ? $parcial : null,
            'calificados' => $finales->count(),
            'total' => $modulos->count(),
            'reprobados' => $reprobados,
            // Final verdict only with every module graded: the simple average against the passing grade.
            'situacion' => match (true) {
                $finales->isEmpty() => 'sin_calificaciones',
                ! $completa => 'en_curso',
                $parcial >= Calificacion::APROBATORIA => 'aprobado',
                default => 'reprobado',
            },
        ];
    }
}
