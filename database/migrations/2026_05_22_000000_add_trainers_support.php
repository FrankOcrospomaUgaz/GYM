<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users') && ! Schema::hasColumn('users', 'is_trainer')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->boolean('is_trainer')->default(false)->after('is_active');
            });
        }

        if (Schema::hasTable('users') && Schema::hasColumn('users', 'is_trainer')) {
            $trainerRoleId = DB::table('roles')->where('slug', 'entrenador')->value('id');
            if ($trainerRoleId) {
                DB::table('users')->where('role_id', $trainerRoleId)->update(['is_trainer' => true]);
            }
        }

        if (Schema::hasTable('gym_tenant_modules') && Schema::hasTable('gym_tenants')) {
            $tenantIds = DB::table('gym_tenants')->pluck('id');
            foreach ($tenantIds as $tenantId) {
                DB::table('gym_tenant_modules')->updateOrInsert(
                    ['tenant_id' => $tenantId, 'module' => 'trainers'],
                    [
                        'label' => 'Profesores',
                        'is_enabled' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
                );
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'is_trainer')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropColumn('is_trainer');
            });
        }

        if (Schema::hasTable('gym_tenant_modules')) {
            DB::table('gym_tenant_modules')->where('module', 'trainers')->delete();
        }
    }
};
