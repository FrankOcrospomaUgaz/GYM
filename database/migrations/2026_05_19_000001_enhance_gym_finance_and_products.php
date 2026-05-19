<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('gym_payments')) {
            Schema::table('gym_payments', function (Blueprint $table): void {
                if (! Schema::hasColumn('gym_payments', 'branch_id')) {
                    $table->unsignedBigInteger('branch_id')->nullable()->after('tenant_id');
                    $table->index('branch_id');
                }
                if (! Schema::hasColumn('gym_payments', 'customer_name')) {
                    $table->string('customer_name', 160)->nullable()->after('member_id');
                }
                if (! Schema::hasColumn('gym_payments', 'parent_payment_id')) {
                    $table->unsignedBigInteger('parent_payment_id')->nullable()->after('membership_id');
                    $table->index('parent_payment_id');
                }
                if (! Schema::hasColumn('gym_payments', 'amount_paid')) {
                    $table->decimal('amount_paid', 12, 2)->default(0)->after('amount');
                }
                if (! Schema::hasColumn('gym_payments', 'due_on')) {
                    $table->date('due_on')->nullable()->after('paid_on');
                }
            });
        }

        if (Schema::hasTable('gym_expenses')) {
            Schema::table('gym_expenses', function (Blueprint $table): void {
                if (! Schema::hasColumn('gym_expenses', 'branch_id')) {
                    $table->unsignedBigInteger('branch_id')->nullable()->after('tenant_id');
                    $table->index('branch_id');
                }
            });
        }

        if (Schema::hasTable('gym_product_sales')) {
            Schema::table('gym_product_sales', function (Blueprint $table): void {
                if (! Schema::hasColumn('gym_product_sales', 'payment_status')) {
                    $table->string('payment_status', 30)->default('paid')->after('payment_method');
                }
                if (! Schema::hasColumn('gym_product_sales', 'due_on')) {
                    $table->date('due_on')->nullable()->after('sale_date');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('gym_product_sales')) {
            Schema::table('gym_product_sales', function (Blueprint $table): void {
                foreach (['payment_status', 'due_on'] as $column) {
                    if (Schema::hasColumn('gym_product_sales', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        if (Schema::hasTable('gym_expenses')) {
            Schema::table('gym_expenses', function (Blueprint $table): void {
                if (Schema::hasColumn('gym_expenses', 'branch_id')) {
                    $table->dropColumn('branch_id');
                }
            });
        }

        if (Schema::hasTable('gym_payments')) {
            Schema::table('gym_payments', function (Blueprint $table): void {
                foreach (['branch_id', 'customer_name', 'parent_payment_id', 'amount_paid', 'due_on'] as $column) {
                    if (Schema::hasColumn('gym_payments', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};
