<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One grade per enrollment and module of the curso's study plan (0–10, one decimal). A retake lives in
     * the same row: when present it is the grade that counts, and the original is kept as history.
     */
    public function up(): void
    {
        Schema::create('calificaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inscripcion_id')->constrained('inscripciones')->cascadeOnDelete();
            // Restrict: a module with grades can't be removed from the study plan.
            $table->foreignId('curso_modulo_id')->constrained('curso_modulos')->restrictOnDelete();
            $table->decimal('calificacion', 3, 1);
            $table->date('fecha_evaluacion');
            $table->decimal('recuperacion', 3, 1)->nullable();
            $table->date('fecha_recuperacion')->nullable();
            $table->string('observaciones')->nullable();
            $table->foreignId('registrado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['inscripcion_id', 'curso_modulo_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calificaciones');
    }
};
