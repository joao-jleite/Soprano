import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RestoreRow } from './restore-row';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function LixeiraPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null };
  if ((me as any)?.role !== 'admin') notFound();

  const [{ data: acts }, { data: locs }, { data: types }] = await Promise.all([
    supabase
      .from('activities')
      .select('id, description, deleted_at, status, locations(name)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(200),
    supabase
      .from('locations')
      .select('id, name, kind, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(200),
    supabase
      .from('activity_types')
      .select('id, label_pt, slug, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(200),
  ]);

  const loc = locale === 'pt' ? 'pt-BR' : locale;

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/equipe">
            <ChevronLeft className="h-4 w-4" />
            Equipe
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">Lixeira</h1>
        <p className="text-sm text-muted-foreground">
          Registros excluídos. Você pode restaurar ou excluir em definitivo.
        </p>
      </header>

      <Tabs defaultValue="activities">
        <TabsList>
          <TabsTrigger value="activities">Atividades ({acts?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="locations">Locais ({locs?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="types">Tipos ({types?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="space-y-2 mt-4">
          {(!acts || acts.length === 0) && <Empty />}
          {(acts ?? []).map((a: any) => (
            <Card key={a.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{a.description}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {a.locations?.name} · excluída em {formatDateTime(a.deleted_at, loc)}
                  </p>
                </div>
                <RestoreRow table="activities" id={a.id} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="locations" className="space-y-2 mt-4">
          {(!locs || locs.length === 0) && <Empty />}
          {(locs ?? []).map((l: any) => (
            <Card key={l.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{l.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.kind} · excluído em {formatDateTime(l.deleted_at, loc)}
                  </p>
                </div>
                <RestoreRow table="locations" id={l.id} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="types" className="space-y-2 mt-4">
          {(!types || types.length === 0) && <Empty />}
          {(types ?? []).map((t: any) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{t.label_pt}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.slug} · excluído em {formatDateTime(t.deleted_at, loc)}
                  </p>
                </div>
                <RestoreRow table="activity_types" id={t.id} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Empty() {
  return (
    <Card>
      <CardContent className="p-10 text-center text-sm text-muted-foreground">
        Nada por aqui.
      </CardContent>
    </Card>
  );
}
