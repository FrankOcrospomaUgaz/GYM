<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class GymSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'Administrador', 'slug' => 'admin', 'description' => 'Control total del gimnasio.'],
            ['name' => 'Recepción', 'slug' => 'recepcion', 'description' => 'Clientes, pagos, accesos y reservas.'],
            ['name' => 'Entrenador', 'slug' => 'entrenador', 'description' => 'Clases, asistencia y seguimiento físico.'],
            ['name' => 'Finanzas', 'slug' => 'finanzas', 'description' => 'Caja, ingresos, gastos y reportes.'],
        ];

        foreach ($roles as $role) {
            Role::query()->updateOrCreate(['slug' => $role['slug']], $role);
        }

        $modules = ['dashboard', 'members', 'memberships', 'payments', 'attendance', 'classes', 'equipment', 'expenses', 'reports', 'users'];
        foreach ($modules as $module) {
            foreach (['view', 'create', 'update', 'delete'] as $action) {
                $permissionId = DB::table('permissions')->updateOrInsert(
                    ['module' => $module, 'action' => $action],
                    ['label' => ucfirst($action).' '.ucfirst($module), 'created_at' => now(), 'updated_at' => now()]
                );
            }
        }

        $adminRole = Role::query()->where('slug', 'admin')->first();
        $trainerRole = Role::query()->where('slug', 'entrenador')->first();
        $receptionRole = Role::query()->where('slug', 'recepcion')->first();

        if ($adminRole !== null) {
            $permissionIds = DB::table('permissions')->pluck('id')->all();
            $adminRole->permissions()->sync($permissionIds);
        }

        DB::table('cargos')->updateOrInsert(['name' => 'Gerente de sede'], ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('cargos')->updateOrInsert(['name' => 'Asesor comercial'], ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('cargos')->updateOrInsert(['name' => 'Entrenador personal'], ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('areas')->updateOrInsert(['slug' => 'operaciones'], ['name' => 'Operaciones', 'description' => 'Atención, accesos y experiencia del socio.', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);

        $admin = User::query()->updateOrCreate(
            ['email' => 'admin@gym.local'],
            [
                'name' => 'Administrador GymPro',
                'password' => Hash::make('GymPro2026!'),
                'is_superadmin' => true,
                'role_id' => $adminRole?->id,
                'phone' => '999000001',
                'is_active' => true,
                'specialty' => 'Gestión integral',
            ]
        );

        $trainer = User::query()->updateOrCreate(
            ['email' => 'trainer@gym.local'],
            [
                'name' => 'Valeria Torres',
                'password' => Hash::make('GymPro2026!'),
                'is_superadmin' => false,
                'role_id' => $trainerRole?->id,
                'phone' => '999000002',
                'is_active' => true,
                'specialty' => 'Funcional y musculación',
            ]
        );

        User::query()->updateOrCreate(
            ['email' => 'recepcion@gym.local'],
            [
                'name' => 'Carlos Medina',
                'password' => Hash::make('GymPro2026!'),
                'is_superadmin' => false,
                'role_id' => $receptionRole?->id,
                'phone' => '999000003',
                'is_active' => true,
                'specialty' => 'Atención al cliente',
            ]
        );

        $branchId = DB::table('gym_branches')->updateOrInsert(
            ['name' => 'Smart Gym Central'],
            [
                'phone' => '014455566',
                'email' => 'central@gym.local',
                'address' => 'Av. Principal 123',
                'city' => 'Lima',
                'opening_hours' => 'Lunes a sábado 5:00 AM - 11:00 PM',
                'capacity' => 180,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $branchId = DB::table('gym_branches')->where('name', 'Smart Gym Central')->value('id');

        $plans = [
            ['Smart Fit GO', 'GO', 79.90, 30, 3, 1, true, false, 'Plan mensual con acceso a sala y clases grupales.'],
            ['Black Pro', 'BLACK', 129.90, 30, 5, null, true, true, 'Acceso completo, entrenador inicial y clases premium.'],
            ['Trimestral Ahorro', 'TRI', 219.00, 90, 7, null, true, false, 'Membresía trimestral para socios constantes.'],
            ['Anual Elite', 'ANUAL', 799.00, 365, 10, null, true, true, 'Plan anual con beneficios preferenciales.'],
        ];

        foreach ($plans as [$name, $code, $price, $days, $grace, $limit, $classes, $trainerIncluded, $description]) {
            DB::table('gym_plans')->updateOrInsert(
                ['code' => $code],
                compact('name') + [
                    'price' => $price,
                    'duration_days' => $days,
                    'grace_days' => $grace,
                    'daily_access_limit' => $limit,
                    'includes_classes' => $classes,
                    'includes_trainer' => $trainerIncluded,
                    'description' => $description,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        foreach ([
            ['Bajar grasa', 'Reducción de porcentaje graso y mejora metabólica.'],
            ['Ganar masa muscular', 'Hipertrofia, fuerza progresiva y alimentación enfocada.'],
            ['Tonificar', 'Mejorar composición corporal con entrenamiento mixto.'],
            ['Mejorar resistencia', 'Cardio, capacidad aeróbica y acondicionamiento.'],
            ['Rehabilitación / movilidad', 'Retorno progresivo, movilidad y prevención de lesiones.'],
            ['Salud general', 'Actividad física constante y hábitos saludables.'],
            ['Preparación deportiva', 'Objetivos específicos por disciplina o competencia.'],
        ] as [$name, $description]) {
            DB::table('gym_fitness_goals')->updateOrInsert(
                ['name' => $name],
                ['description' => $description, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        $memberRows = [
            ['M-0001', 'Andrea', 'Paredes', '76543210', 'andrea@mail.test', '987111111', 'Bajar grasa y tonificar', 'active'],
            ['M-0002', 'Luis', 'Cáceres', '71543210', 'luis@mail.test', '987222222', 'Ganar masa muscular', 'active'],
            ['M-0003', 'María', 'Quispe', '70543210', 'maria@mail.test', '987333333', 'Mejorar resistencia', 'active'],
            ['M-0004', 'Jorge', 'Salazar', '69543210', 'jorge@mail.test', '987444444', 'Retomar entrenamiento', 'inactive'],
            ['M-0005', 'Sofía', 'Ramos', '68543210', 'sofia@mail.test', '987555555', 'Preparación funcional', 'active'],
        ];

        foreach ($memberRows as [$code, $first, $last, $doc, $email, $phone, $goal, $status]) {
            DB::table('gym_members')->updateOrInsert(
                ['document_number' => $doc],
                [
                    'member_code' => $code,
                    'first_name' => $first,
                    'last_name' => $last,
                    'document_type' => 'DNI',
                    'dni' => $doc,
                    'email' => $email,
                    'phone' => $phone,
                    'birthdate' => Carbon::now()->subYears(rand(22, 42))->subDays(rand(1, 300))->toDateString(),
                    'gender' => rand(0, 1) ? 'F' : 'M',
                    'address' => 'Dirección demo '.$code,
                    'emergency_contact_name' => 'Contacto '.$first,
                    'emergency_contact_phone' => '988'.rand(100000, 999999),
                    'medical_notes' => 'Sin restricciones declaradas.',
                    'fitness_goal' => $goal,
                    'status' => $status,
                    'branch_id' => $branchId,
                    'created_by' => $admin->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        $planIds = DB::table('gym_plans')->pluck('id', 'code');
        $members = DB::table('gym_members')->get();
        foreach ($members as $index => $member) {
            $starts = Carbon::today()->subDays(20 - ($index * 4));
            $planCode = $index % 2 === 0 ? 'BLACK' : 'GO';
            $plan = DB::table('gym_plans')->where('code', $planCode)->first();
            DB::table('gym_memberships')->updateOrInsert(
                ['member_id' => $member->id, 'starts_on' => $starts->toDateString()],
                [
                    'plan_id' => $plan->id,
                    'ends_on' => $starts->copy()->addDays($plan->duration_days)->toDateString(),
                    'price' => $plan->price,
                    'discount' => $index === 2 ? 10 : 0,
                    'status' => $member->status === 'active' ? 'active' : 'expired',
                    'notes' => 'Alta generada por seeder.',
                    'sold_by' => $admin->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
            $membership = DB::table('gym_memberships')->where('member_id', $member->id)->orderByDesc('id')->first();
            DB::table('gym_payments')->updateOrInsert(
                ['receipt_number' => 'B001-'.str_pad((string) $member->id, 5, '0', STR_PAD_LEFT)],
                [
                    'member_id' => $member->id,
                    'membership_id' => $membership?->id,
                    'amount' => $plan->price - ($index === 2 ? 10 : 0),
                    'method' => $index % 2 === 0 ? 'card' : 'cash',
                    'status' => 'paid',
                    'paid_on' => $starts->toDateString(),
                    'notes' => 'Pago de membresía.',
                    'registered_by' => $admin->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        foreach ($members->take(4) as $member) {
            DB::table('gym_attendances')->insertOrIgnore([
                'member_id' => $member->id,
                'branch_id' => $branchId,
                'checked_in_at' => Carbon::now()->subHours(rand(1, 8)),
                'source' => 'manual',
                'result' => 'allowed',
                'notes' => 'Ingreso demo.',
                'registered_by' => $admin->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        foreach ([
            ['Funcional HIIT', 'Funcional', 'Intermedio', 'Lunes', '07:00', '07:50', 24, '#ffcc00', 'Sala funcional'],
            ['Spinning Pro', 'Cardio', 'Todos', 'Miércoles', '19:00', '19:45', 20, '#22c55e', 'Sala cycling'],
            ['Musculación guiada', 'Fuerza', 'Principiante', 'Viernes', '18:00', '19:00', 16, '#0f172a', 'Zona pesas'],
            ['MMA Striking', 'MMA', 'Intermedio', 'Martes', '20:00', '21:20', 18, '#ef4444', 'Tatami'],
            ['Sparring controlado', 'MMA', 'Avanzado', 'Sábado', '10:00', '11:30', 12, '#7c3aed', 'Jaula / Tatami'],
            ['Brazilian Jiu-Jitsu', 'Grappling', 'Todos', 'Jueves', '20:00', '21:30', 20, '#2563eb', 'Tatami'],
        ] as [$name, $category, $level, $weekday, $startsAt, $endsAt, $capacity, $color, $room]) {
            DB::table('gym_classes')->updateOrInsert(
                ['name' => $name, 'weekday' => $weekday, 'starts_at' => $startsAt],
                [
                    'category' => $category,
                    'level' => $level,
                    'branch_id' => $branchId,
                    'room' => $room,
                    'trainer_id' => $trainer->id,
                    'ends_at' => $endsAt,
                    'capacity' => $capacity,
                    'color' => $color,
                    'description' => 'Clase programada para control de cupos, reservas y asistencia.',
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        foreach ([
            ['Caminadora LifeFitness', 'EQ-001', 'operational', 25],
            ['Rack sentadillas', 'EQ-002', 'operational', 60],
            ['Bicicleta spinning', 'EQ-003', 'maintenance', -2],
        ] as [$name, $code, $status, $days]) {
            DB::table('gym_equipment')->updateOrInsert(
                ['code' => $code],
                [
                    'name' => $name,
                    'branch_id' => $branchId,
                    'purchased_on' => Carbon::today()->subYear()->toDateString(),
                    'next_maintenance_on' => Carbon::today()->addDays($days)->toDateString(),
                    'status' => $status,
                    'notes' => 'Activo de gimnasio.',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        DB::table('gym_expenses')->updateOrInsert(
            ['category' => 'Servicios', 'spent_on' => Carbon::today()->subDays(3)->toDateString()],
            ['supplier' => 'Luz y agua', 'amount' => 680, 'payment_method' => 'transfer', 'description' => 'Servicios mensuales', 'registered_by' => $admin->id, 'created_at' => now(), 'updated_at' => now()]
        );

        DB::table('gym_notifications')->updateOrInsert(
            ['type' => 'membership_expiry', 'title' => 'Membresías por vencer'],
            ['body' => 'Hay socios con membresías próximas a vencer. Contactar para renovación.', 'severity' => 'warning', 'user_id' => $admin->id, 'scheduled_for' => now(), 'created_at' => now(), 'updated_at' => now()]
        );
        DB::table('gym_notifications')->updateOrInsert(
            ['type' => 'equipment_maintenance', 'title' => 'Mantenimiento pendiente'],
            ['body' => 'La bicicleta spinning requiere revisión técnica.', 'severity' => 'danger', 'user_id' => $admin->id, 'scheduled_for' => now(), 'created_at' => now(), 'updated_at' => now()]
        );
    }
}
