# Produção Redesign — Categorias MP + OP por Produto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atualizar as categorias de matéria-prima para as 6 categorias reais da Patricia Carreira e redesenhar as ordens de produção para um modelo de um card por produto com checklist de materiais em Kanban.

**Architecture:** A migration 011 trunca os dados de teste e reestrutura `raw_materials` (novas categorias) e `production_orders` (elimina tipo corte/acabamento, torna OP diretamente ligada a um `product_variant`). O Kanban em `/admin/producao` exibe cards por OP onde Henrique dá check nas categorias de material conforme vai avançando. O fluxo de atacado passa a gerar uma OP por variante de produto.

**Tech Stack:** Next.js 15 App Router · Supabase PostgreSQL · TypeScript strict · Tailwind CSS · shadcn/ui · Server Actions

---

## File Map

| File | Action | Responsabilidade |
|------|--------|-----------------|
| `supabase/migrations/011_production_redesign.sql` | Criar | Schema changes: categorias MP, OP por produto, minimum_batch_qty |
| `lib/supabase/admin-queries.ts` | Modificar | Tipos `ProductionOrderRow`, `RawMaterialRow`; query `getProductionOrders` |
| `lib/actions/production.ts` | Modificar | `createManualProductionOrder`, `advanceProductionOrderStatus`, novo `checkAndSetMaterials`, novo `toggleMaterialCheck` |
| `lib/actions/wholesale.ts` | Modificar | `SuggestedOP` simplificado, `createProductionOrders` gera 1 OP por variante |
| `components/admin/materias-client.tsx` | Modificar | `CATEGORIES` + `SUBCATEGORIES_BY_CATEGORY` + lógica dinâmica de subcategoria no form |
| `components/admin/producao-client.tsx` | Reescrever | Kanban 4 colunas + card por OP + modal de checklist de materiais |
| `app/admin/producao/page.tsx` | Modificar leve | Ajustar props passadas ao `ProducaoClient` |

---

## Task 1: Migration 011 — Schema changes

**Files:**
- Create: `supabase/migrations/011_production_redesign.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- ====================================================
-- Migration 011: Redesign de produção + categorias MP
-- ====================================================
-- Todos os dados de teste são truncados pois nenhum dado
-- real foi inserido ainda (confirmado com o Henrique).

-- ── 1. Limpa dados de teste ───────────────────────────

TRUNCATE TABLE public.production_order_items CASCADE;
TRUNCATE TABLE public.production_orders CASCADE;
TRUNCATE TABLE public.raw_materials CASCADE;

-- ── 2. Remove tabela production_order_items ───────────
-- Dados agora ficam diretamente na production_orders

DROP TABLE IF EXISTS public.production_order_items;

-- ── 3. Redesenha production_orders ───────────────────

-- Remove colunas do modelo antigo
ALTER TABLE public.production_orders
  DROP COLUMN IF EXISTS type,
  DROP COLUMN IF EXISTS depends_on_op_id;

-- Remove constraint de status antiga (incluía 'materials_checked')
ALTER TABLE public.production_orders
  DROP CONSTRAINT IF EXISTS production_orders_status_check;

-- Adiciona colunas do modelo novo (OP por produto)
ALTER TABLE public.production_orders
  ADD COLUMN product_variant_id uuid
    REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  ADD COLUMN quantity_requested integer NOT NULL DEFAULT 1
    CHECK (quantity_requested > 0),
  ADD COLUMN quantity_produced integer NOT NULL DEFAULT 0
    CHECK (quantity_produced >= 0),
  ADD COLUMN materials_sufficient boolean,
  -- JSON: [{material_id, material_name, category, needed, available, missing, unit, couro_bruto_available}]
  ADD COLUMN missing_materials jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- JSON: {"Bordado": false, "Couro": false, ...} — check manual do Henrique por categoria
  ADD COLUMN material_checks jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Nova constraint de status sem 'materials_checked'
ALTER TABLE public.production_orders
  ADD CONSTRAINT production_orders_status_check
  CHECK (status IN ('draft', 'approved', 'in_progress', 'completed', 'cancelled'));

-- product_variant_id obrigatório em novas OPs
-- (sem NOT NULL para não quebrar rows existentes — mas o app sempre envia)

-- ── 4. Atualiza categorias de raw_materials ───────────

ALTER TABLE public.raw_materials
  DROP CONSTRAINT IF EXISTS raw_materials_category_check;

ALTER TABLE public.raw_materials
  ADD CONSTRAINT raw_materials_category_check
  CHECK (category IN ('Bordado', 'Couro', 'Metais', 'Forro', 'Lona', 'Aviamentos'));

-- ── 5. Mínimo de lote por produto ────────────────────

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS minimum_batch_qty integer NOT NULL DEFAULT 1
    CHECK (minimum_batch_qty > 0);

-- ── 6. Grants ─────────────────────────────────────────

GRANT ALL ON public.production_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_orders TO authenticated;
```

- [ ] **Step 2: Aplicar a migration via Supabase MCP**

Usar `mcp__032a0a80__apply_migration` com o project_id `jlsilusbprrndtjlgecv` e o conteúdo acima. Verificar que retorna sem erros.

