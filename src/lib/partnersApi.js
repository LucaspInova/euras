const MOCK_LATENCY_MS = 100

const baseSchedule = {
  week: { open: true, openHour: '06', openMinute: '00', closeHour: '18', closeMinute: '00' },
  saturday: { open: true, openHour: '08', openMinute: '00', closeHour: '13', closeMinute: '00' },
  sunday: { open: false, openHour: '00', openMinute: '00', closeHour: '00', closeMinute: '00' },
}

const initialPartners = [
  {
    id: 'partner-1',
    profileId: 'profile-1',
    name: 'CEEDS MARACANAU',
    user: 'EULA PAULA ROCHA',
    phone: '(85)98888-1001',
    email: 'maracanau@ceeds.com',
    campus: 'MARACANAU',
    imageUrl: '',
    type: 'CEEDS',
    active: true,
    schedule: baseSchedule,
  },
  {
    id: 'partner-2',
    profileId: 'profile-2',
    name: 'CEEDS REDENCAO',
    user: 'ANA BEATRIZ MOTA',
    phone: '(85)98888-1002',
    email: 'redencao@ceeds.com',
    campus: 'REDENCAO',
    imageUrl: '',
    type: 'CEEDS',
    active: true,
    schedule: {
      week: { open: true, openHour: '07', openMinute: '00', closeHour: '19', closeMinute: '00' },
      saturday: { open: true, openHour: '08', openMinute: '30', closeHour: '12', closeMinute: '30' },
      sunday: { open: false, openHour: '00', openMinute: '00', closeHour: '00', closeMinute: '00' },
    },
  },
  {
    id: 'partner-3',
    profileId: 'profile-3',
    name: 'STUDIO D PILATES',
    user: 'DANILO MORAES',
    phone: '(85)98888-2001',
    email: 'contato@studiod.com',
    campus: 'MARACANAU',
    imageUrl: '',
    type: 'EXTERNO',
    active: true,
    schedule: {
      week: { open: true, openHour: '09', openMinute: '00', closeHour: '20', closeMinute: '00' },
      saturday: { open: true, openHour: '09', openMinute: '00', closeHour: '14', closeMinute: '00' },
      sunday: { open: false, openHour: '00', openMinute: '00', closeHour: '00', closeMinute: '00' },
    },
  },
  {
    id: 'partner-4',
    profileId: 'profile-4',
    name: 'OTICA BOA VISAO',
    user: 'MARIA CLARA SOUZA',
    phone: '(85)98888-2002',
    email: 'suporte@ob.com',
    campus: 'PENTECOSTES',
    imageUrl: '',
    type: 'EXTERNO',
    active: true,
    schedule: {
      week: { open: true, openHour: '08', openMinute: '00', closeHour: '17', closeMinute: '00' },
      saturday: { open: true, openHour: '08', openMinute: '00', closeHour: '12', closeMinute: '00' },
      sunday: { open: false, openHour: '00', openMinute: '00', closeHour: '00', closeMinute: '00' },
    },
  },
  {
    id: 'partner-5',
    profileId: 'profile-5',
    name: 'ODONTOCENTER PREMIUM',
    user: 'JOAO VICENTE LIMA',
    phone: '(85)98888-2003',
    email: 'atendimento@odontocenter.com',
    campus: 'REDENCAO',
    imageUrl: '',
    type: 'EXTERNO',
    active: true,
    schedule: {
      week: { open: true, openHour: '08', openMinute: '30', closeHour: '18', closeMinute: '30' },
      saturday: { open: false, openHour: '00', openMinute: '00', closeHour: '00', closeMinute: '00' },
      sunday: { open: false, openHour: '00', openMinute: '00', closeHour: '00', closeMinute: '00' },
    },
  },
  {
    id: 'partner-6',
    profileId: 'profile-6',
    name: 'CEEDS PARACURU',
    user: 'PAULO ROBERTO ALVES',
    phone: '(85)98888-1006',
    email: 'paracuru@ceeds.com',
    campus: 'PARACURU',
    imageUrl: '',
    type: 'CEEDS',
    active: true,
    schedule: {
      week: { open: true, openHour: '07', openMinute: '30', closeHour: '19', closeMinute: '00' },
      saturday: { open: true, openHour: '08', openMinute: '00', closeHour: '13', closeMinute: '00' },
      sunday: { open: false, openHour: '00', openMinute: '00', closeHour: '00', closeMinute: '00' },
    },
  },
  {
    id: 'partner-7',
    profileId: 'profile-7',
    name: 'ACADEMIA GERAO FIT',
    user: 'RENATA SOUSA MENEZES',
    phone: '(85)98888-2004',
    email: 'contato@geraofit.com',
    campus: 'MARACANAU',
    imageUrl: '',
    type: 'EXTERNO',
    active: true,
    schedule: {
      week: { open: true, openHour: '05', openMinute: '30', closeHour: '22', closeMinute: '00' },
      saturday: { open: true, openHour: '07', openMinute: '00', closeHour: '14', closeMinute: '00' },
      sunday: { open: false, openHour: '00', openMinute: '00', closeHour: '00', closeMinute: '00' },
    },
  },
  {
    id: 'partner-8',
    profileId: 'profile-8',
    name: 'LIVRARIA SABER MAIS',
    user: 'CARLOS ALBERTO FONTENELE',
    phone: '(85)98888-2005',
    email: 'atendimento@sabermais.com',
    campus: 'REDENCAO',
    imageUrl: '',
    type: 'EXTERNO',
    active: true,
    schedule: {
      week: { open: true, openHour: '08', openMinute: '00', closeHour: '19', closeMinute: '00' },
      saturday: { open: true, openHour: '08', openMinute: '00', closeHour: '13', closeMinute: '00' },
      sunday: { open: false, openHour: '00', openMinute: '00', closeHour: '00', closeMinute: '00' },
    },
  },
  {
    id: 'partner-9',
    profileId: 'profile-9',
    name: 'STUDIO DERMACARE',
    user: 'BIANCA CASTRO RODRIGUES',
    phone: '(85)98888-2006',
    email: 'agenda@dermacare.com',
    campus: 'PENTECOSTES',
    imageUrl: '',
    type: 'EXTERNO',
    active: true,
    schedule: {
      week: { open: true, openHour: '09', openMinute: '00', closeHour: '20', closeMinute: '00' },
      saturday: { open: true, openHour: '09', openMinute: '00', closeHour: '15', closeMinute: '00' },
      sunday: { open: false, openHour: '00', openMinute: '00', closeHour: '00', closeMinute: '00' },
    },
  },
  {
    id: 'partner-10',
    profileId: 'profile-10',
    name: 'RESTAURANTE BOM SABOR',
    user: 'FERNANDA MATIAS LOPES',
    phone: '(85)98888-2007',
    email: 'contato@bombsabor.com',
    campus: 'MARACANAU',
    imageUrl: '',
    type: 'EXTERNO',
    active: true,
    schedule: {
      week: { open: true, openHour: '11', openMinute: '00', closeHour: '23', closeMinute: '00' },
      saturday: { open: true, openHour: '11', openMinute: '00', closeHour: '23', closeMinute: '30' },
      sunday: { open: true, openHour: '11', openMinute: '30', closeHour: '22', closeMinute: '00' },
    },
  },
]

