<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The study plan of each curso: its modules in order, each with its length in weeks.
     */
    public function up(): void
    {
        Schema::create('curso_modulos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('curso_id')->constrained('cursos')->cascadeOnDelete();
            $table->unsignedSmallInteger('orden');
            $table->string('nombre');
            $table->text('descripcion')->nullable();
            $table->unsignedSmallInteger('duracion_semanas');
            $table->timestamps();

            // Names are kept distinct by validation (not an index), so two modules can swap names in one save.
            $table->unique(['curso_id', 'orden']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('curso_modulos');
    }
};
