<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('gym_classes')) {
            Schema::table('gym_classes', function (Blueprint $table): void {
                if (! Schema::hasColumn('gym_classes', 'room')) {
                    $table->string('room')->nullable()->after('branch_id');
                }
                if (! Schema::hasColumn('gym_classes', 'level')) {
                    $table->string('level')->default('Todos')->after('category');
                }
                if (! Schema::hasColumn('gym_classes', 'color')) {
                    $table->string('color', 20)->default('#ffcc00')->after('capacity');
                }
                if (! Schema::hasColumn('gym_classes', 'description')) {
                    $table->text('description')->nullable()->after('color');
                }
            });
        }

        if (Schema::hasTable('gym_class_bookings')) {
            Schema::table('gym_class_bookings', function (Blueprint $table): void {
                if (! Schema::hasColumn('gym_class_bookings', 'checked_in_at')) {
                    $table->timestamp('checked_in_at')->nullable()->after('status');
                }
                if (! Schema::hasColumn('gym_class_bookings', 'notes')) {
                    $table->string('notes')->nullable()->after('checked_in_at');
                }
            });
        }

        DB::table('gym_classes')->whereNull('room')->update(['room' => 'Sala principal']);
    }

    public function down(): void
    {
        if (Schema::hasTable('gym_class_bookings')) {
            Schema::table('gym_class_bookings', function (Blueprint $table): void {
                foreach (['notes', 'checked_in_at'] as $column) {
                    if (Schema::hasColumn('gym_class_bookings', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        if (Schema::hasTable('gym_classes')) {
            Schema::table('gym_classes', function (Blueprint $table): void {
                foreach (['description', 'color', 'level', 'room'] as $column) {
                    if (Schema::hasColumn('gym_classes', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};