const initialProducts = [
  {
    id: 'product-1',
    partnerId: 'partner-3',
    title: 'Pacote Pilates Iniciante',
    description: '4 sessoes com avaliacao inicial.',
    priceEuras: 250,
    imageUrl: '',
    active: true,
  },
  {
    id: 'product-2',
    partnerId: 'partner-4',
    title: 'Consulta Visual Completa',
    description: 'Consulta oftalmologica com triagem.',
    priceEuras: 180,
    imageUrl: '',
    active: true,
  },
  {
    id: 'product-3',
    partnerId: 'partner-5',
    title: 'Limpeza Dental',
    description: 'Sessao de profilaxia odontologica.',
    priceEuras: 220,
    imageUrl: '',
    active: true,
  },
  {
    id: 'product-4',
    partnerId: 'partner-7',
    title: 'Plano Academia Mensal',
    description: 'Acesso livre na academia por 30 dias.',
    priceEuras: 300,
    imageUrl: '',
    active: true,
  },
  {
    id: 'product-5',
    partnerId: 'partner-8',
    title: 'Kit Material Escolar',
    description: 'Caderno, canetas e lapis.',
    priceEuras: 95,
    imageUrl: '',
    active: true,
  },
  {
    id: 'product-6',
    partnerId: 'partner-9',
    title: 'Limpeza de Pele',
    description: 'Sessao de limpeza de pele completa.',
    priceEuras: 185,
    imageUrl: '',
    active: true,
  },
  {
    id: 'product-7',
    partnerId: 'partner-10',
    title: 'Prato Executivo',
    description: 'Refeicao completa no almoco.',
    priceEuras: 70,
    imageUrl: '',
    active: true,
  },
  {
    id: 'product-8',
    partnerId: 'partner-3',
    title: 'Aula Avulsa Pilates',
    description: 'Sessao individual com instrutor.',
    priceEuras: 90,
    imageUrl: '',
    active: true,
  },
  {
    id: 'product-9',
    partnerId: 'partner-4',
    title: 'Lentes Com Desconto',
    description: 'Desconto em lentes selecionadas.',
    priceEuras: 210,
    imageUrl: '',
    active: true,
  },
]

