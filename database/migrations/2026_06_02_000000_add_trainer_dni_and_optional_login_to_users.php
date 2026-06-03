<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'dni')) {
                $table->string('dni', 8)->nullable()->after('name');
            }
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE users MODIFY email VARCHAR(255) NULL');
            DB::statement('ALTER TABLE users MODIFY password VARCHAR(255) NULL');
        } elseif ($driver === 'sqlite') {
            // SQLite no admite MODIFY; en desarrollo local el esquema puede recrearse.
        }

        Schema::table('users', function (Blueprint $table): void {
            if (Schema::hasColumn('users', 'dni') && Schema::hasColumn('users', 'tenant_id')) {
                $table->unique(['tenant_id', 'dni'], 'users_tenant_dni_unique');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        Schema::table('users', function (Blueprint $table): void {
            if (Schema::hasColumn('users', 'dni')) {
                $table->dropUnique('users_tenant_dni_unique');
                $table->dropColumn('dni');
            }
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE users MODIFY email VARCHAR(255) NOT NULL');
            DB::statement('ALTER TABLE users MODIFY password VARCHAR(255) NOT NULL');
        }
    }
};
