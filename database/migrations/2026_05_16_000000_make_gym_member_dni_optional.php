<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('gym_members')) {
            Schema::table('gym_members', function (Blueprint $table): void {
                $table->dropUnique(['dni']);
                $table->dropUnique(['document_number']);
            });

            DB::table('gym_members')->whereNull('dni')->update(['dni' => '0']);
            DB::table('gym_members')->whereNull('document_number')->update(['document_number' => '0']);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('gym_members')) {
            Schema::table('gym_members', function (Blueprint $table): void {
                $table->unique('dni');
                $table->unique('document_number');
            });
        }
    }
};
