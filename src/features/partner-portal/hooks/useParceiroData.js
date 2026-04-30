export async function fetchParceiro(supabase) {
  const { data, error } = await supabase
    .schema('euras')
    .from('parceiros')
    .select('*, perfil:perfil_parceiro_id(*)')
    .single()

  return { data, error }
}

export async function fetchResgatesPendentes(supabase, limit = null) {
  let query = supabase
    .schema('euras')
    .from('resgates')
    .select(`
      id,
      valor_euras,
      status,
      criado_em,
      aluno:aluno_id ( nome_completo ),
      produto:produto_id ( titulo )
    `)
    .eq('status', 'pendente')
    .order('criado_em', { ascending: false })

  if (limit) query = query.limit(limit)

  const { data, error } = await query
  return { data, error }
}

export async function fetchResgates(supabase, filtroStatus = null) {
  let query = supabase
    .schema('euras')
    .from('resgates')
    .select(`
      id,
      valor_euras,
      status,
      criado_em,
      confirmado_em,
      aluno:aluno_id ( nome_completo ),
      produto:produto_id ( titulo )
    `)
    .order('criado_em', { ascending: false })

  if (filtroStatus) query = query.eq('status', filtroStatus)

  const { data, error } = await query
  return { data, error }
}

export async function atualizarStatusResgate(supabase, resgateId, novoStatus, userId) {
  const { data, error } = await supabase
    .schema('euras')
    .from('resgates')
    .update({
      status: novoStatus,
      confirmado_por: userId,
      confirmado_em: new Date().toISOString(),
    })
    .eq('id', resgateId)

  return { data, error }
}

export async function fetchAtividadesConcedidas(supabase, limit = null) {
  let query = supabase
    .schema('euras')
    .from('atividades_concedidas')
    .select(`
      id,
      valor_euras,
      titulo_snapshot,
      concedido_em,
      aluno:aluno_id ( nome_completo )
    `)
    .order('concedido_em', { ascending: false })

  if (limit) query = query.limit(limit)

  const { data, error } = await query
  return { data, error }
}

export async function fetchProdutos(supabase, apenasAtivos = false) {
  let query = supabase
    .schema('euras')
    .from('produtos')
    .select('*')
    .order('criado_em', { ascending: false })

  if (apenasAtivos) query = query.eq('ativo', true)

  const { data, error } = await query
  return { data, error }
}

export async function criarProduto(supabase, produto) {
  const { data, error } = await supabase
    .schema('euras')
    .from('produtos')
    .insert(produto)
    .select()
    .single()

  return { data, error }
}

export async function atualizarProduto(supabase, produtoId, campos) {
  const { data, error } = await supabase
    .schema('euras')
    .from('produtos')
    .update(campos)
    .eq('id', produtoId)
    .select()
    .single()

  return { data, error }
}

export async function atualizarPerfil(supabase, parceiroId, campos) {
  const { data, error } = await supabase
    .schema('euras')
    .from('parceiros')
    .update(campos)
    .eq('id', parceiroId)
    .select()
    .single()

  return { data, error }
}

export function getParceiroDataErrorMessage(error) {
  const message = String(error?.message ?? '').trim()

  if (!message) {
    return 'Não foi possível carregar os dados do portal parceiro.'
  }

  const normalized = message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (normalized.includes('tempo limite')) {
    return 'Conexão com o banco demorou demais. Tente novamente em instantes.'
  }

  if (normalized.includes('sessao expirada')) {
    return 'Sua sessão expirou. Faça login novamente.'
  }

  if (normalized.includes('row-level security')) {
    return 'Sem permissão para esta operação. Verifique as políticas de acesso no Supabase.'
  }

  return message
}

