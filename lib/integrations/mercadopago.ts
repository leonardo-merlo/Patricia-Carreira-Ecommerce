// Mock implementation — swap for real Mercado Pago SDK when credentials are available
// Replace createMockPayment with createPayment(method, amount, customerData) using the MP SDK

export type PaymentMethod = "pix" | "credit_card" | "boleto"

export type PaymentResult = {
  id: string
  status: "pending" | "approved"
  method: PaymentMethod
}

export async function createMockPayment(
  method: PaymentMethod,
  _amount: number
): Promise<PaymentResult> {
  await new Promise((r) => setTimeout(r, 900))
  return {
    id: `MOCK-${Date.now()}`,
    status: method === "credit_card" ? "approved" : "pending",
    method,
  }
}
