<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Document extends Model
{
    protected $fillable = [
        'client_id',
        'project_id',
        'area_id',
        'doc_type',
        'title',
        'path',
        'uploaded_by',
        'version',
    ];

    /** @return BelongsTo<Client, Document> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /** @return BelongsTo<Project, Document> */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /** @return BelongsTo<Area, Document> */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    /** @return BelongsTo<User, Document> */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /** @return HasMany<DocumentVersion, Document> */
    public function versions(): HasMany
    {
        return $this->hasMany(DocumentVersion::class);
    }
}
