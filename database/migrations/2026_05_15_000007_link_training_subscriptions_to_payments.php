<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('gym_payments') && ! Schema::hasColumn('gym_payments', 'training_subscription_id')) {
            Schema::table('gym_payments', function (Blueprint $table): void {
                $table->foreignId('training_subscription_id')->nullable()->after('membership_id')->constrained('gym_training_subscriptions')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('gym_payments') && Schema::hasColumn('gym_payments', 'training_subscription_id')) {
            Schema::table('gym_payments', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('training_subscription_id');
            });
        }
    }
};
