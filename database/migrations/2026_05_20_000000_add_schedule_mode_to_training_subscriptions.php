<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('gym_training_subscriptions')) {
            return;
        }

        Schema::table('gym_training_subscriptions', function (Blueprint $table): void {
            if (! Schema::hasColumn('gym_training_subscriptions', 'schedule_mode')) {
                $table->string('schedule_mode', 20)->default('weekly')->after('sessions_per_week');
            }
            if (! Schema::hasColumn('gym_training_subscriptions', 'week_schedules')) {
                $table->json('week_schedules')->nullable()->after('schedule_mode');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('gym_training_subscriptions')) {
            return;
        }

        Schema::table('gym_training_subscriptions', function (Blueprint $table): void {
            if (Schema::hasColumn('gym_training_subscriptions', 'week_schedules')) {
                $table->dropColumn('week_schedules');
            }
            if (Schema::hasColumn('gym_training_subscriptions', 'schedule_mode')) {
                $table->dropColumn('schedule_mode');
            }
        });
    }
};
