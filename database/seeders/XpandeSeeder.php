<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\Cargo;
use App\Models\Currency;
use App\Models\FinancialCategory;
use App\Models\Role;
use App\Models\Service;
use App\Models\StatusCatalog;
use App\Models\TaxRate;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class XpandeSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'Administrador', 'slug' => 'admin', 'description' => 'Acceso total al sistema.'],
            ['name' => 'Gerente general', 'slug' => 'gerente_general', 'description' => 'Visión global con permisos de configuración acotados.'],
            ['name' => 'Gerente de área', 'slug' => 'gerente_area', 'description' => 'Gestión de sus áreas asignadas.'],
            ['name' => 'Consultor', 'slug' => 'consultor', 'description' => 'Proyectos y clientes asociados a su carga.'],
            ['name' => 'Finanzas', 'slug' => 'finanzas', 'description' => 'Ingresos, gastos y reportes financieros.'],
            ['name' => 'Comercial', 'slug' => 'comercial', 'description' => 'CRM, oportunidades y cotizaciones.'],
            ['name' => 'Marketing', 'slug' => 'marketing', 'description' => 'Enfoque Xango y clientes vinculados.'],
            ['name' => 'Desarrollo', 'slug' => 'desarrollo', 'description' => 'Enfoque Xingeria y proyectos técnicos.'],
        ];

        foreach ($roles as $r) {
            Role::query()->updateOrCreate(['slug' => $r['slug']], $r);
        }

        $areas = [
            ['name' => 'Xingeria', 'slug' => 'xingeria', 'description' => 'Software y tecnología.'],
            ['name' => 'Xpande', 'slug' => 'xpande', 'description' => 'Consultoría empresarial.'],
            ['name' => 'Xango', 'slug' => 'xango', 'description' => 'Marketing y contenido.'],
        ];

        foreach ($areas as $a) {
            Area::query()->updateOrCreate(['slug' => $a['slug']], $a);
        }

        Currency::query()->updateOrCreate(
            ['code' => 'PEN'],
            ['name' => 'Sol peruano', 'symbol' => 'S/.', 'is_active' => true]
        );

        TaxRate::query()->updateOrCreate(
            ['name' => 'IGV 18%'],
            ['rate_percent' => 18, 'is_active' => true]
        );

        $incomeTypes = [
            'Servicio mensual',
            'Proyecto cerrado',
            'Consultoría por hora',
            'Desarrollo de software',
            'Campaña de marketing',
            'Mantenimiento',
            'Otro',
        ];

        foreach ($incomeTypes as $n) {
            FinancialCategory::query()->updateOrCreate(
                ['name' => $n, 'type' => 'income'],
                ['is_active' => true]
            );
        }

        $expenseTypes = [
            'Sueldos',
            'Publicidad',
            'Software',
            'Hosting',
            'Dominio',
            'Transporte',
            'Viáticos',
            'Diseño',
            'Producción audiovisual',
            'Herramientas digitales',
            'Servicios externos',
            'Otros',
        ];

        foreach ($expenseTypes as $n) {
            FinancialCategory::query()->updateOrCreate(
                ['name' => $n, 'type' => 'expense'],
                ['is_active' => true]
            );
        }

        $statusRows = [
            ['category' => 'client_pipeline', 'code' => 'lead', 'label' => 'Lead', 'sort_order' => 1],
            ['category' => 'client_pipeline', 'code' => 'prospect', 'label' => 'Prospecto', 'sort_order' => 2],
            ['category' => 'client_pipeline', 'code' => 'client', 'label' => 'Cliente', 'sort_order' => 3],
            ['category' => 'client_pipeline', 'code' => 'active_client', 'label' => 'Cliente activo', 'sort_order' => 4],
            ['category' => 'client_pipeline', 'code' => 'inactive_client', 'label' => 'Cliente inactivo', 'sort_order' => 5],
            ['category' => 'project', 'code' => 'pending', 'label' => 'Pendiente', 'sort_order' => 1],
            ['category' => 'project', 'code' => 'in_progress', 'label' => 'En proceso', 'sort_order' => 2],
            ['category' => 'project', 'code' => 'paused', 'label' => 'Pausado', 'sort_order' => 3],
            ['category' => 'project', 'code' => 'finished', 'label' => 'Finalizado', 'sort_order' => 4],
            ['category' => 'project', 'code' => 'cancelled', 'label' => 'Cancelado', 'sort_order' => 5],
            ['category' => 'payment', 'code' => 'pending', 'label' => 'Pendiente', 'sort_order' => 1],
            ['category' => 'payment', 'code' => 'paid', 'label' => 'Pagado', 'sort_order' => 2],
            ['category' => 'payment', 'code' => 'overdue', 'label' => 'Vencido', 'sort_order' => 3],
            ['category' => 'payment', 'code' => 'partial', 'label' => 'Parcialmente pagado', 'sort_order' => 4],
            ['category' => 'payment', 'code' => 'annulled', 'label' => 'Anulado', 'sort_order' => 5],
        ];

        foreach ($statusRows as $s) {
            StatusCatalog::query()->updateOrCreate(
                ['category' => $s['category'], 'code' => $s['code']],
                [...$s, 'is_active' => true]
            );
        }

        Cargo::query()->updateOrCreate(['name' => 'Director general'], ['is_active' => true]);
        Cargo::query()->updateOrCreate(['name' => 'Consultor senior'], ['is_active' => true]);
        Cargo::query()->updateOrCreate(['name' => 'Ejecutivo comercial'], ['is_active' => true]);

        $xingeria = Area::query()->where('slug', 'xingeria')->first();
        $xpande = Area::query()->where('slug', 'xpande')->first();
        $xango = Area::query()->where('slug', 'xango')->first();

        $services = [
            ['name' => 'Desarrollo web', 'area_id' => $xingeria?->id],
            ['name' => 'Automatización', 'area_id' => $xingeria?->id],
            ['name' => 'Consultoría empresarial', 'area_id' => $xpande?->id],
            ['name' => 'Marketing digital', 'area_id' => $xango?->id],
            ['name' => 'Branding', 'area_id' => $xango?->id],
        ];

        foreach ($services as $s) {
            if ($s['area_id'] !== null) {
                Service::query()->firstOrCreate(
                    ['name' => $s['name']],
                    ['area_id' => $s['area_id'], 'is_active' => true]
                );
            }
        }

        $adminRole = Role::query()->where('slug', 'admin')->first();

        User::query()->updateOrCreate(
            ['email' => env('XPANDE_ADMIN_EMAIL', 'admin@xpande.local')],
            [
                'name' => env('XPANDE_ADMIN_NAME', 'Administrador Xpande Corp'),
                'password' => Hash::make(env('XPANDE_ADMIN_PASSWORD', 'ChangeMe123!')),
                'is_superadmin' => true,
                'role_id' => $adminRole?->id,
                'phone' => null,
                'is_active' => true,
                'cost_per_hour' => 120,
            ]
        );

        $u = User::query()->where('email', env('XPANDE_ADMIN_EMAIL', 'admin@xpande.local'))->first();

        if ($u !== null) {
            $u->areas()->sync(Area::query()->where('is_active', true)->pluck('id'));
        }
    }
}
