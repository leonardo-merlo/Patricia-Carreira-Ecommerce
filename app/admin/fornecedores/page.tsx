import { getSuppliers } from '@/lib/actions/suppliers'
import FornecedoresClient from './fornecedores-client'

export default async function FornecedoresPage() {
  const suppliers = await getSuppliers()
  return <FornecedoresClient initialSuppliers={suppliers} />
}
