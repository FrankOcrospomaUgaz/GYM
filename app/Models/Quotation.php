<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quotation extends Model
{
    protected $fillable = [
        'client_id',
        'number',
        'status',
        'subtotal',
        'tax_amount',
        'discount',
        'total',
        'currency_id',
        'valid_until',
        'created_by',
        'accepted_project_id',
        'opportunity_id',
        'accepted_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'discount' => 'decimal:2',
            'total' => 'decimal:2',
            'valid_until' => 'date',
            'accepted_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Client, Quotation> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /** @return BelongsTo<Currency, Quotation> */
    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    /** @return BelongsTo<User, Quotation> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return BelongsTo<Project, Quotation> */
    public function acceptedProject(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'accepted_project_id');
    }

    /** @return BelongsToMany<Area, Quotation> */
    public function areas(): BelongsToMany
    {
        return $this->belongsToMany(Area::class, 'quotation_area');
    }

    /** @return HasMany<QuotationLine, Quotation> */
    public function lines(): HasMany
    {
        return $this->hasMany(QuotationLine::class);
    }
}
