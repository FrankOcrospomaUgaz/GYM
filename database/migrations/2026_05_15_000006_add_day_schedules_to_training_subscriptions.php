<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('gym_training_subscriptions') && ! Schema::hasColumn('gym_training_subscriptions', 'day_schedules')) {
            Schema::table('gym_training_subscriptions', function (Blueprint $table): void {
                $table->json('day_schedules')->nullable()->after('selected_days');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('gym_training_subscriptions') && Schema::hasColumn('gym_training_subscriptions', 'day_schedules')) {
            Schema::table('gym_training_subscriptions', function (Blueprint $table): void {
                $table->dropColumn('day_schedules');
            });
        }
    }
};
