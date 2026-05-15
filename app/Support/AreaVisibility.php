<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class AreaVisibility
{
    public static function canSeeAll(User $user): bool
    {
        if ($user->is_superadmin) {
            return true;
        }
        $slug = $user->role?->slug;

        return \in_array($slug, ['admin', 'gerente_general'], true);
    }

    /**
     * @return list<int|string>
     */
    public static function userAreaIds(User $user): array
    {
        if (! $user->relationLoaded('areas')) {
            $user->load('areas');
        }

        return $user->areas->pluck('id')->all();
    }

    /** @param  Builder<\App\Models\Client>  $q */
    public static function applyClientScope(Builder $q, User $user): Builder
    {
        if (self::canSeeAll($user)) {
            return $q;
        }

        if ($user->role?->slug === 'consultor') {
            return $q->whereHas('projects.users', fn (Builder $b) => $b->where('users.id', $user->id));
        }

        $ids = self::userAreaIds($user);
        if ($ids === []) {
            return $q->whereRaw('1 = 0');
        }

        return $q->whereHas('areas', fn (Builder $b) => $b->whereIn('areas.id', $ids));
    }

    /** @param  Builder<\App\Models\Project>  $q */
    public static function applyProjectScope(Builder $q, User $user): Builder
    {
        if (self::canSeeAll($user)) {
            return $q;
        }

        if ($user->role?->slug === 'consultor') {
            return $q->whereHas('users', fn (Builder $b) => $b->where('users.id', $user->id));
        }

        $ids = self::userAreaIds($user);
        if ($ids === []) {
            return $q->whereRaw('1 = 0');
        }

        return $q->whereHas('areas', fn (Builder $b) => $b->whereIn('areas.id', $ids));
    }

    /** @param  Builder<\App\Models\Opportunity>  $q */
    public static function applyOpportunityScope(Builder $q, User $user): Builder
    {
        if (self::canSeeAll($user)) {
            return $q;
        }

        if ($user->role?->slug === 'consultor') {
            return $q->whereHas('client.projects.users', fn (Builder $b) => $b->where('users.id', $user->id));
        }

        $ids = self::userAreaIds($user);
        if ($ids === []) {
            return $q->whereRaw('1 = 0');
        }

        return $q->where(function (Builder $w) use ($ids) {
            $w->whereIn('area_id', $ids)->orWhereHas('client.areas', fn (Builder $b) => $b->whereIn('areas.id', $ids));
        });
    }

    /** @param  Builder<\App\Models\Income>  $q */
    public static function applyIncomeScope(Builder $q, User $user): Builder
    {
        if (self::canSeeAll($user)) {
            return $q;
        }

        if ($user->role?->slug === 'consultor') {
            $pids = $user->projects()->pluck('projects.id')->all();

            return $q->whereIn('project_id', $pids);
        }

        $ids = self::userAreaIds($user);
        if ($ids === []) {
            return $q->whereRaw('1 = 0');
        }

        return $q->whereIn('area_id', $ids);
    }

    /** @param  Builder<\App\Models\Expense>  $q */
    public static function applyExpenseScope(Builder $q, User $user): Builder
    {
        if (self::canSeeAll($user)) {
            return $q;
        }

        $ids = self::userAreaIds($user);
        if ($ids === []) {
            return $q->whereRaw('1 = 0');
        }

        return $q->whereIn('area_id', $ids);
    }

    /** @param  Builder<\App\Models\Quotation>  $q */
    public static function applyQuotationScope(Builder $q, User $user): Builder
    {
        if (self::canSeeAll($user)) {
            return $q;
        }

        $ids = self::userAreaIds($user);
        if ($ids === []) {
            return $q->whereRaw('1 = 0');
        }

        return $q->where(function (Builder $w) use ($ids) {
            $w->whereHas('areas', fn (Builder $b) => $b->whereIn('areas.id', $ids))
                ->orWhereHas('client.areas', fn (Builder $b) => $b->whereIn('areas.id', $ids));
        });
    }

    /** @param  Builder<\App\Models\TimeEntry>  $q */
    public static function applyTimeEntryScope(Builder $q, User $user): Builder
    {
        if (self::canSeeAll($user)) {
            return $q;
        }

        if ($user->role?->slug === 'consultor') {
            return $q->where('user_id', $user->id);
        }

        $ids = self::userAreaIds($user);
        if ($ids === []) {
            return $q->whereRaw('1 = 0');
        }

        return $q->whereIn('area_id', $ids);
    }

    /** @param  Builder<\App\Models\Document>  $q */
    public static function applyDocumentScope(Builder $q, User $user): Builder
    {
        if (self::canSeeAll($user)) {
            return $q;
        }

        $ids = self::userAreaIds($user);
        if ($ids === []) {
            return $q->whereRaw('1 = 0');
        }

        return $q->where(function (Builder $w) use ($ids) {
            $w->whereIn('area_id', $ids)
                ->orWhereHas('project.areas', fn (Builder $b) => $b->whereIn('areas.id', $ids))
                ->orWhereHas('client.areas', fn (Builder $b) => $b->whereIn('areas.id', $ids));
        });
    }

    /** @param  Builder<\App\Models\CrmActivity>  $q */
    public static function applyCrmActivityScope(Builder $q, User $user): Builder
    {
        if (self::canSeeAll($user)) {
            return $q;
        }

        if ($user->role?->slug === 'consultor') {
            return $q->whereHas('client.projects.users', fn (Builder $b) => $b->where('users.id', $user->id));
        }

        $ids = self::userAreaIds($user);
        if ($ids === []) {
            return $q->whereRaw('1 = 0');
        }

        return $q->whereHas('client.areas', fn (Builder $b) => $b->whereIn('areas.id', $ids));
    }
}
