-- Soprano 0005 — RPC pública para verificação por QR/código
-- Usada pela página /verify/[code] que precisa rodar sem login.

create or replace function public.verify_signature(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sig record;
  v_act record;
  v_result jsonb;
begin
  select s.signer_name, s.signed_at, s.verification_code,
         s.rejected, s.reject_reason, s.activity_id
    into v_sig
    from signatures s
   where s.verification_code = p_code
   limit 1;

  if v_sig is null then
    return null;
  end if;

  select a.id, a.description, a.started_at, a.status,
         l.name as location_name,
         t.label_pt as type_label,
         sup.full_name as supervisor_name,
         cli.full_name as client_name
    into v_act
    from activities a
    left join locations l on l.id = a.location_id
    left join activity_types t on t.id = a.activity_type_id
    left join profiles sup on sup.id = a.supervisor_id
    left join profiles cli on cli.id = a.client_id
   where a.id = v_sig.activity_id;

  v_result := jsonb_build_object(
    'signer_name', v_sig.signer_name,
    'signed_at', v_sig.signed_at,
    'verification_code', v_sig.verification_code,
    'rejected', v_sig.rejected,
    'reject_reason', v_sig.reject_reason,
    'activity', case when v_act is null then null else jsonb_build_object(
      'id', v_act.id,
      'description', v_act.description,
      'started_at', v_act.started_at,
      'status', v_act.status,
      'location_name', v_act.location_name,
      'type_label', v_act.type_label,
      'supervisor_name', v_act.supervisor_name,
      'client_name', v_act.client_name
    ) end
  );

  return v_result;
end;
$$;

grant execute on function public.verify_signature(text) to anon, authenticated;
