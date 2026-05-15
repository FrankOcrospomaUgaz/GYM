<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('roles')) {
            Schema::create('roles', function (Blueprint $table): void {
                $table->id();
                $table->string('name');
                $table->string('slug')->unique();
                $table->text('description')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('permissions')) {
            Schema::create('permissions', function (Blueprint $table): void {
                $table->id();
                $table->string('module');
                $table->string('action');
                $table->string('label');
                $table->timestamps();
                $table->unique(['module', 'action']);
            });
        }

        if (! Schema::hasTable('permission_role')) {
            Schema::create('permission_role', function (Blueprint $table): void {
                $table->foreignId('role_id')->constrained()->cascadeOnDelete();
                $table->foreignId('permission_id')->constrained()->cascadeOnDelete();
                $table->primary(['role_id', 'permission_id']);
            });
        }

        if (! Schema::hasTable('cargos')) {
            Schema::create('cargos', function (Blueprint $table): void {
                $table->id();
                $table->string('name')->unique();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('areas')) {
            Schema::create('areas', function (Blueprint $table): void {
                $table->id();
                $table->string('name');
                $table->string('slug')->unique();
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $table): void {
                $table->id();
                $table->string('name');
                $table->string('email')->unique();
                $table->timestamp('email_verified_at')->nullable();
                $table->string('password');
                $table->boolean('is_superadmin')->default(false);
                $table->foreignId('role_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('cargo_id')->nullable()->constrained('cargos')->nullOnDelete();
                $table->string('phone')->nullable();
                $table->boolean('is_active')->default(true);
                $table->string('contract_type')->nullable();
                $table->decimal('salary', 12, 2)->nullable();
                $table->decimal('cost_per_hour', 12, 2)->nullable();
                $table->string('availability')->nullable();
                $table->string('specialty')->nullable();
                $table->rememberToken();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('area_user')) {
            Schema::create('area_user', function (Blueprint $table): void {
                $table->foreignId('area_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->primary(['area_id', 'user_id']);
            });
        }

        if (! Schema::hasTable('password_reset_tokens')) {
            Schema::create('password_reset_tokens', function (Blueprint $table): void {
                $table->string('email')->primary();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        }

        if (! Schema::hasTable('sessions')) {
            Schema::create('sessions', function (Blueprint $table): void {
                $table->string('id')->primary();
                $table->foreignId('user_id')->nullable()->index();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->longText('payload');
                $table->integer('last_activity')->index();
            });
        }

        if (! Schema::hasTable('gym_branches')) {
            Schema::create('gym_branches', function (Blueprint $table): void {
                $table->id();
                $table->string('name');
                $table->string('phone')->nullable();
                $table->string('email')->nullable();
                $table->string('address');
                $table->string('city')->default('Lima');
                $table->string('opening_hours')->nullable();
                $table->unsignedInteger('capacity')->default(120);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('gym_plans')) {
            Schema::create('gym_plans', function (Blueprint $table): void {
                $table->id();
                $table->string('name');
                $table->string('code')->unique();
                $table->decimal('price', 12, 2);
                $table->unsignedSmallInteger('duration_days');
                $table->unsignedSmallInteger('grace_days')->default(0);
                $table->unsignedSmallInteger('daily_access_limit')->nullable();
                $table->boolean('includes_classes')->default(false);
                $table->boolean('includes_trainer')->default(false);
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('gym_members')) {
            Schema::create('gym_members', function (Blueprint $table): void {
                $table->id();
                $table->string('member_code')->unique();
                $table->string('first_name');
                $table->string('last_name');
                $table->string('document_type')->default('DNI');
                $table->string('document_number')->unique();
                $table->string('dni', 8)->nullable()->unique();
                $table->string('email')->nullable();
                $table->string('phone');
                $table->date('birthdate')->nullable();
                $table->string('gender')->nullable();
                $table->string('address')->nullable();
                $table->string('emergency_contact_name')->nullable();
                $table->string('emergency_contact_phone')->nullable();
                $table->text('medical_notes')->nullable();
                $table->text('fitness_goal')->nullable();
                $table->string('status')->default('active');
                $table->foreignId('branch_id')->nullable()->constrained('gym_branches')->nullOnDelete();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('gym_memberships')) {
            Schema::create('gym_memberships', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('member_id')->constrained('gym_members')->cascadeOnDelete();
                $table->foreignId('plan_id')->constrained('gym_plans')->restrictOnDelete();
                $table->date('starts_on');
                $table->date('ends_on');
                $table->decimal('price', 12, 2);
                $table->decimal('discount', 12, 2)->default(0);
                $table->string('status')->default('active');
                $table->text('notes')->nullable();
                $table->foreignId('sold_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('gym_payments')) {
            Schema::create('gym_payments', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('member_id')->constrained('gym_members')->cascadeOnDelete();
                $table->foreignId('membership_id')->nullable()->constrained('gym_memberships')->nullOnDelete();
                $table->string('receipt_number')->unique();
                $table->decimal('amount', 12, 2);
                $table->string('method')->default('cash');
                $table->string('proof_path')->nullable();
                $table->string('status')->default('paid');
                $table->date('paid_on');
                $table->text('notes')->nullable();
                $table->foreignId('registered_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('gym_attendances')) {
            Schema::create('gym_attendances', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('member_id')->constrained('gym_members')->cascadeOnDelete();
                $table->foreignId('branch_id')->nullable()->constrained('gym_branches')->nullOnDelete();
                $table->timestamp('checked_in_at');
                $table->timestamp('checked_out_at')->nullable();
                $table->string('source')->default('manual');
                $table->string('result')->default('allowed');
                $table->string('notes')->nullable();
                $table->foreignId('registered_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('gym_classes')) {
            Schema::create('gym_classes', function (Blueprint $table): void {
                $table->id();
                $table->string('name');
                $table->string('category');
                $table->string('level')->default('Todos');
                $table->foreignId('branch_id')->nullable()->constrained('gym_branches')->nullOnDelete();
                $table->string('room')->nullable();
                $table->foreignId('trainer_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('weekday');
                $table->time('starts_at');
                $table->time('ends_at');
                $table->unsignedSmallInteger('capacity');
                $table->string('color', 20)->default('#ffcc00');
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('gym_class_bookings')) {
            Schema::create('gym_class_bookings', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('class_id')->constrained('gym_classes')->cascadeOnDelete();
                $table->foreignId('member_id')->constrained('gym_members')->cascadeOnDelete();
                $table->date('booking_date');
                $table->string('status')->default('reserved');
                $table->timestamp('checked_in_at')->nullable();
                $table->string('notes')->nullable();
                $table->timestamps();
                $table->unique(['class_id', 'member_id', 'booking_date']);
            });
        }

        if (! Schema::hasTable('gym_equipment')) {
            Schema::create('gym_equipment', function (Blueprint $table): void {
                $table->id();
                $table->string('name');
                $table->string('code')->unique();
                $table->foreignId('branch_id')->nullable()->constrained('gym_branches')->nullOnDelete();
                $table->date('purchased_on')->nullable();
                $table->date('next_maintenance_on')->nullable();
                $table->string('status')->default('operational');
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('gym_expenses')) {
            Schema::create('gym_expenses', function (Blueprint $table): void {
                $table->id();
                $table->string('category');
                $table->string('supplier')->nullable();
                $table->decimal('amount', 12, 2);
                $table->date('spent_on');
                $table->string('payment_method')->default('cash');
                $table->string('proof_path')->nullable();
                $table->text('description')->nullable();
                $table->foreignId('registered_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('gym_notifications')) {
            Schema::create('gym_notifications', function (Blueprint $table): void {
                $table->id();
                $table->string('type');
                $table->string('title');
                $table->text('body');
                $table->string('severity')->default('info');
                $table->foreignId('member_id')->nullable()->constrained('gym_members')->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
                $table->timestamp('read_at')->nullable();
                $table->timestamp('scheduled_for')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        foreach ([
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
            'sessions',
            'password_reset_tokens',
            'area_user',
            'users',
            'areas',
            'cargos',
            'permission_role',
            'permissions',
            'roles',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
