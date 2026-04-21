import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AuditFilters } from './filters';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

type SearchParams = Promise<{
  table?: string;
  action?: string;
  actor?: string;
  page?: string;
}>;

export default async function AuditoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('audit');
  const tTeam = await getTranslations('team');
  const sp = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null };
  if ((me as any)?.role !== 'admin') notFound();

  const page = Math.max(0, parseInt(sp.page ?? '0', 10) || 0);
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let q = supabase
    .from('audit_log')
    .select('id, table_name, record_id, action, actor_id, actor_email, diff, created_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (sp.table) q = q.eq('table_name', sp.table);
  if (sp.action) q = q.eq('action', sp.action);
  if (sp.actor) q = q.ilike('actor_email', `%${sp.actor}%`);

  const [{ data: logs, count }, { data: distinctTables }] = await Promise.all([
    q,
    supabase.from('audit_log').select('table_name').limit(500),
  ]);

  const tables = Array.from(
    new Set(((distinctTables ?? []) as any[]).map((r) => r.table_name)),
  ).sort();

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/equipe">
            <ChevronLeft className="h-4 w-4" />
            {tTeam('back')}
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('descriptionFull', { count: total.toLocaleString(locale === 'pt' ? 'pt-BR' : locale) })}
        </p>
      </header>

      <AuditFilters tables={tables} />

      {(!logs || logs.length === 0) && (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            {t('emptyFiltered')}
          </CardContent>
        </Card>
      )}

      <ul className="space-y-2">
        {(logs ?? []).map((log: any) => (
          <li key={log.id}>
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <ActionBadge action={log.action} />
                  <span className="text-xs font-mono text-muted-foreground">{log.table_name}</span>
                  {log.record_id && (
                    <span className="text-[10px] font-mono text-muted-foreground/70">
                      #{String(log.record_id).slice(0, 8)}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDateTime(log.created_at, locale === 'pt' ? 'pt-BR' : locale)}
                  </span>
                </div>
                <p className="text-sm">
                  <span className="text-muted-foreground">{t('by')} </span>
                  <strong>{log.actor_email ?? t('system')}</strong>
                </p>
                {log.diff && (
                  <details className="mt-3 group">
                    <summary className="text-xs text-primary cursor-pointer hover:underline">
                      {t('showDiff')}
                    </summary>
                    <pre className="mt-2 text-[10px] font-mono bg-muted/40 p-3 rounded overflow-auto max-h-80 border border-border">
                      {JSON.stringify(log.diff, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-2">
          <p className="text-xs text-muted-foreground">
            {t('pageOf', { current: page + 1, total: totalPages })}
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" disabled={page === 0}>
              <Link
                href={`/equipe/auditoria?${new URLSearchParams({
                  ...(sp.table ? { table: sp.table } : {}),
                  ...(sp.action ? { action: sp.action } : {}),
                  ...(sp.actor ? { actor: sp.actor } : {}),
                  page: String(Math.max(0, page - 1)),
                }).toString()}`}
              >
                {t('previous')}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" disabled={page + 1 >= totalPages}>
              <Link
                href={`/equipe/auditoria?${new URLSearchParams({
                  ...(sp.table ? { table: sp.table } : {}),
                  ...(sp.action ? { action: sp.action } : {}),
                  ...(sp.actor ? { actor: sp.actor } : {}),
                  page: String(page + 1),
                }).toString()}`}
              >
                {t('next')}
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const map: Record<string, 'default' | 'warning' | 'success' | 'destructive' | 'secondary' | 'accent'> = {
    insert: 'success',
    update: 'default',
    delete: 'destructive',
    soft_delete: 'warning',
    restore: 'accent',
  };
  return <Badge variant={map[action] ?? 'secondary'}>{action}</Badge>;
}
