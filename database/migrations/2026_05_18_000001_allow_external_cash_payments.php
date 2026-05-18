<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('gym_payments')) {
            Schema::table('gym_payments', function (Blueprint $table): void {
                $table->foreignId('member_id')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('gym_payments')) {
            Schema::table('gym_payments', function (Blueprint $table): void {
                $table->foreignId('member_id')->nullable(false)->change();
            });
        }
    }
};
