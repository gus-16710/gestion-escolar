<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Official documents handed to an alumno (boleta, constancia): a folio, a verification code for the QR
     * and a copy of what was printed, so a re-download or a verification shows exactly what the paper says.
     */
    public function up(): void
    {
        Schema::create('documentos_emitidos', function (Blueprint $table) {
            $table->id();
            $table->enum('tipo', ['boleta', 'constancia']);
            $table->string('folio', 20)->unique();
            $table->string('codigo', 32)->unique();
            $table->foreignId('inscripcion_id')->constrained('inscripciones')->restrictOnDelete();
            $table->json('datos');
            $table->string('firmante')->nullable();
            $table->foreignId('emitido_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('anulado_en')->nullable();
            $table->foreignId('anulado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->string('motivo_anulacion')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documentos_emitidos');
    }
};
