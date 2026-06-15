import { ensureFreshSession, supabase } from './supabase'

const euras = supabase.schema('euras')

const emptyHome = {
  profile: null,
  summary: null,
  pendingRedemptions: [],
  products: [],
}

const asArray = (value) => (Array.isArray(value) ? value : [])

export function mapStudentProfile(profile) {
  if (!profile) return null

  return {
    id: profile.id,
    full_name: profile.nome_completo ?? profile.full_name ?? '',
    email: profile.email ?? '',
    role: profile.papel ?? profile.role ?? '',
    avatar_url: profile.url_avatar ?? profile.avatar_url ?? '',
    telefone: profile.telefone ?? '',
    campus: profile.campus ?? '',
    curso: profile.curso ?? '',
    ativo: profile.ativo,
  }
}

function mapSummary(saldo, studentId) {
  if (!saldo) return null

  return {
    student_id: studentId,
    total: Number(saldo.total ?? 0),
    reserved: Number(saldo.reservado ?? 0),
    available: Number(saldo.disponivel ?? 0),
  }
}

export function mapStudentProduct(product) {
  if (!product) return null

  const partner = product.parceiro || {}

  return {
    id: product.id,
    title: product.titulo,
    description: product.descricao,
    price_euras: Number(product.preco_euras ?? 0),
    image_url: product.url_imagem,
    partner_profile_id: product.perfil_parceiro_id,
    partner: {
      id: partner.id || product.perfil_parceiro_id,
      full_name:
        partner.nome || partner.nome_instituicao || partner.nome_completo || 'Parceiro',
      avatar_url: partner.url_imagem || partner.url_avatar || '',
    },
  }
}

function mapRedemption(redemption) {
  if (!redemption) return null

  return {
    id: redemption.id,
    amount_euras: Number(redemption.valor_euras ?? 0),
    provider: redemption.provedor || 'app',
    created_at: redemption.criado_em,
    status: redemption.status,
    product_id: redemption.produto_id,
    product_title: redemption.produto_titulo,
    partner_profile_id: redemption.parceiro_id,
    partner_name: redemption.parceiro_nome,
    partner_image_url: redemption.parceiro_url_imagem,
  }
}

function mapLedgerItem(item) {
  const signedValue = Number(item?.valor_assinado ?? 0)
  const isCredit = signedValue >= 0

  return {
    id: item.id,
    entry_type: isCredit ? 'credit' : 'debit',
    tipo: item.tipo,
    amount: Math.abs(Number(item.valor ?? signedValue ?? 0)),
    signed_amount: signedValue,
    note: item.observacao,
    created_at: item.criado_em,
    redemption_id: item.resgate_id,
  }
}

export async function getStudentHome() {
  await ensureFreshSession()

  const { data, error } = await euras.rpc('app_aluno_home')
  if (error) throw error
  if (!data) return emptyHome

  return {
    profile: mapStudentProfile(data.perfil),
    summary: mapSummary(data.saldo, data.perfil?.id),
    pendingRedemptions: asArray(data.resgates_pendentes).map(mapRedemption).filter(Boolean),
    products: asArray(data.produtos).map(mapStudentProduct).filter(Boolean),
  }
}

export async function getStudentCatalog() {
  await ensureFreshSession()

  const { data, error } = await euras.rpc('app_aluno_catalogo')
  if (error) throw error

  return asArray(data).map(mapStudentProduct).filter(Boolean)
}

export async function getStudentStatement({ limit = 20, cursor = null } = {}) {
  await ensureFreshSession()

  const { data, error } = await euras.rpc('app_aluno_extrato', {
    limit,
    cursor,
  })
  if (error) throw error

  return {
    items: asArray(data?.items).map(mapLedgerItem),
    nextCursor: data?.next_cursor || null,
  }
}

export async function requestProductRedemption(productId) {
  await ensureFreshSession()

  const { data, error } = await euras.rpc('app_aluno_solicitar_resgate', {
    produto_id: productId,
  })
  if (error) throw error

  return mapRedemption(data)
}

export async function cancelStudentRedemption(redemptionId) {
  await ensureFreshSession()

  const { data, error } = await euras.rpc('app_aluno_cancelar_resgate', {
    resgate_id: redemptionId,
  })
  if (error) throw error

  return mapRedemption(data)
}

export async function uploadStudentAvatar(profileId, file) {
  if (!profileId) {
    throw new Error('Perfil do aluno nao encontrado.')
  }

  if (!file) {
    throw new Error('Selecione uma imagem.')
  }

  await ensureFreshSession()

  const rawExtension = file.name?.split('.').pop()?.toLowerCase() || ''
  const cleanExtension = rawExtension.replace(/[^a-z0-9]/g, '')
  const fileExtension = cleanExtension || (file.type?.includes('png') ? 'png' : 'jpg')
  const filePath = `${profileId}/avatar-${Date.now()}.${fileExtension}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'image/jpeg',
    })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
  const publicUrl = data?.publicUrl

  if (!publicUrl) {
    throw new Error('Nao foi possivel obter a URL publica da imagem.')
  }

  const { error: profileError } = await euras
    .from('perfis')
    .update({ url_avatar: publicUrl })
    .eq('id', profileId)

  if (profileError) throw profileError

  return publicUrl
}
