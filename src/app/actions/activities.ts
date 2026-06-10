'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getUserEmail } from '@/lib/supabase/service';
import { activitySubmittedEmail } from '@/lib/notify/email';
import { headers } from 'next/headers';
import { requireAuthAndRole } from '@/guards/auth.guard';
import { logger } from '@/lib/logger';
import type { LocationKind } from '@/lib/supabase/database.types';

const log = logger.for('activities');

// ── Schemas compartilhados ─────────────────────────────────────────────────

const participantSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
});

const photoSchema = z.object({
  storagePath: z.string().min(1),
  caption: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

/** Campos comuns a create e update (sem activityType — cada schema define o seu). */
const baseActivitySchema = z.object({
  locationId: z.string().uuid(),
  clientId: z.string().uuid().nullable().optional(),
  description: z.string().min(3),
  notes: z.string().optional(),
  evolucao: z.string().optional(),
  pendencias: z.string().optional(),
  continuationOf: z.string().uuid().nullable().optional(),
  startedAt: z.string(),
  endedAt: z.string().optional().nullable(),
  participants: z.array(participantSchema).default([]),
  photos: z.array(photoSchema).default([]),
});

/**
 * Schema de criação: aceita múltiplos tipos.
 * Cria uma atividade (rascunho) por tipo selecionado, compartilhando todos os outros campos.
 */
const createActivitySchema = baseActivitySchema
  .extend({
    activityTypeIds: z
      .array(z.string().uuid())
      .min(1, 'Selecione ao menos um tipo de atividade'),
    /**
     * Chave de idempotência gerada no dispositivo (estável por submissão).
     * Combinada com cada tipo vira a `client_key` única da atividade, evitando
     * duplicatas quando o create é re-tentado (resposta perdida / fila offline).
     */
    clientKey: z.string().min(1).optional(),
  })
  .refine((d) => !d.endedAt || new Date(d.endedAt) >= new Date(d.startedAt), {
    message: 'A data de término não pode ser anterior ao início',
    path: ['endedAt'],
  });

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

/**
 * Schema de atualização: mantém tipo único (editar uma atividade existente).
 */
const updateActivitySchema = baseActivitySchema
  .extend({
    id: z.string().uuid(),
    activityTypeId: z.string().uuid(),
  })
  .refine((d) => !d.endedAt || new Date(d.endedAt) >= new Date(d.startedAt), {
    message: 'A data de término não pode ser anterior ao início',
    path: ['endedAt'],
  });

export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;

// ── createActivity ─────────────────────────────────────────────────────────

/**
 * Cria uma atividade (rascunho) por tipo selecionado.
 * Todos os outros campos (local, data, descrição, participantes, fotos) são compartilhados.
 * Retorna `ids` — lista de IDs criados, na mesma ordem dos tipos.
 *
 * Idempotente: cada atividade recebe uma `client_key` = `${clientKey}:${typeId}`.
 * Se a chamada for re-tentada (resposta perdida ou sync da fila offline), as
 * atividades já existentes são reaproveitadas em vez de duplicadas. Cada
 * atividade só é confirmada com seus participantes e fotos — se algo falhar no
 * meio, ela é desfeita (rollback compensatório), nunca ficando pela metade.
 */
export async function createActivity(
  input: CreateActivityInput,
): Promise<{ ids?: string[]; error?: string }> {
  try {
    const parsed = createActivitySchema.parse(input);
    const supabase = await createClient();
    const { user } = await requireAuthAndRole(supabase, 'admin', 'supervisor');

    // Base estável da chave de idempotência. Sem clientKey (chamada legada),
    // gera uma aleatória — não duplica, mas também não deduplica entre chamadas.
    const baseKey = parsed.clientKey ?? crypto.randomUUID();
    const typeKeys = parsed.activityTypeIds.map((typeId) => ({
      typeId,
      key: `${baseKey}:${typeId}`,
    }));

    // Idempotência: atividades já criadas para estas chaves num retry anterior.
    const { data: existingRows, error: existErr } = await supabase
      .from('activities')
      .select('id, client_key')
      .in('client_key', typeKeys.map((t) => t.key));

    if (existErr) {
      log.error('Falha ao verificar idempotência', { error: existErr.message });
      return { error: existErr.message };
    }

    const existingByKey = new Map(
      (existingRows ?? []).map((r) => [r.client_key as string, r.id as string]),
    );

    // IDs criados NESTA chamada — alvo do rollback se algo falhar adiante.
    const createdHere: string[] = [];
    const ids: string[] = [];

    const rollback = async () => {
      if (createdHere.length) {
        await supabase.from('activities').delete().in('id', createdHere);
      }
    };

    for (const { typeId, key } of typeKeys) {
      // Já existe de um retry anterior → reaproveita, não recria.
      const already = existingByKey.get(key);
      if (already) {
        ids.push(already);
        continue;
      }

      const { data: inserted, error: insErr } = await supabase
        .from('activities')
        .insert({
          location_id: parsed.locationId,
          activity_type_id: typeId,
          client_id: parsed.clientId ?? null,
          supervisor_id: user.id,
          description: parsed.description,
          notes: parsed.notes ?? null,
          evolucao: parsed.evolucao ?? null,
          pendencias: parsed.pendencias ?? null,
          continuation_of: parsed.continuationOf ?? null,
          started_at: parsed.startedAt,
          ended_at: parsed.endedAt ?? null,
          status: 'rascunho',
          client_key: key,
        })
        .select('id')
        .single();

      if (insErr || !inserted) {
        await rollback();
        log.error('Falha ao criar atividade', { error: insErr?.message });
        return { error: insErr?.message ?? 'Falha ao criar atividade' };
      }

      const activityId = inserted.id;

      // Participantes e fotos em paralelo, com erro propagado (sem perda silenciosa).
      const childOps: PromiseLike<{ error: { message: string } | null }>[] = [];
      if (parsed.participants.length) {
        childOps.push(
          supabase.from('activity_participants').insert(
            parsed.participants.map((p) => ({
              activity_id: activityId,
              name: p.name,
              role: p.role ?? null,
            })),
          ),
        );
      }
      if (parsed.photos.length) {
        childOps.push(
          supabase.from('activity_photos').insert(
            parsed.photos.map((p) => ({
              activity_id: activityId,
              storage_path: p.storagePath,
              caption: p.caption ?? null,
              lat: p.lat ?? null,
              lng: p.lng ?? null,
            })),
          ),
        );
      }

      const childResults = await Promise.all(childOps);
      const childErr = childResults.find((r) => r.error);
      if (childErr) {
        // Desfaz esta atividade (cascade apaga participantes/fotos) + as desta chamada.
        await supabase.from('activities').delete().in('id', [activityId, ...createdHere]);
        log.error('Falha ao salvar participantes/fotos', { error: childErr.error!.message });
        return { error: childErr.error!.message };
      }

      createdHere.push(activityId);
      ids.push(activityId);
    }

    revalidatePath('/atividades');
    revalidatePath('/');
    return { ids };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}

// ── updateActivity ─────────────────────────────────────────────────────────

export async function updateActivity(
  input: UpdateActivityInput,
): Promise<{ id?: string; error?: string }> {
  try {
    const parsed = updateActivitySchema.parse(input);
    const supabase = await createClient();
    const { user, role } = await requireAuthAndRole(supabase, 'admin', 'supervisor');

    const { data: existing } = await supabase
      .from('activities')
      .select('status, supervisor_id')
      .eq('id', parsed.id)
      .single();

    if (!existing) return { error: 'Atividade não encontrada' };
    if (existing.status !== 'rascunho') return { error: 'Só rascunhos podem ser editados' };
    if (role !== 'admin' && existing.supervisor_id !== user.id) return { error: 'Sem permissão' };

    const { error } = await supabase
      .from('activities')
      .update({
        location_id: parsed.locationId,
        activity_type_id: parsed.activityTypeId,
        client_id: parsed.clientId ?? null,
        description: parsed.description,
        notes: parsed.notes ?? null,
        evolucao: parsed.evolucao ?? null,
        pendencias: parsed.pendencias ?? null,
        continuation_of: parsed.continuationOf ?? null,
        started_at: parsed.startedAt,
        ended_at: parsed.endedAt ?? null,
      })
      .eq('id', parsed.id);

    if (error) {
      log.error('Falha ao atualizar atividade', { id: parsed.id, error: error.message });
      return { error: error.message };
    }

    // NOTE: delete-then-insert não é transacional. Mover para RPC Postgres para atomicidade.
    await supabase.from('activity_participants').delete().eq('activity_id', parsed.id);
    if (parsed.participants.length) {
      await supabase.from('activity_participants').insert(
        parsed.participants.map((p) => ({
          activity_id: parsed.id,
          name: p.name,
          role: p.role ?? null,
        })),
      );
    }

    revalidatePath(`/atividades/${parsed.id}`);
    revalidatePath('/atividades');
    return { id: parsed.id };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}

// ── submitActivityForSignature ─────────────────────────────────────────────

export async function submitActivityForSignature(activityId: string): Promise<{ error?: string }> {
  try {
    const aId = z.string().uuid().parse(activityId);
    const supabase = await createClient();
    const { user, role } = await requireAuthAndRole(supabase, 'admin', 'supervisor');

    const { data: act } = await supabase
      .from('activities')
      .select('supervisor_id, client_id, status, description')
      .eq('id', aId)
      .single();

    if (!act) return { error: 'Atividade não encontrada' };
    if (role === 'supervisor' && act.supervisor_id !== user.id) {
      return { error: 'Sem permissão para esta atividade' };
    }

    const { error } = await supabase
      .from('activities')
      .update({ status: 'enviada', submitted_at: new Date().toISOString() })
      .eq('id', aId);

    if (error) return { error: error.message };

    try {
      if (act.client_id) {
        const { data: client } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', act.client_id)
          .single();
        const email = await getUserEmail(act.client_id);
        if (email) {
          const h = await headers();
          const origin = h.get('origin') ?? h.get('referer')?.replace(/\/[^/]*$/, '') ?? '';
          await activitySubmittedEmail({
            clientEmail: email,
            clientName: client?.full_name ?? 'cliente',
            description: act.description,
            activityUrl: `${origin}/atividades/${aId}`,
          });
        }
      }
    } catch {
      log.warn('Falha ao enviar e-mail de notificação', { activityId: aId });
    }

    revalidatePath(`/atividades/${aId}`);
    revalidatePath('/atividades');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}

// ── createLocation ─────────────────────────────────────────────────────────

export async function createLocation(
  name: string,
  kind: LocationKind,
): Promise<{ id: string; name: string; kind: string } | { error: string }> {
  try {
    const supabase = await createClient();
    const { user } = await requireAuthAndRole(supabase, 'admin', 'supervisor');
    const { data, error } = await supabase
      .from('locations')
      .insert({ name, kind, created_by: user.id, line: 'linha-6' })
      .select('id, name, kind')
      .single();
    if (error || !data) return { error: error?.message ?? 'Falha ao criar local' };
    revalidatePath('/locais');
    return data;
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}

// ── createActivityType ─────────────────────────────────────────────────────

export async function createActivityType(input: {
  labelPt: string;
  labelEn?: string;
  labelEs?: string;
}): Promise<
  | { id: string; slug: string; label_pt: string; label_en: string; label_es: string }
  | { error: string }
> {
  try {
    const supabase = await createClient();
    await requireAuthAndRole(supabase, 'admin', 'supervisor');
    const slug = slugify(input.labelPt);
    const { data, error } = await supabase
      .from('activity_types')
      .insert({
        slug,
        label_pt: input.labelPt,
        label_en: input.labelEn ?? input.labelPt,
        label_es: input.labelEs ?? input.labelPt,
      })
      .select('id, slug, label_pt, label_en, label_es')
      .single();
    if (error || !data) return { error: error?.message ?? 'Falha ao criar tipo' };
    revalidatePath('/configuracoes');
    revalidatePath('/atividades/nova');
    return data;
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
