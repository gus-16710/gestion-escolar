<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Classes of one grupo that were not given. With a fecha_reposicion the class was made up on that date;
     * without one it was lost and the grupo's study plan shifts (see App\Support\CalendarioGrupo).
     */
    public function up(): void
    {
        Schema::create('clases_suspendidas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grupo_id')->constrained('grupos')->cascadeOnDelete();
            $table->date('fecha');
            $table->enum('motivo', ['profesor', 'salud', 'evento', 'otro']);
            $table->string('observaciones')->nullable();
            $table->date('fecha_reposicion')->nullable();
            $table->foreignId('registrado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['grupo_id', 'fecha']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clases_suspendidas');
    }
};
