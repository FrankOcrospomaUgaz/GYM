<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gym_products', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('code', 50);
            $table->string('name', 120);
            $table->text('description')->nullable();
            $table->decimal('unit_cost', 12, 2)->default(0);
            $table->decimal('unit_price', 12, 2)->default(0);
            $table->decimal('stock', 12, 3)->default(0);
            $table->decimal('min_stock', 12, 3)->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('branch_id');
            $table->unique(['tenant_id', 'code']);
        });

        Schema::create('gym_product_movements', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('product_id');
            $table->string('type', 50);
            $table->string('reference_type')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->decimal('quantity', 12, 3)->default(0);
            $table->decimal('unit_cost', 12, 2)->default(0);
            $table->decimal('unit_price', 12, 2)->default(0);
            $table->decimal('total_cost', 14, 2)->default(0);
            $table->decimal('total_price', 14, 2)->default(0);
            $table->decimal('balance_quantity', 12, 3)->default(0);
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('branch_id');
            $table->index('product_id');
            $table->index('reference_type');
            $table->index('reference_id');
        });

        Schema::create('gym_product_sales', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->nullable();
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('member_id')->nullable();
            $table->string('customer_name', 120)->nullable();
            $table->decimal('quantity', 12, 3)->default(0);
            $table->decimal('unit_price', 12, 2)->default(0);
            $table->decimal('total_amount', 14, 2)->default(0);
            $table->string('payment_method', 30);
            $table->string('sale_date')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('payment_id')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('branch_id');
            $table->index('product_id');
            $table->index('member_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gym_product_sales');
        Schema::dropIfExists('gym_product_movements');
        Schema::dropIfExists('gym_products');
    }
};