- [ ] **Step 3: Confirmar schema via list_tables**

Rodar `mcp__032a0a80__execute_sql` com:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'production_orders'
ORDER BY ordinal_position;
```
Esperado: colunas `product_variant_id`, `quantity_requested`, `quantity_produced`, `materials_sufficient`, `missing_materials`, `material_checks` presentes. Colunas `type` e `depends_on_op_id` ausentes.

- [ ] **Step 4: Confirmar constraint de categories**

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'raw_materials'::regclass AND contype = 'c';
```
Esperado: constraint incluindo `'Bordado', 'Couro', 'Metais', 'Forro', 'Lona', 'Aviamentos'`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/011_production_redesign.sql
git commit -m "feat: migration 011 — redesign production orders + update MP categories"
```

---

## Task 2: Atualizar tipos e queries (admin-queries.ts)

**Files:**
- Modify: `lib/supabase/admin-queries.ts`

- [ ] **Step 1: Atualizar `MissingMaterialEntry` para incluir campos do modelo novo**

Localizar e substituir o tipo `MissingMaterialEntry` (linha ~385):

```typescript
export type MissingMaterialEntry = {
  material_id: string
  material_name: string
  category: string          // novo: 'Bordado' | 'Couro' | 'Metais' | 'Forro' | 'Lona' | 'Aviamentos'
  needed: number
  available: number
  missing: number
  unit: string
  couro_bruto_available: number | null  // novo: metros de couro bruto disponível, só para categoria Couro
}
```

- [ ] **Step 2: Remover `ProductionOrderItemRow` e simplificar `ProductionOrderRow`**

Remover a definição de `ProductionOrderItemRow` inteira (era o tipo dos itens).

Substituir `ProductionOrderRow` (linha ~406):

```typescript
export type ProductionOrderRow = {
  id: string
  order_id: string | null
  customer_name: string | null
  product_variant_id: string | null
  variant_sku: string | null
  variant_label: string | null   // "Nome do Produto — Cor — Tamanho"
  quantity_requested: number
  quantity_produced: number
  materials_sufficient: boolean | null
  missing_materials: MissingMaterialEntry[]
  material_checks: Record<string, boolean>  // {"Bordado": false, "Couro": true}
  status: string
  notes: string | null
  created_by: string
  created_at: string
}
```

- [ ] **Step 3: Reescrever `getProductionOrders`**

Substituir a função `getProductionOrders` (linha ~419):

```typescript
export async function getProductionOrders(limit = 50): Promise<ProductionOrderRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('production_orders')
    .select(`
      id, order_id, product_variant_id, quantity_requested, quantity_produced,
      materials_sufficient, missing_materials, material_checks,
      status, notes, created_by, created_at,
      order:orders(customer:customers(name)),
      variant:product_variants(sku, size, color, product:products(name))
    `)
    .not('status', 'eq', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getProductionOrders]', error)
    return []
  }

  type VariantRaw = {
    sku: string; size: string | null; color: string | null
    product: { name: string } | null
  } | null

  type OrderRaw = {
    id: string; order_id: string | null; product_variant_id: string | null
    quantity_requested: number; quantity_produced: number
    materials_sufficient: boolean | null
    missing_materials: MissingMaterialEntry[] | null
    material_checks: Record<string, boolean> | null
    status: string; notes: string | null; created_by: string; created_at: string
    order: { customer: { name: string } | null } | null
    variant: VariantRaw
  }

  return ((data ?? []) as unknown as OrderRaw[]).map((o) => {
    const v = o.variant
    const productName = v?.product?.name ?? 'Produto'
    const parts = [v?.color, v?.size].filter(Boolean).join(' — ')
    const variantLabel = parts ? `${productName} — ${parts}` : productName

    return {
      id: o.id,
      order_id: o.order_id,
      customer_name: o.order?.customer?.name ?? null,
      product_variant_id: o.product_variant_id,
      variant_sku: v?.sku ?? null,
      variant_label: variantLabel,
      quantity_requested: o.quantity_requested,
      quantity_produced: o.quantity_produced,
      materials_sufficient: o.materials_sufficient,
      missing_materials: o.missing_materials ?? [],
      material_checks: o.material_checks ?? {},
      status: o.status,
      notes: o.notes,
      created_by: o.created_by,
      created_at: o.created_at,
    }
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/admin-queries.ts
git commit -m "refactor: update ProductionOrderRow type + query for per-product OP model"
```

---

## Task 3: Atualizar actions de produção (production.ts)

**Files:**
- Modify: `lib/actions/production.ts`

- [ ] **Step 1: Reescrever `createManualProductionOrder`**

Substituir a função inteira:

```typescript
export type CreateManualOPInput = {
  product_variant_id: string
  quantity: number
  order_id: string | null
  notes: string | null
}

export async function createManualProductionOrder(
  input: CreateManualOPInput,
): Promise<CreateOPResult> {
  const supabase = createServiceClient()

  const { data: po, error: poErr } = await supabase
    .from('production_orders')
    .insert({
      product_variant_id: input.product_variant_id,
      quantity_requested: input.quantity,
      order_id: input.order_id,
      status: 'draft',
      notes: input.notes,
      created_by: 'henrique',
    })
    .select('id')
    .single()

  if (poErr || !po) {
    return { success: false, error: poErr?.message ?? 'Erro ao criar OP' }
  }

  // Calcula disponibilidade de materiais imediatamente após criar
  await checkAndSetMaterials(po.id)

  revalidatePath('/admin/producao')
  return { success: true, op_ids: [po.id] }
}
```

- [ ] **Step 2: Adicionar `checkAndSetMaterials`**

Adicionar após `createManualProductionOrder`:

```typescript
export type CheckMaterialsResult =
  | { success: true }
  | { success: false; error: string }

export async function checkAndSetMaterials(opId: string): Promise<CheckMaterialsResult> {
  const supabase = createServiceClient()

  // Busca OP com variant_id e quantity
  const { data: op, error: opErr } = await supabase
    .from('production_orders')
    .select('product_variant_id, quantity_requested')
    .eq('id', opId)
    .single()

  if (opErr || !op?.product_variant_id) {
    return { success: false, error: 'OP ou variante não encontrada' }
  }

  // Busca BOM da variante
  const { data: bom, error: bomErr } = await supabase
    .from('bill_of_materials')
    .select(`
      quantity_needed,
      material:raw_materials(id, name, category, subcategory, unit, stock_quantity)
    `)
    .eq('product_variant_id', op.product_variant_id)

  if (bomErr) return { success: false, error: bomErr.message }

  if (!bom || bom.length === 0) {
    // Sem BOM: marca como suficiente (nada falta)
    await supabase
      .from('production_orders')
      .update({ materials_sufficient: true, missing_materials: [], material_checks: {} })
      .eq('id', opId)
    return { success: true }
  }

  type BomRow = {
    quantity_needed: number
    material: {
      id: string; name: string; category: string
      subcategory: string | null; unit: string; stock_quantity: number
    } | null
  }

  const missing: MissingMaterialEntry[] = []
  const checksInit: Record<string, boolean> = {}

  for (const row of bom as unknown as BomRow[]) {
    const mat = row.material
    if (!mat) continue

    const needed = row.quantity_needed * op.quantity_requested
    const available = Number(mat.stock_quantity)
    const category = mat.category

    if (!checksInit[category]) checksInit[category] = false

    if (available >= needed) continue  // suficiente → não entra no missing

    // Caso especial: Couro sem laser — verifica se tem bruto
    let couroBrutoAvailable: number | null = null
    if (category === 'Couro' && mat.subcategory === 'com laser') {
      const { data: bruto } = await supabase
        .from('raw_materials')
        .select('stock_quantity')
        .eq('category', 'Couro')
        .eq('subcategory', 'bruto')
        .maybeSingle()
      couroBrutoAvailable = bruto ? Number(bruto.stock_quantity) : 0
    }

    missing.push({
      material_id: mat.id,
      material_name: mat.name,
      category,
      needed,
      available,
      missing: needed - available,
      unit: mat.unit,
      couro_bruto_available: couroBrutoAvailable,
    })
  }

  const sufficient = missing.length === 0

  await supabase
    .from('production_orders')
    .update({
      materials_sufficient: sufficient,
      missing_materials: missing,
      material_checks: checksInit,
    })
    .eq('id', opId)

  return { success: true }
}
```

Também adicionar o import do tipo no topo do arquivo (se não existir):
```typescript
import type { MissingMaterialEntry } from '@/lib/supabase/admin-queries'
```

- [ ] **Step 3: Adicionar `toggleMaterialCheck`**

```typescript
export type ToggleCheckResult =
  | { success: true }
  | { success: false; error: string }

export async function toggleMaterialCheck(
  opId: string,
  category: string,
  checked: boolean,
): Promise<ToggleCheckResult> {
  const supabase = createServiceClient()

  const { data: op, error: fetchErr } = await supabase
    .from('production_orders')
    .select('material_checks')
    .eq('id', opId)
    .single()

  if (fetchErr || !op) {
    return { success: false, error: 'OP não encontrada' }
  }

  const updated = { ...(op.material_checks as Record<string, boolean>), [category]: checked }

  const { error: updateErr } = await supabase
    .from('production_orders')
    .update({ material_checks: updated })
    .eq('id', opId)

  if (updateErr) return { success: false, error: updateErr.message }

  revalidatePath('/admin/producao')
  return { success: true }
}
```

- [ ] **Step 4: Simplificar `advanceProductionOrderStatus`**

Atualizar `STATUS_TRANSITIONS` (remover `materials_checked`):

```typescript
const STATUS_TRANSITIONS: Record<string, string> = {
  draft: 'approved',
  approved: 'in_progress',
  in_progress: 'completed',
}
```

- [ ] **Step 5: Remover `createProductionOrders` (a função complexa de OPs múltiplas)**

A função `createProductionOrders` que recebia `CreateOPInput` com array de `SuggestedOP` não é mais necessária — o atacado vai chamar `createManualProductionOrder` por variante. Remover a função e os tipos `CreateOPInput` e `SuggestedOP` do arquivo.

- [ ] **Step 6: Commit**

```bash
git add lib/actions/production.ts
git commit -m "refactor: production actions — OP per product, checkAndSetMaterials, toggleMaterialCheck"
```

---

## Task 4: Atualizar criação de OPs no fluxo de atacado (wholesale.ts)

**Files:**
- Modify: `lib/actions/wholesale.ts`

- [ ] **Step 1: Remover tipos obsoletos**

Remover de `wholesale.ts`:
- `SuggestedOP` (movido/simplificado)
- `BomItemCheck` (não mais necessário na response do atacado)

Simplificar `ItemCheckResult` — o campo `suggested_ops` não precisa mais existir. Remover ou manter vazio. Manter `items_to_purchase` (ainda útil).

- [ ] **Step 2: Criar OPs por variante após pedido atacado**

Localizar onde `createProductionOrders` era chamado no fluxo (ou onde `suggested_ops` era usado no cliente de atacado). O novo fluxo: após criar o pedido atacado, para cada item que precisa de produção (`quantity_to_produce > 0`), chamar `createManualProductionOrder`.

No arquivo `wholesale.ts`, após a inserção do pedido, adicionar:

```typescript
import { createManualProductionOrder } from '@/lib/actions/production'

// Dentro de createWholesaleOrder, após inserir order_items:
for (const check of checkResults) {
  if (check.quantity_to_produce > 0) {
    await createManualProductionOrder({
      product_variant_id: check.variant_id,
      quantity: check.quantity_to_produce,
      order_id: order.id,
      notes: null,
    })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/actions/wholesale.ts
git commit -m "refactor: wholesale flow creates one OP per variant instead of split corte/acabamento"
```

---

## Task 5: Atualizar formulário de matéria-prima (materias-client.tsx)

**Files:**
- Modify: `components/admin/materias-client.tsx`

- [ ] **Step 1: Substituir a lista de categorias e adicionar mapa de subcategorias**

No topo do arquivo, substituir a linha com `const CATEGORIES`:

```typescript
const CATEGORIES = ['Bordado', 'Couro', 'Metais', 'Forro', 'Lona', 'Aviamentos'] as const
type Category = typeof CATEGORIES[number]

const SUBCATEGORIES: Record<Category, string[]> = {
  Bordado: [],  // campo livre — nome do modelo
  Couro: ['bruto', 'com laser'],
  Metais: ['argola', 'mosquetão', 'ilhó', 'botão', 'fivela', 'corrente', 'rebite', 'pressão'],
  Forro: ['frente', 'costas', 'bolsos', 'lateral'],
  Lona: ['bruta', 'com corte'],
  Aviamentos: ['etiqueta', 'zíper'],
}

// Auto-deriva o type (bruta/intermediaria) com base na subcategoria
function deriveType(category: Category, subcategory: string): 'bruta' | 'intermediaria' {
  if (category === 'Couro' && subcategory === 'com laser') return 'intermediaria'
  if (category === 'Lona' && subcategory === 'com corte') return 'intermediaria'
  return 'bruta'
}
```

- [ ] **Step 2: Adicionar estado `newSubcategory` no componente**

Após o estado `newCategory`, adicionar:
```typescript
const [newSubcategory, setNewSubcategory] = useState<string>('')
const [newSubcategoryFree, setNewSubcategoryFree] = useState<string>('')  // para Bordado
```

- [ ] **Step 3: Reset subcategory ao trocar category**

Ao mudar `newCategory`, resetar subcategoria:
```typescript
function handleCategoryChange(cat: string) {
  setNewCategory(cat)
  setNewSubcategory(SUBCATEGORIES[cat as Category]?.[0] ?? '')
  setNewSubcategoryFree('')
}
```
Usar `handleCategoryChange` no `onChange` do select de categoria no form.

- [ ] **Step 4: Adicionar campo de subcategoria no form de nova MP**

No JSX do modal de "Nova Matéria-Prima", após o select de categoria, adicionar:

```tsx
{/* Subcategoria — dropdown para categorias com opções fixas */}
{newCategory !== 'Bordado' && SUBCATEGORIES[newCategory as Category]?.length > 0 && (
  <div>
    <label className="form-label">Subcategoria</label>
    <select
      id="new-material-subcategory"
      className="form-select"
      value={newSubcategory}
      onChange={(e) => setNewSubcategory(e.target.value)}
    >
      {SUBCATEGORIES[newCategory as Category].map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  </div>
)}

{/* Subcategoria — campo livre para Bordado (nome do modelo) */}
{newCategory === 'Bordado' && (
  <div>
    <label className="form-label">Modelo do bordado</label>
    <input
      id="new-material-subcategory-free"
      type="text"
      className="form-input"
      placeholder="Ex: Floral Pochete, Geométrico Liberty..."
      value={newSubcategoryFree}
      onChange={(e) => setNewSubcategoryFree(e.target.value)}
    />
  </div>
)}
```

- [ ] **Step 5: Passar subcategoria ao chamar `createRawMaterial`**

Localizar a chamada a `createRawMaterial` dentro de `handleCreateMaterial` (ou equivalente). Adicionar o campo `subcategory` e derivar `type` automaticamente:

```typescript
const subcategoryValue = newCategory === 'Bordado'
  ? (newSubcategoryFree.trim() || null)
  : (newSubcategory || null)

const typeValue = subcategoryValue
  ? deriveType(newCategory as Category, subcategoryValue)
  : 'bruta'

const res = await createRawMaterial({
  name: newName.trim(),
  type: typeValue,   // derivado automaticamente
  category: newCategory,
  subcategory: subcategoryValue,
  unit: newUnit,
  stock_quantity: parseFloat(newStock) || 0,
  minimum_stock: parseFloat(newMinStock) || 0,
  cost_per_unit: newCost ? parseFloat(newCost) : null,
  supplier: newSupplier.trim() || null,
  notes: newNotes.trim() || null,
})
```

- [ ] **Step 6: Commit**

```bash
git add components/admin/materias-client.tsx
git commit -m "feat: update raw material form — 6 new categories with dynamic subcategory logic"
```

---

## Task 6: Kanban de Ordens de Produção (producao-client.tsx)

**Files:**
- Modify: `components/admin/producao-client.tsx`
- Modify: `app/admin/producao/page.tsx`

- [ ] **Step 1: Atualizar page.tsx para não passar `materials` (não mais necessário)**

Substituir o conteúdo de `app/admin/producao/page.tsx`:

```typescript
import { getProductionOrders, getWholesaleVariants } from '@/lib/supabase/admin-queries'
import { ProducaoClient } from '@/components/admin/producao-client'

export const dynamic = 'force-dynamic'

export default async function ProducaoPage() {
  const [ops, variants] = await Promise.all([
    getProductionOrders(),
    getWholesaleVariants(),
  ])
  return <ProducaoClient ops={ops} variants={variants} />
}
```

- [ ] **Step 2: Reescrever ProducaoClient — estrutura base e Kanban**

Substituir o conteúdo completo de `components/admin/producao-client.tsx`:

```tsx
"use client" // interactive: kanban, modal de checklist, nova OP

import { useState, useTransition } from 'react'
import { AdminIcon } from '@/components/admin/admin-icon'
import type {
  ProductionOrderRow,
  MissingMaterialEntry,
  WholesaleVariant,
} from '@/lib/supabase/admin-queries'
import {
  createManualProductionOrder,
  advanceProductionOrderStatus,
  cancelProductionOrder,
  checkAndSetMaterials,
  toggleMaterialCheck,
} from '@/lib/actions/production'

interface ProducaoClientProps {
  ops: ProductionOrderRow[]
  variants: WholesaleVariant[]
}

type OpStatus = 'draft' | 'approved' | 'in_progress' | 'completed'

const COLUMNS: { status: OpStatus; label: string }[] = [
  { status: 'draft', label: 'Rascunho' },
  { status: 'approved', label: 'Aprovado' },
  { status: 'in_progress', label: 'Em Andamento' },
  { status: 'completed', label: 'Concluído' },
]

const ADVANCE_LABEL: Record<string, string> = {
  draft: 'Aprovar',
  approved: 'Iniciar',
  in_progress: 'Concluir',
}

// Determina o status de disponibilidade de uma categoria nas missing_materials
function categoryStatus(
  category: string,
  missing: MissingMaterialEntry[],
): 'ok' | 'needs_laser' | 'needs_purchase' {
  const entry = missing.find((m) => m.category === category)
  if (!entry) return 'ok'
  if (
    category === 'Couro' &&
    entry.couro_bruto_available != null &&
    entry.couro_bruto_available > 0
  ) {
    return 'needs_laser'
  }
  return 'needs_purchase'
}

const STATUS_ICON: Record<string, string> = {
  ok: '✅',
  needs_laser: '⚠️',
  needs_purchase: '❌',
}

const STATUS_TEXT: Record<string, string> = {
  ok: 'Disponível',
  needs_laser: 'Precisa de laser',
  needs_purchase: 'Comprar',
}

export function ProducaoClient({ ops, variants }: ProducaoClientProps) {
  const [selectedOp, setSelectedOp] = useState<ProductionOrderRow | null>(null)
  const [showNovaOp, setShowNovaOp] = useState(false)
  const [novaVariantId, setNovaVariantId] = useState(variants[0]?.id ?? '')
  const [novaQty, setNovaQty] = useState('1')
  const [novaNotes, setNovaNotes] = useState('')
  const [novaError, setNovaError] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Atualiza selectedOp quando ops muda (após revalidate)
  const displaySelected = selectedOp
    ? ops.find((o) => o.id === selectedOp.id) ?? selectedOp
    : null

  function handleAdvance(op: ProductionOrderRow) {
    setActionError(null)
    startTransition(async () => {
      const res = await advanceProductionOrderStatus(op.id)
      if (!res.success) setActionError(res.error)
    })
  }

  function handleCancel(op: ProductionOrderRow) {
    setActionError(null)
    startTransition(async () => {
      const res = await cancelProductionOrder(op.id)
      if (!res.success) setActionError(res.error)
      else setSelectedOp(null)
    })
  }

  function handleRefreshMaterials(op: ProductionOrderRow) {
    startTransition(async () => {
      await checkAndSetMaterials(op.id)
    })
  }

  function handleToggleCheck(op: ProductionOrderRow, category: string, checked: boolean) {
    startTransition(async () => {
      await toggleMaterialCheck(op.id, category, checked)
    })
  }

  async function handleCreateOp() {
    const qty = parseInt(novaQty)
    if (!novaVariantId) { setNovaError('Selecione uma variante'); return }
    if (isNaN(qty) || qty < 1) { setNovaError('Quantidade inválida'); return }
    setNovaError('')
    startTransition(async () => {
      const res = await createManualProductionOrder({
        product_variant_id: novaVariantId,
        quantity: qty,
        order_id: null,
        notes: novaNotes.trim() || null,
      })
      if (res.success) {
        setShowNovaOp(false)
        setNovaQty('1')
        setNovaNotes('')
      } else {
        setNovaError(res.error)
      }
    })
  }

  // Extrai categorias presentes no BOM (a partir de missing_materials + material_checks)
  function categoriesForOp(op: ProductionOrderRow): string[] {
    const fromMissing = op.missing_materials.map((m) => m.category)
    const fromChecks = Object.keys(op.material_checks)
    return Array.from(new Set([...fromChecks, ...fromMissing]))
  }

  return (
    <div className="admin-page" id="producao-page">
      {/* ── Cabeçalho ─────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Produção</h1>
          <p className="page-subtitle">
            {ops.filter((o) => !['completed', 'cancelled'].includes(o.status)).length} ordens ativas
          </p>
        </div>
        <button
          id="btn-nova-op"
          className="btn btn-primary"
          onClick={() => setShowNovaOp(true)}
        >
          <AdminIcon name="plus" /> Nova OP
        </button>
      </div>

      {actionError && (
        <div className="alert alert-error">{actionError}</div>
      )}

      {/* ── Kanban ────────────────────────────────────────────── */}
      <div className="kanban-board">
        {COLUMNS.map(({ status, label }) => {
          const colOps = ops.filter((o) => o.status === status)
          return (
            <div key={status} className="kanban-column" data-status={status}>
              <div className="kanban-column-header">
                <span className="kanban-column-title">{label}</span>
                <span className="kanban-column-count">{colOps.length}</span>
              </div>
              <div className="kanban-column-body">
                {colOps.map((op) => (
                  <OpCard
                    key={op.id}
                    op={op}
                    categoriesForOp={categoriesForOp}
                    onSelect={() => setSelectedOp(op)}
                    onAdvance={() => handleAdvance(op)}
                    isPending={isPending}
                  />
                ))}
                {colOps.length === 0 && (
                  <p className="kanban-empty">Nenhuma OP</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Modal detalhe da OP ───────────────────────────────── */}
      {displaySelected && (
        <div className="modal-overlay" onClick={() => setSelectedOp(null)}>
          <div
            className="modal-panel"
            id={`op-detail-${displaySelected.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <OpDetailModal
              op={displaySelected}
              categoriesForOp={categoriesForOp}
              categoryStatus={categoryStatus}
              onAdvance={() => handleAdvance(displaySelected)}
              onCancel={() => handleCancel(displaySelected)}
              onRefresh={() => handleRefreshMaterials(displaySelected)}
              onToggleCheck={(cat, val) => handleToggleCheck(displaySelected, cat, val)}
              onClose={() => setSelectedOp(null)}
              isPending={isPending}
            />
          </div>
        </div>
      )}

      {/* ── Modal nova OP ─────────────────────────────────────── */}
      {showNovaOp && (
        <div className="modal-overlay" onClick={() => setShowNovaOp(false)}>
          <div className="modal-panel" id="nova-op-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nova Ordem de Produção</h2>
              <button className="modal-close" onClick={() => setShowNovaOp(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div>
                <label className="form-label">Variante do produto</label>
                <select
                  id="nova-op-variant"
                  className="form-select"
                  value={novaVariantId}
                  onChange={(e) => setNovaVariantId(e.target.value)}
                >
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Quantidade a produzir</label>
                <input
                  id="nova-op-qty"
                  type="number"
                  min="1"
                  className="form-input"
                  value={novaQty}
                  onChange={(e) => setNovaQty(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Observações (opcional)</label>
                <textarea
                  id="nova-op-notes"
                  className="form-textarea"
                  value={novaNotes}
                  onChange={(e) => setNovaNotes(e.target.value)}
                />
              </div>
              {novaError && <p className="form-error">{novaError}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowNovaOp(false)}>Cancelar</button>
              <button
                id="btn-criar-op"
                className="btn btn-primary"
                disabled={isPending}
                onClick={handleCreateOp}
              >
                {isPending ? 'Criando...' : 'Criar OP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── OpCard ────────────────────────────────────────────────────────────────────

function OpCard({
  op,
  categoriesForOp,
  onSelect,
  onAdvance,
  isPending,
}: {
  op: ProductionOrderRow
  categoriesForOp: (op: ProductionOrderRow) => string[]
  onSelect: () => void
  onAdvance: () => void
  isPending: boolean
}) {
  const categories = categoriesForOp(op)
  const allChecked =
    categories.length > 0 && categories.every((c) => op.material_checks[c] === true)

  return (
    <div
      className={`op-card ${op.materials_sufficient === false ? 'op-card--missing' : ''}`}
      id={`op-card-${op.id}`}
      data-testid="op-card"
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className="op-card-title">{op.variant_label ?? '—'}</div>
      <div className="op-card-meta">
        Qtd: {op.quantity_requested}
        {op.customer_name && <span> · {op.customer_name}</span>}
      </div>
      <div className="op-card-categories">
        {categories.map((cat) => {
          const checked = op.material_checks[cat] ?? false
          const hasMissing = op.missing_materials.some((m) => m.category === cat)
          return (
            <span
              key={cat}
              className={`op-cat-badge ${checked ? 'op-cat-badge--done' : hasMissing ? 'op-cat-badge--missing' : 'op-cat-badge--ok'}`}
            >
              {cat}
            </span>
          )
        })}
      </div>
      {ADVANCE_LABEL[op.status] && (
        <button
          className="btn btn-sm btn-ghost op-card-advance"
          disabled={isPending}
          onClick={(e) => { e.stopPropagation(); onAdvance() }}
          data-testid="btn-advance-op"
        >
          {ADVANCE_LABEL[op.status]} →
        </button>
      )}
    </div>
  )
}

// ── OpDetailModal ─────────────────────────────────────────────────────────────

function OpDetailModal({
  op,
  categoriesForOp,
  categoryStatus,
  onAdvance,
  onCancel,
  onRefresh,
  onToggleCheck,
  onClose,
  isPending,
}: {
  op: ProductionOrderRow
  categoriesForOp: (op: ProductionOrderRow) => string[]
  categoryStatus: (cat: string, missing: MissingMaterialEntry[]) => 'ok' | 'needs_laser' | 'needs_purchase'
  onAdvance: () => void
  onCancel: () => void
  onRefresh: () => void
  onToggleCheck: (category: string, value: boolean) => void
  onClose: () => void
  isPending: boolean
}) {
  const categories = categoriesForOp(op)

  return (
    <>
      <div className="modal-header">
        <div>
          <h2 className="modal-title">{op.variant_label}</h2>
          <p className="modal-subtitle">
            {op.variant_sku} · Qtd: {op.quantity_requested}
            {op.customer_name && ` · ${op.customer_name}`}
          </p>
        </div>
        <button className="modal-close" onClick={onClose} data-testid="btn-close-op-detail">✕</button>
      </div>

      <div className="modal-body">
        {/* Checklist de categorias */}
        {categories.length === 0 ? (
          <p className="text-muted">Este produto não tem BOM cadastrado.</p>
        ) : (
          <div className="op-checklist" id="op-material-checklist">
            <div className="op-checklist-header">
              <span>Materiais necessários</span>
              <button
                className="btn btn-xs btn-ghost"
                onClick={onRefresh}
                disabled={isPending}
                data-testid="btn-refresh-materials"
              >
                ↻ Atualizar disponibilidade
              </button>
            </div>

            {categories.map((cat) => {
              const status = categoryStatus(cat, op.missing_materials)
              const checked = op.material_checks[cat] ?? false
              const missingEntry = op.missing_materials.find((m) => m.category === cat)

              return (
                <div
                  key={cat}
                  className={`op-check-row op-check-row--${status}`}
                  data-testid={`op-check-row-${cat.toLowerCase()}`}
                >
                  <label className="op-check-label">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => onToggleCheck(cat, e.target.checked)}
                      data-testid={`check-${cat.toLowerCase()}`}
                    />
                    <span className="op-check-category">{cat}</span>
                  </label>

                  <span className={`op-check-status op-check-status--${status}`}>
                    {STATUS_ICON[status]} {STATUS_TEXT[status]}
                  </span>

                  {missingEntry && (
                    <div className="op-check-detail">
                      {status === 'needs_laser' && (
                        <span className="op-check-alert">
                          Couro bruto disponível ({missingEntry.couro_bruto_available} {missingEntry.unit}) — enviar para laser antes de usar
                        </span>
                      )}
                      {status === 'needs_purchase' && (
                        <span className="op-check-alert">
                          Falta {missingEntry.missing.toLocaleString('pt-BR')} {missingEntry.unit} — adicionar às compras
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {op.notes && (
          <div className="op-notes">
            <strong>Obs:</strong> {op.notes}
          </div>
        )}
      </div>

      <div className="modal-footer">
        {op.status !== 'completed' && op.status !== 'cancelled' && (
          <button
            className="btn btn-ghost btn-danger"
            onClick={onCancel}
            disabled={isPending}
            data-testid="btn-cancel-op"
          >
            Cancelar OP
          </button>
        )}
        {ADVANCE_LABEL[op.status] && (
          <button
            className="btn btn-primary"
            onClick={onAdvance}
            disabled={isPending}
            data-testid="btn-advance-op-detail"
          >
            {isPending ? 'Salvando...' : ADVANCE_LABEL[op.status]}
          </button>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 3: Verificar se classes CSS do Kanban já existem no admin stylesheet**

Abrir o arquivo de estilos global do admin (provavelmente `app/admin/admin.css` ou similar). Verificar se classes como `kanban-board`, `kanban-column`, `op-card` existem. Se não existirem, adicionar no final do arquivo:

```css
/* ── Kanban de produção ──────────────────────────────── */
.kanban-board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  align-items: start;
}

.kanban-column {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.kanban-column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-raised);
  border-bottom: 1px solid var(--color-border);
  font-weight: 600;
  font-size: var(--text-sm);
}

.kanban-column-count {
  background: var(--color-border);
  border-radius: 999px;
  padding: 0 var(--space-2);
  font-size: var(--text-xs);
}

.kanban-column-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  min-height: 120px;
}

.kanban-empty {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  text-align: center;
  padding: var(--space-4) 0;
}

/* ── OP card ─────────────────────────────────────── */
.op-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.op-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.op-card--missing {
  border-left: 3px solid var(--color-warning);
}

.op-card-title {
  font-weight: 600;
  font-size: var(--text-sm);
  line-height: 1.3;
}

.op-card-meta {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.op-card-categories {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.op-cat-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  font-weight: 500;
}

.op-cat-badge--done  { background: #d1fae5; color: #065f46; }
.op-cat-badge--ok    { background: #e0f2fe; color: #0369a1; }
.op-cat-badge--missing { background: #fef3c7; color: #92400e; }

.op-card-advance {
  align-self: flex-end;
  font-size: var(--text-xs);
  padding: 2px 8px;
}

/* ── OP checklist no modal ──────────────────────── */
.op-checklist {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.op-checklist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-raised);
  font-weight: 600;
  font-size: var(--text-sm);
  border-bottom: 1px solid var(--color-border);
}

.op-check-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-2);
  align-items: start;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border-subtle);
}

.op-check-row:last-child { border-bottom: none; }

.op-check-row--needs_laser  { background: #fffbeb; }
.op-check-row--needs_purchase { background: #fff1f2; }

.op-check-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  font-size: var(--text-sm);
  grid-column: 1;
}

.op-check-category { font-weight: 500; }

.op-check-status {
  font-size: var(--text-xs);
  font-weight: 500;
  grid-column: 2;
  white-space: nowrap;
  padding-top: 2px;
}

.op-check-status--ok            { color: #059669; }
.op-check-status--needs_laser   { color: #d97706; }
.op-check-status--needs_purchase { color: #dc2626; }

.op-check-detail {
  grid-column: 1 / -1;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  padding-left: 20px;
}

.op-check-alert { color: var(--color-text-secondary); }

.op-notes {
  margin-top: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-raised);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}
```

- [ ] **Step 4: Localizar o arquivo de estilos do admin**

Rodar `find app/admin -name "*.css" -o -name "admin-styles*"` (ou equivalente no Windows com Glob) para encontrar onde os estilos do admin ficam. Adicionar as classes CSS do step 3 no arquivo correto.

- [ ] **Step 5: Commit**

```bash
git add components/admin/producao-client.tsx app/admin/producao/page.tsx
git commit -m "feat: redesign producao page — Kanban with per-product OP cards and material checklist"
```

---

## Task 7: Verificação final

- [ ] **Step 1: Build sem erros de TypeScript**

```bash
cd "C:\Users\User\Projects\Patricia Carreira\ecommerce"
npm run build
```
Esperado: build completo sem erros. Se houver erros de tipo (ex: referências a `ProductionOrderItemRow` que foram removidas), corrigi-los.

- [ ] **Step 2: Verificar referências órfãs**

```bash
grep -r "ProductionOrderItemRow\|corte.*acabamento\|depends_on_op_id\|materials_checked" app/ components/ lib/ --include="*.ts" --include="*.tsx"
```
Esperado: nenhuma ocorrência. Se encontrar, atualizar os arquivos que ainda referenciam os tipos/valores antigos.

- [ ] **Step 3: Verificar categorias antigas não usadas**

```bash
grep -r "Tecido\|Cortes\|Couro Legítimo\|Couro Sintético\|Aviamento\|Aplicações" components/ lib/ --include="*.ts" --include="*.tsx"
```
Esperado: nenhuma ocorrência nas constantes de categoria (pode aparecer em nomes de materiais de teste, mas não em constantes `CATEGORIES`).

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "chore: cleanup — remove all references to old production order model"
```

---

## Self-Review

**Spec coverage:**
- ✅ 6 categorias de MP com subcategorias corretas
- ✅ Bordado com campo livre de modelo
- ✅ Couro com subcategorias bruto / com laser
- ✅ Zíper movido para Aviamentos (fora de Metais)
- ✅ OP por produto (1 OP = 1 variante)
- ✅ Status sequencial: draft → approved → in_progress → completed
- ✅ Kanban com 4 colunas
- ✅ Card clicável → modal com checklist de materiais por categoria
- ✅ Lógica couro bruto → laser → ⚠️ alert; sem nenhum → ❌ compra
- ✅ Henrique dá check por categoria manualmente
- ✅ Fluxo atacado gera 1 OP por variante
- ✅ `minimum_batch_qty` adicionado a products
- ⏩ Sequência de produção por produto → adiado explicitamente para fase posterior
- ⏩ Drag-and-drop Kanban → adiado (botão de avançar status já resolve o fluxo)