const initialCatalogProducts = [
  {
    id: 'catalog-product-1',
    name: 'Bolsa 50%',
    institution: 'Ceeds Maracanau',
    description: 'Bolsa parcial para mensalidades.',
    priceEuras: 80,
    imageUrl: '',
    active: true,
  },
  {
    id: 'catalog-product-2',
    name: 'Lavagem de aparelho -50%',
    institution: 'Odonto Center Pacajus',
    description: 'Lavagem e higienizacao de aparelho.',
    priceEuras: 35,
    imageUrl: '',
    active: true,
  },
  {
    id: 'catalog-product-3',
    name: 'Armacao -10%',
    institution: 'Otica do Brasileiro',
    description: 'Desconto em armacao selecionada.',
    priceEuras: 90,
    imageUrl: '',
    active: true,
  },
  {
    id: 'catalog-product-4',
    name: 'Alisamento cabelo -20%',
    institution: 'Studio D Tiago Mello',
    description: 'Desconto no procedimento completo.',
    priceEuras: 120,
    imageUrl: '',
    active: true,
  },
  {
    id: 'catalog-product-5',
    name: 'Feijoada Bom Sabor 33%',
    institution: 'Restaurante Bom Sabor',
    description: 'Prato principal com acompanhamento.',
    priceEuras: 75,
    imageUrl: '',
    active: true,
  },
  {
    id: 'catalog-product-6',
    name: 'Hamburguer da Casa 50%',
    institution: 'Restaurante Bom Sabor',
    description: 'Burger artesanal com batata.',
    priceEuras: 60,
    imageUrl: '',
    active: true,
  },
  {
    id: 'catalog-product-7',
    name: 'Corte social',
    institution: 'Studio Dermacare',
    description: 'Corte de cabelo com finalizacao.',
    priceEuras: 55,
    imageUrl: '',
    active: true,
  },
  {
    id: 'catalog-product-8',
    name: 'Sombrancelha',
    institution: 'Studio Dermacare',
    description: 'Design de sombrancelhas.',
    priceEuras: 35,
    imageUrl: '',
    active: true,
  },
  {
    id: 'catalog-product-9',
    name: 'Barba modelada',
    institution: 'Studio Dermacare',
    description: 'Modelagem de barba com toalha quente.',
    priceEuras: 40,
    imageUrl: '',
    active: true,
  },
  {
    id: 'catalog-product-10',
    name: 'Hidratacao capilar',
    institution: 'Studio Dermacare',
    description: 'Tratamento de hidratacao profunda.',
    priceEuras: 48,
    imageUrl: '',
    active: true,
  },
  {
    id: 'catalog-product-11',
    name: 'Pacote academia trimestral',
    institution: 'Academia Gerao Fit',
    description: 'Plano trimestral com avaliacao fisica.',
    priceEuras: 720,
    imageUrl: '',
    active: true,
  },
  {
    id: 'catalog-product-12',
    name: 'Combo cadernos universitarios',
    institution: 'Livraria Saber Mais',
    description: 'Pacote com 5 cadernos universitarios.',
    priceEuras: 110,
    imageUrl: '',
    active: true,
  },
]

