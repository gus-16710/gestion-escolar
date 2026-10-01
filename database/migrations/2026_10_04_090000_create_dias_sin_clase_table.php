<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The school calendar: holidays and vacations with no classes, for the whole school (plantel_id null) or one plantel.
     */
    public function up(): void
    {
        Schema::create('dias_sin_clase', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plantel_id')->nullable()->constrained('planteles')->cascadeOnDelete();
            $table->date('fecha_inicio');
            $table->date('fecha_fin');
            $table->string('motivo');
            $table->foreignId('registrado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['fecha_inicio', 'fecha_fin']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dias_sin_clase');
    }
};
