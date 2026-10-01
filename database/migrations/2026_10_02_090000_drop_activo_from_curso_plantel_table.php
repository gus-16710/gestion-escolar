<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The offer flag was never used: a plantel offers a curso when the row exists.
     */
    public function up(): void
    {
        Schema::table('curso_plantel', function (Blueprint $table) {
            $table->dropColumn('activo');
        });
    }

    public function down(): void
    {
        Schema::table('curso_plantel', function (Blueprint $table) {
            $table->boolean('activo')->default(true)->after('plantel_id');
        });
    }
};