let partners = initialPartners.map((partner) => ({
  ...partner,
  schedule: cloneSchedule(partner.schedule),
}))
let products = initialProducts.map((product) => ({ ...product }))
let catalogProducts = initialCatalogProducts.map((product) => ({ ...product }))
let nextPartnerNumber = initialPartners.length + 1
let nextProductNumber = initialProducts.length + 1
let nextCatalogProductNumber = initialCatalogProducts.length + 1

function sleep() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_LATENCY_MS)
  })
}

function normalizeTypeToGroup(partner) {
  const type = String(partner.type ?? '').toLowerCase()
  const name = String(partner.name ?? '').toLowerCase()

  if (type.includes('ceeds') || name.startsWith('ceeds')) {
    return 'ceeds'
  }

  return 'external'
}

function normalizeLogo(partner) {
  if (normalizeTypeToGroup(partner) === 'ceeds') {
    return { logo: 'CEEDS', variant: 'light' }
  }

  const name = String(partner.name ?? '')
  const loweredName = name.toLowerCase()

  if (loweredName.includes('studio')) {
    return { logo: 'Studio D', variant: 'black' }
  }

  if (loweredName.includes('otica')) {
    return { logo: 'OB', variant: 'blue' }
  }

  if (loweredName.includes('odonto')) {
    return { logo: 'OdontoCenter', variant: 'light' }
  }

  return { logo: name || 'Parceiro', variant: 'light' }
}

function normalizeHour(value) {
  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) return '00'
  return String(Math.max(0, Math.min(23, numericValue))).padStart(2, '0')
}

function normalizeMinute(value) {
  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) return '00'
  return String(Math.max(0, Math.min(59, numericValue))).padStart(2, '0')
}

function normalizeSchedule(schedule) {
  const source = schedule ?? {}

  const normalizeItem = (key, fallbackOpen) => {
    const item = source[key] ?? {}

    return {
      open: typeof item.open === 'boolean' ? item.open : fallbackOpen,
      openHour: normalizeHour(item.openHour ?? '06'),
      openMinute: normalizeMinute(item.openMinute ?? '00'),
      closeHour: normalizeHour(item.closeHour ?? '18'),
      closeMinute: normalizeMinute(item.closeMinute ?? '00'),
    }
  }

  return {
    week: normalizeItem('week', true),
    saturday: normalizeItem('saturday', true),
    sunday: normalizeItem('sunday', false),
  }
}

function cloneSchedule(schedule) {
  return normalizeSchedule(schedule)
}

function mapPartner(partner) {
  const visual = normalizeLogo(partner)

  return {
    id: partner.id,
    profileId: partner.profileId ?? null,
    name: partner.name ?? '',
    user: partner.user ?? '',
    phone: partner.phone ?? '',
    email: partner.email ?? '',
    campus: partner.campus ?? '',
    imageUrl: partner.imageUrl ?? '',
    group: normalizeTypeToGroup(partner),
    logo: visual.logo,
    variant: visual.variant,
    active: partner.active ?? true,
  }
}

function getPartnerIndex(partnerId) {
  return partners.findIndex((partner) => String(partner.id) === String(partnerId) && partner.active)
}

function getProductIndex(partnerId, productId) {
  return products.findIndex(
    (product) =>
      String(product.partnerId) === String(partnerId) &&
      String(product.id) === String(productId) &&
      product.active,
  )
}

function getCatalogProductIndex(productId) {
  return catalogProducts.findIndex(
    (product) => String(product.id) === String(productId) && product.active,
  )
}

function parseEurasValue(value) {
  if (typeof value === 'number') {
    return value
  }

  const raw = String(value ?? '').trim().replace(/\s+/g, '')
  if (!raw) return Number.NaN

  let normalized = raw

  if (raw.includes(',') && raw.includes('.')) {
    normalized = raw.replace(/\./g, '').replace(',', '.')
  } else if (raw.includes(',')) {
    normalized = raw.replace(',', '.')
  }

  return Number(normalized)
}

