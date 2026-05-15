<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('gym_members') && ! Schema::hasColumn('gym_members', 'dni')) {
            Schema::table('gym_members', function (Blueprint $table): void {
                $table->string('dni', 8)->nullable()->unique()->after('document_number');
            });

            DB::table('gym_members')->whereNull('dni')->update([
                'dni' => DB::raw('document_number'),
            ]);
        }

        if (Schema::hasTable('gym_payments') && ! Schema::hasColumn('gym_payments', 'proof_path')) {
            Schema::table('gym_payments', function (Blueprint $table): void {
                $table->string('proof_path')->nullable()->after('method');
            });
        }

        if (Schema::hasTable('gym_expenses') && ! Schema::hasColumn('gym_expenses', 'proof_path')) {
            Schema::table('gym_expenses', function (Blueprint $table): void {
                $table->string('proof_path')->nullable()->after('payment_method');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('gym_expenses') && Schema::hasColumn('gym_expenses', 'proof_path')) {
            Schema::table('gym_expenses', function (Blueprint $table): void {
                $table->dropColumn('proof_path');
            });
        }

        if (Schema::hasTable('gym_payments') && Schema::hasColumn('gym_payments', 'proof_path')) {
            Schema::table('gym_payments', function (Blueprint $table): void {
                $table->dropColumn('proof_path');
            });
        }

        if (Schema::hasTable('gym_members') && Schema::hasColumn('gym_members', 'dni')) {
            Schema::table('gym_members', function (Blueprint $table): void {
                $table->dropUnique(['dni']);
                $table->dropColumn('dni');
            });
        }
    }
};
