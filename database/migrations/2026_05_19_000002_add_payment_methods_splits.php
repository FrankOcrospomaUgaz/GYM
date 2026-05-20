<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('gym_payments') && ! Schema::hasColumn('gym_payments', 'payment_methods')) {
            Schema::table('gym_payments', function (Blueprint $table): void {
                $table->json('payment_methods')->nullable()->after('method');
            });
        }

        if (Schema::hasTable('gym_expenses') && ! Schema::hasColumn('gym_expenses', 'payment_methods')) {
            Schema::table('gym_expenses', function (Blueprint $table): void {
                $table->json('payment_methods')->nullable()->after('payment_method');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('gym_payments') && Schema::hasColumn('gym_payments', 'payment_methods')) {
            Schema::table('gym_payments', function (Blueprint $table): void {
                $table->dropColumn('payment_methods');
            });
        }

        if (Schema::hasTable('gym_expenses') && Schema::hasColumn('gym_expenses', 'payment_methods')) {
            Schema::table('gym_expenses', function (Blueprint $table): void {
                $table->dropColumn('payment_methods');
            });
        }
    }
};