function mapCatalogProduct(product) {
  return {
    id: product.id,
    name: product.name ?? '',
    institution: product.institution ?? '',
    description: product.description ?? '',
    priceEuras: product.priceEuras ?? 0,
    imageUrl: product.imageUrl ?? '',
  }
}

export function getPartnerApiErrorMessage(error) {
  const message = error?.message ?? ''

  if (!message) {
    return 'Nao foi possivel concluir a operacao com os dados mockados de parceiros.'
  }

  if (message.toLowerCase().includes('nao encontrado')) {
    return 'Registro nao encontrado na base mockada.'
  }

  return message
}

export async function listPartners() {
  await sleep()

  return partners
    .filter((partner) => partner.active)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(mapPartner)
}

export async function getPartnerById(partnerId) {
  await sleep()

  const partner = partners.find((item) => String(item.id) === String(partnerId) && item.active)
  if (!partner) {
    return null
  }

  return {
    ...mapPartner(partner),
    schedule: cloneSchedule(partner.schedule),
  }
}

export async function createPartner({ name, user, phone, email, campus, schedule }) {
  await sleep()

  const normalizedName = name?.trim().toUpperCase() ?? ''
  if (!normalizedName) {
    throw new Error('Informe o nome da instituicao.')
  }

  const partnerId = `partner-${nextPartnerNumber}`
  const isCeeds = normalizedName.startsWith('CEEDS')

  partners.push({
    id: partnerId,
    profileId: `profile-${nextPartnerNumber}`,
    name: normalizedName,
    user: user?.trim().toUpperCase() ?? '',
    phone: phone?.trim() ?? '',
    email: email?.trim() ?? '',
    campus: campus?.trim().toUpperCase() ?? '',
    imageUrl: '',
    type: isCeeds ? 'CEEDS' : 'EXTERNO',
    active: true,
    schedule: normalizeSchedule(schedule),
  })

  nextPartnerNumber += 1
  return partnerId
}

export async function updatePartner(partnerId, { name, user, phone, email, campus, schedule }) {
  await sleep()

  const index = getPartnerIndex(partnerId)
  if (index < 0) {
    throw new Error('Parceiro nao encontrado.')
  }

  partners[index] = {
    ...partners[index],
    name: name?.trim().toUpperCase() || partners[index].name,
    user: user?.trim().toUpperCase() ?? '',
    phone: phone?.trim() ?? '',
    email: email?.trim() ?? '',
    campus: campus?.trim().toUpperCase() ?? '',
    schedule: normalizeSchedule(schedule),
  }
}

export async function removePartner(partnerId) {
  await sleep()

  const index = getPartnerIndex(partnerId)
  if (index < 0) {
    throw new Error('Parceiro nao encontrado.')
  }

  partners[index] = {
    ...partners[index],
    active: false,
  }
}

export async function listPartnerProducts(partnerId) {
  const partner = await getPartnerById(partnerId)

  if (!partner) {
    return { partner: null, products: [] }
  }

  await sleep()

  const partnerProducts = products
    .filter((product) => String(product.partnerId) === String(partner.id) && product.active)
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((product) => ({
      id: product.id,
      name: product.title ?? '',
      description: product.description ?? '',
      priceEuras: product.priceEuras ?? 0,
      imageUrl: product.imageUrl ?? '',
      partnerName: partner.name,
    }))

  return { partner, products: partnerProducts }
}

export async function createPartnerProduct(partnerId, { title, description, priceEuras, imageUrl }) {
  const partner = await getPartnerById(partnerId)
  if (!partner) {
    throw new Error('Parceiro nao encontrado.')
  }

  const normalizedTitle = title?.trim() ?? ''
  if (!normalizedTitle) {
    throw new Error('Informe o titulo do produto.')
  }

  const numericPrice = Number(priceEuras)
  if (Number.isNaN(numericPrice) || numericPrice < 0) {
    throw new Error('Informe um preco de Euras valido.')
  }

  await sleep()

  products.push({
    id: `product-${nextProductNumber}`,
    partnerId: partner.id,
    title: normalizedTitle,
    description: description?.trim() ?? '',
    priceEuras: numericPrice,
    imageUrl: imageUrl?.trim() ?? '',
    active: true,
  })

  nextProductNumber += 1
}

