import { ensureFreshSession, supabase } from './supabase'

const euras = supabase.schema('euras')

function normalizeName(value) {
  return String(value ?? '').trim().toUpperCase()
}

function normalizeId(value) {
  return String(value ?? '').trim()
}

function mapSede(row) {
  return {
    id: row.id,
    nome: row.nome ?? '',
    ativo: Boolean(row.ativo),
    criadoEm: row.criado_em ?? null,
    atualizadoEm: row.atualizado_em ?? null,
  }
}

function mapCurso(row) {
  return {
    id: row.id,
    sedeId: row.sede_id,
    sedeNome: row.sedes?.nome ?? row.sede_nome ?? '',
    nome: row.nome ?? '',
    ativo: Boolean(row.ativo),
    criadoEm: row.criado_em ?? null,
    atualizadoEm: row.atualizado_em ?? null,
  }
}

export async function listarSedes({ somenteAtivas = true } = {}) {
  await ensureFreshSession()

  let query = euras.from('sedes').select('id, nome, ativo, criado_em, atualizado_em')

  if (somenteAtivas) {
    query = query.eq('ativo', true)
  }

  const { data, error } = await query.order('nome', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []).map(mapSede)
}

export async function criarSede(nome) {
  await ensureFreshSession()

  const normalizedName = normalizeName(nome)
  if (!normalizedName) {
    throw new Error('Informe o nome da sede.')
  }

  const { data, error } = await euras
    .from('sedes')
    .insert({ nome: normalizedName })
    .select('id, nome, ativo, criado_em, atualizado_em')
    .single()

  if (error) {
    throw error
  }

  return mapSede(data)
}

export async function atualizarSede(sedeId, updates) {
  await ensureFreshSession()

  const payload = {}

  if (Object.prototype.hasOwnProperty.call(updates ?? {}, 'nome')) {
    const normalizedName = normalizeName(updates.nome)
    if (!normalizedName) {
      throw new Error('Informe o nome da sede.')
    }
    payload.nome = normalizedName
  }

  if (Object.prototype.hasOwnProperty.call(updates ?? {}, 'ativo')) {
    payload.ativo = Boolean(updates.ativo)
  }

  if (Object.keys(payload).length === 0) {
    throw new Error('Nenhuma alteracao informada.')
  }

  const { data, error } = await euras
    .from('sedes')
    .update(payload)
    .eq('id', sedeId)
    .select('id, nome, ativo, criado_em, atualizado_em')
    .single()

  if (error) {
    throw error
  }

  return mapSede(data)
}

export async function desativarSede(sedeId) {
  return atualizarSede(sedeId, { ativo: false })
}

export async function apagarSede(sedeId) {
  await ensureFreshSession()

  const { data, error } = await euras
    .from('sedes')
    .delete()
    .eq('id', sedeId)
    .select('id')

  if (error) {
    throw error
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Sede nao encontrada ou sem permissao para apagar.')
  }
}

export async function listarCursosPorSede(
  sedeId = null,
  { somenteAtivos = true } = {},
) {
  await ensureFreshSession()

  let query = euras
    .from('cursos')
    .select('id, sede_id, nome, ativo, criado_em, atualizado_em, sedes(nome)')

  const normalizedSedeId = normalizeId(sedeId)
  if (normalizedSedeId) {
    query = query.eq('sede_id', normalizedSedeId)
  }

  if (somenteAtivos) {
    query = query.eq('ativo', true)
  }

  const { data, error } = await query
    .order('nome', { ascending: true })
    .order('sede_id', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []).map(mapCurso)
}

export async function criarCurso({ sedeId, nome }) {
  await ensureFreshSession()

  const normalizedSedeId = normalizeId(sedeId)
  const normalizedName = normalizeName(nome)

  if (!normalizedSedeId || !normalizedName) {
    throw new Error('Informe sede e nome do curso.')
  }

  const { data, error } = await euras
    .from('cursos')
    .insert({ sede_id: normalizedSedeId, nome: normalizedName })
    .select('id, sede_id, nome, ativo, criado_em, atualizado_em, sedes(nome)')
    .single()

  if (error) {
    throw error
  }

  return mapCurso(data)
}

export async function atualizarCurso(cursoId, updates) {
  await ensureFreshSession()

  const payload = {}

  if (Object.prototype.hasOwnProperty.call(updates ?? {}, 'nome')) {
    const normalizedName = normalizeName(updates.nome)
    if (!normalizedName) {
      throw new Error('Informe o nome do curso.')
    }
    payload.nome = normalizedName
  }

  if (Object.prototype.hasOwnProperty.call(updates ?? {}, 'sedeId')) {
    const normalizedSedeId = normalizeId(updates.sedeId)
    if (!normalizedSedeId) {
      throw new Error('Informe a sede do curso.')
    }
    payload.sede_id = normalizedSedeId
  }

  if (Object.prototype.hasOwnProperty.call(updates ?? {}, 'ativo')) {
    payload.ativo = Boolean(updates.ativo)
  }

  if (Object.keys(payload).length === 0) {
    throw new Error('Nenhuma alteracao informada.')
  }

  const { data, error } = await euras
    .from('cursos')
    .update(payload)
    .eq('id', cursoId)
    .select('id, sede_id, nome, ativo, criado_em, atualizado_em, sedes(nome)')
    .single()

  if (error) {
    throw error
  }

  return mapCurso(data)
}

export async function desativarCurso(cursoId) {
  return atualizarCurso(cursoId, { ativo: false })
}

export async function apagarCurso(cursoId) {
  await ensureFreshSession()

  const { data, error } = await euras
    .from('cursos')
    .delete()
    .eq('id', cursoId)
    .select('id')

  if (error) {
    throw error
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Curso nao encontrado ou sem permissao para apagar.')
  }
}
