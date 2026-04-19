import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { initials } from '@/lib/utils';

export default async function EquipePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, company, phone')
    .order('role')
    .order('full_name');

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Equipe</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Supervisores, administradores e clientes cadastrados no Soprano.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {(profiles ?? []).map((p) => (
          <li key={p.id}>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/15 text-primary text-sm font-semibold border border-primary/25 flex items-center justify-center shrink-0">
                  {initials(p.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                  {p.company && (
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-1">
                      {p.company}
                    </p>
                  )}
                </div>
                <Badge variant={p.role === 'admin' ? 'default' : p.role === 'cliente' ? 'accent' : 'secondary'}>
                  {p.role}
                </Badge>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
