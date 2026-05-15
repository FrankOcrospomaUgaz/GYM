<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('gym_tenants')) {
            Schema::create('gym_tenants', function (Blueprint $table): void {
                $table->id();
                $table->string('name');
                $table->string('slug')->unique();
                $table->string('contact_name')->nullable();
                $table->string('contact_email')->nullable();
                $table->string('contact_phone')->nullable();
                $table->string('plan_name')->default('Profesional');
                $table->string('billing_status')->default('active');
                $table->string('primary_color', 20)->default('#ffcc00');
                $table->text('notes')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('gym_tenant_modules')) {
            Schema::create('gym_tenant_modules', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('tenant_id')->constrained('gym_tenants')->cascadeOnDelete();
                $table->string('module');
                $table->string('label');
                $table->boolean('is_enabled')->default(true);
                $table->timestamps();
                $table->unique(['tenant_id', 'module']);
            });
        }

        if (! Schema::hasTable('gym_branch_user')) {
            Schema::create('gym_branch_user', function (Blueprint $table): void {
                $table->foreignId('branch_id')->constrained('gym_branches')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->primary(['branch_id', 'user_id']);
            });
        }

        $this->addForeign('users', 'tenant_id', 'gym_tenants');
        $this->addForeign('users', 'branch_id', 'gym_branches');
        $this->addForeign('gym_branches', 'tenant_id', 'gym_tenants');

        foreach ([
            'gym_plans',
            'gym_members',
            'gym_memberships',
            'gym_payments',
            'gym_attendances',
            'gym_classes',
            'gym_class_bookings',
            'gym_equipment',
            'gym_expenses',
            'gym_notifications',
            'gym_fitness_goals',
            'gym_training_subscriptions',
        ] as $table) {
            $this->addForeign($table, 'tenant_id', 'gym_tenants');
        }
    }

    public function down(): void
    {
        foreach ([
            'gym_training_subscriptions',
            'gym_fitness_goals',
            'gym_notifications',
            'gym_expenses',
            'gym_equipment',
            'gym_class_bookings',
            'gym_classes',
            'gym_attendances',
            'gym_payments',
            'gym_memberships',
            'gym_members',
            'gym_plans',
            'gym_branches',
            'users',
        ] as $table) {
            $this->dropForeign($table, 'tenant_id');
        }

        $this->dropForeign('users', 'branch_id');
        Schema::dropIfExists('gym_branch_user');
        Schema::dropIfExists('gym_tenant_modules');
        Schema::dropIfExists('gym_tenants');
    }

    private function addForeign(string $table, string $column, string $target): void
    {
        if (! Schema::hasTable($table) || Schema::hasColumn($table, $column)) {
            return;
        }

        Schema::table($table, function (Blueprint $tableBlueprint) use ($column, $target): void {
            $tableBlueprint->foreignId($column)->nullable()->after('id')->constrained($target)->nullOnDelete();
        });
    }

    private function dropForeign(string $table, string $column): void
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
            return;
        }

        Schema::table($table, function (Blueprint $tableBlueprint) use ($column): void {
            $tableBlueprint->dropConstrainedForeignId($column);
        });
    }
};
