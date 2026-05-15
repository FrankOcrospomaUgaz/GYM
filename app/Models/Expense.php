<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Expense extends Model
{
    protected $fillable = [
        'area_id',
        'project_id',
        'client_id',
        'financial_category_id',
        'amount',
        'recorded_on',
        'responsible_user_id',
        'receipt_path',
        'observation',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'recorded_on' => 'date',
        ];
    }

    /** @return BelongsTo<Area, Expense> */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    /** @return BelongsTo<Project, Expense> */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /** @return BelongsTo<Client, Expense> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /** @return BelongsTo<FinancialCategory, Expense> */
    public function financialCategory(): BelongsTo
    {
        return $this->belongsTo(FinancialCategory::class);
    }

    /** @return BelongsTo<User, Expense> */
    public function responsibleUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_user_id');
    }
}
