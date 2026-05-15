<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('gym_training_subscriptions')) {
            Schema::create('gym_training_subscriptions', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('member_id')->constrained('gym_members')->cascadeOnDelete();
                $table->string('discipline');
                $table->decimal('monthly_fee', 12, 2);
                $table->date('starts_on');
                $table->date('ends_on');
                $table->json('selected_days');
                $table->time('preferred_time');
                $table->unsignedSmallInteger('sessions_per_week')->default(3);
                $table->string('payment_method')->default('cash');
                $table->string('proof_path')->nullable();
                $table->string('status')->default('active');
                $table->text('notes')->nullable();
                $table->foreignId('registered_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('gym_training_subscriptions');
    }
};