export async function getPartnerProductById(partnerId, productId) {
  const partner = await getPartnerById(partnerId)
  if (!partner) {
    return null
  }

  await sleep()

  const product = products.find(
    (item) =>
      String(item.partnerId) === String(partnerId) &&
      String(item.id) === String(productId) &&
      item.active,
  )

  if (!product) {
    return null
  }

  return {
    id: product.id,
    title: product.title ?? '',
    description: product.description ?? '',
    priceEuras: product.priceEuras ?? 0,
    imageUrl: product.imageUrl ?? '',
    partnerId: partner.id,
    partnerName: partner.name,
  }
}

export async function updatePartnerProduct(partnerId, productId, { title, description, priceEuras, imageUrl }) {
  const partner = await getPartnerById(partnerId)
  if (!partner) {
    throw new Error('Parceiro nao encontrado.')
  }

  const index = getProductIndex(partnerId, productId)
  if (index < 0) {
    throw new Error('Produto nao encontrado.')
  }

  const numericPrice = Number(priceEuras)
  if (Number.isNaN(numericPrice) || numericPrice < 0) {
    throw new Error('Informe um preco de Euras valido.')
  }

  await sleep()

  products[index] = {
    ...products[index],
    title: title?.trim() || products[index].title,
    description: description?.trim() ?? '',
    priceEuras: numericPrice,
    imageUrl: imageUrl?.trim() ?? '',
  }
}

export async function removePartnerProduct(partnerId, productId) {
  const partner = await getPartnerById(partnerId)
  if (!partner) {
    throw new Error('Parceiro nao encontrado.')
  }

  const index = getProductIndex(partnerId, productId)
  if (index < 0) {
    throw new Error('Produto nao encontrado.')
  }

  await sleep()

  products[index] = {
    ...products[index],
    active: false,
  }
}

export async function listProducts() {
  await sleep()

  return catalogProducts
    .filter((product) => product.active)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(mapCatalogProduct)
}

export async function createProduct({ name, institution, description, priceEuras, imageUrl }) {
  const normalizedName = name?.trim() ?? ''
  if (!normalizedName) {
    throw new Error('Informe o nome do produto.')
  }

  const normalizedInstitution = institution?.trim() ?? ''
  if (!normalizedInstitution) {
    throw new Error('Informe a instituicao do produto.')
  }

  const numericPrice = parseEurasValue(priceEuras)
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    throw new Error('Informe um valor valido para o produto.')
  }

  await sleep()

  catalogProducts.push({
    id: `catalog-product-${nextCatalogProductNumber}`,
    name: normalizedName,
    institution: normalizedInstitution,
    description: description?.trim() ?? '',
    priceEuras: numericPrice,
    imageUrl: imageUrl?.trim() ?? '',
    active: true,
  })

  nextCatalogProductNumber += 1
}

export async function getProductById(productId) {
  await sleep()

  const product = catalogProducts.find(
    (item) => String(item.id) === String(productId) && item.active,
  )

  return product ? mapCatalogProduct(product) : null
}

export async function updateProduct(productId, { name, institution, description, priceEuras, imageUrl }) {
  const index = getCatalogProductIndex(productId)
  if (index < 0) {
    throw new Error('Produto nao encontrado.')
  }

  const normalizedName = name?.trim() ?? ''
  if (!normalizedName) {
    throw new Error('Informe o nome do produto.')
  }

  const normalizedInstitution = institution?.trim() ?? ''
  if (!normalizedInstitution) {
    throw new Error('Informe a instituicao do produto.')
  }

  const numericPrice = parseEurasValue(priceEuras)
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    throw new Error('Informe um valor valido para o produto.')
  }

  await sleep()

  catalogProducts[index] = {
    ...catalogProducts[index],
    name: normalizedName,
    institution: normalizedInstitution,
    description: description?.trim() ?? '',
    priceEuras: numericPrice,
    imageUrl: imageUrl?.trim() ?? '',
  }
}

export async function removeProduct(productId) {
  const index = getCatalogProductIndex(productId)
  if (index < 0) {
    throw new Error('Produto nao encontrado.')
  }

  await sleep()

  catalogProducts[index] = {
    ...catalogProducts[index],
    active: false,
  }
}
