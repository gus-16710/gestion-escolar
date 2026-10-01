<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Closing a grupo: each active enrollment ends as egresado (final average ≥ 6) or no_acreditado,
     * with its final average frozen, and the grupo records when and by whom it was concluded.
     */
    public function up(): void
    {
        Schema::table('inscripciones', function (Blueprint $table) {
            $table->enum('estado', ['activo', 'baja', 'egresado', 'no_acreditado'])->default('activo')->change();
            $table->decimal('promedio_final', 3, 1)->nullable()->after('motivo_baja');
            $table->date('fecha_cierre')->nullable()->after('promedio_final');
        });

        Schema::table('grupos', function (Blueprint $table) {
            $table->timestamp('concluido_en')->nullable()->after('estado');
            $table->foreignId('concluido_por')->nullable()->after('concluido_en')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('grupos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('concluido_por');
            $table->dropColumn('concluido_en');
        });

        Schema::table('inscripciones', function (Blueprint $table) {
            $table->dropColumn(['promedio_final', 'fecha_cierre']);
            $table->enum('estado', ['activo', 'baja', 'egresado'])->default('activo')->change();
        });
    }
};
