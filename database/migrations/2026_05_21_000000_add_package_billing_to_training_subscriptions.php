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
            if (! Schema::hasColumn('gym_training_subscriptions', 'billing_mode')) {
                $table->string('billing_mode', 20)->default('monthly')->after('monthly_fee');
            }
            if (! Schema::hasColumn('gym_training_subscriptions', 'price_per_class')) {
                $table->decimal('price_per_class', 12, 2)->nullable()->after('billing_mode');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('gym_training_subscriptions')) {
            return;
        }

        Schema::table('gym_training_subscriptions', function (Blueprint $table): void {
            if (Schema::hasColumn('gym_training_subscriptions', 'price_per_class')) {
                $table->dropColumn('price_per_class');
            }
            if (Schema::hasColumn('gym_training_subscriptions', 'billing_mode')) {
                $table->dropColumn('billing_mode');
            }
        });
    }
};
