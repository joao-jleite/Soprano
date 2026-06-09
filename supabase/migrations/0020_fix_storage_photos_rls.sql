-- Soprano 0020 — Restringe leitura de fotos no Storage
--
-- PROBLEMA: a policy "storage read photos" (0001) permite que QUALQUER usuário
-- autenticado leia QUALQUER objeto do bucket activity-photos. Um cliente
-- conseguia acessar fotos de atividades que não são dele direto pela API de
-- storage (exposição horizontal de imagens do canteiro).
--
-- SOLUÇÃO: admin/supervisor continuam lendo tudo (precisam, inclusive fotos
-- de rascunho cujo path é `draft/<id>/...` e ainda não estão em activity_photos);
-- cliente só lê fotos de atividades onde ele é o client_id. O vínculo é feito
-- pelo storage_path registrado em activity_photos (independe do formato do path).
--
-- Usa função SECURITY DEFINER para evitar RLS-dentro-de-RLS (recursão) ao
-- consultar activity_photos/activities de dentro da policy de storage.objects.

create or replace function public.can_read_activity_photo(p_path text)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select
    current_role_name() in ('admin', 'supervisor')
    or exists (
      select 1
        from activity_photos ap
        join activities a on a.id = ap.activity_id
       where ap.storage_path = p_path
         and a.client_id = auth.uid()
    );
$$;

drop policy if exists "storage read photos" on storage.objects;
create policy "storage read photos"
  on storage.objects for select
  using (
    bucket_id = 'activity-photos'
    and auth.role() = 'authenticated'
    and public.can_read_activity_photo(name)
  );
