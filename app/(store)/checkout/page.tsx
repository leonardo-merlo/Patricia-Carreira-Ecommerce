"use client" // form state, ViaCEP fetch, MP.js tokenization, router redirect

import { useState, useEffect, useRef, type FormEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Script from "next/script"
import { Loader2, QrCode, CreditCard, FileText, ChevronRight, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn, formatPrice } from "@/lib/utils"
import { isValidCpf } from "@/lib/documento"
import { useCart } from "@/lib/cart-context"
import { fetchAddressByCEP } from "@/lib/integrations/viacep"
import { createPayment } from "@/lib/actions/payments"
import { getShippingOptions } from "@/lib/actions/shipping"
import { getCheckoutPrefill } from "@/lib/actions/customers"
import type { PaymentMethod } from "@/lib/actions/payments"
import type { ShippingOption } from "@/lib/types"

// ─── Masks ────────────────────────────────────────────────────────────────────

function maskCEP(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function maskCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function maskCardNumber(v: string) {
  return v
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim()
}

function maskExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Label({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block font-label-md text-label-md text-on-surface-variant"
    >
      {children}
    </label>
  )
}

function FieldError({ msg }: { msg?: string }): ReactNode {
  if (!msg) return null
  return <p className="mt-1 font-caption text-caption text-error">{msg}</p>
}

// ─── Types ────────────────────────────────────────────────────────────────────

type MercadoPagoSDK = {
  getPaymentMethods: (args: { bin: string }) => Promise<{ results?: Array<{ id: string }> }>
  createCardToken: (args: {
    cardNumber: string
    cardholderName: string
    cardExpirationMonth: string
    cardExpirationYear: string
    securityCode: string
    identificationType: string
    identificationNumber: string
  }) => Promise<{ id: string }>
}

type Personal = { name: string; email: string; phone: string; cpf: string }
type Address = {
  cep: string; street: string; number: string; complement: string
  neighborhood: string; city: string; state: string
}
type Card = { number: string; holder: string; expiry: string; cvv: string }
type Errors = Record<string, string>

const EMPTY_PERSONAL: Personal = { name: "", email: "", phone: "", cpf: "" }
const EMPTY_ADDRESS: Address = {
  cep: "", street: "", number: "", complement: "",
  neighborhood: "", city: "", state: "",
}
const EMPTY_CARD: Card = { number: "", holder: "", expiry: "", cvv: "" }

const PAYMENT_OPTIONS: Array<{ id: PaymentMethod; label: string; description: string }> = [
  { id: "pix", label: "PIX", description: "Aprovação imediata" },
  { id: "credit_card", label: "Cartão de Crédito", description: "Em até 6x sem juros" },
  { id: "boleto", label: "Boleto", description: "Vence em 3 dias úteis" },
]

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(
  p: Personal,
  a: Address,
  method: PaymentMethod | null,
  card: Card,
  shipping: ShippingOption | null,
  paymentMethodId: string
): Errors {
  const e: Errors = {}
  if (!p.name.trim()) e.name = "Nome obrigatório"
  if (!p.email.trim()) e.email = "E-mail obrigatório"
  else if (!/\S+@\S+\.\S+/.test(p.email)) e.email = "E-mail inválido"
  if (p.phone.replace(/\D/g, "").length < 10) e.phone = "Telefone obrigatório"
  if (a.cep.replace(/\D/g, "").length !== 8) e.cep = "CEP inválido"
  if (!a.street.trim()) e.street = "Rua obrigatória"
  if (!a.number.trim()) e.number = "Número obrigatório"
  if (!a.neighborhood.trim()) e.neighborhood = "Bairro obrigatório"
  if (!a.city.trim()) e.city = "Cidade obrigatória"
  if (!a.state.trim()) e.state = "Estado obrigatório"
  if (!shipping) e.shipping = "Selecione uma opção de frete"
  if (!method) e.method = "Selecione a forma de pagamento"
  // Toda venda de varejo emite NF-e, e a nota exige o CPF do destinatário —
  // sem ele a SEFAZ rejeita depois do pagamento, com o cliente já fora da loja.
  // Confere o dígito verificador: um CPF de 11 dígitos que não fecha passa aqui
  // e só quebra na emissão da nota, quando já não dá para pedir correção.
  if (!p.cpf.trim()) e.cpf = "CPF obrigatório"
  else if (!isValidCpf(p.cpf)) e.cpf = "CPF inválido"
  if (method === "credit_card") {
    if (card.number.replace(/\s/g, "").length < 16) e.card_number = "Número inválido"
    // Sem bandeira reconhecida o pagamento sai com a bandeira errada e o banco
    // recusa sem explicar. Melhor barrar aqui, com o cartão ainda na tela.
    else if (!paymentMethodId) e.card_number = "Não reconhecemos esta bandeira. Confira o número do cartão."
    if (!card.holder.trim()) e.card_holder = "Nome obrigatório"
    if (card.expiry.length < 5) e.card_expiry = "Validade inválida"
    if (card.cvv.length < 3) e.card_cvv = "CVV inválido"
  }
  return e
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, hydrated, clearCart, setShipping } = useCart()

  const mpRef = useRef<MercadoPagoSDK | null>(null)
  const [personal, setPersonal] = useState<Personal>(EMPTY_PERSONAL)
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS)
  // Campos preenchidos pelo ViaCEP ficam readonly; digitados manualmente, não
  const [cepAutoFilled, setCepAutoFilled] = useState({ city: false, state: false })
  const [card, setCard] = useState<Card>(EMPTY_CARD)
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [paymentMethodId, setPaymentMethodId] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState("")
  const [loading, setLoading] = useState(false)
  const [sdkLoaded, setSdkLoaded] = useState(false)

  // Frete
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingError, setShippingError] = useState("")
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(599)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  // CEP que veio do cadastro e ainda não foi cotado. O prefill preenche o endereço
  // sem passar pelo campo de CEP, então precisa pedir a cotação por fora.
  const [cepPendenteCotacao, setCepPendenteCotacao] = useState<string | null>(null)

  useEffect(() => {
    if (hydrated && cart.items.length === 0 && !loading) router.replace("/carrinho")
  }, [hydrated, cart.items.length, router, loading])

  // Cliente logada não redigita o que já está no cadastro dela. Visitante recebe
  // null e segue com o formulário em branco.
  useEffect(() => {
    let ativo = true

    getCheckoutPrefill()
      .then((dados) => {
        if (!ativo || !dados) return

        setPersonal({
          name: dados.name,
          email: dados.email,
          phone: dados.phone ? maskPhone(dados.phone) : "",
          cpf: dados.cpf ? maskCPF(dados.cpf) : "",
        })

        if (dados.address?.zip) {
          const cep = maskCEP(dados.address.zip)
          setAddress({
            cep,
            street: dados.address.street,
            number: dados.address.number,
            complement: dados.address.complement,
            neighborhood: dados.address.neighborhood,
            city: dados.address.city,
            state: dados.address.state,
          })
          setCepPendenteCotacao(cep)
        }
      })
      .catch(() => {
        // Sem prefill o checkout funciona igual — não vale interromper a compra
      })

    return () => {
      ativo = false
    }
  }, [])

  // Endereço vindo do cadastro não passa pelo campo de CEP, então a cotação nunca
  // era disparada: a cliente via o endereço completo e "Preencha o CEP para ver as
  // opções de frete", e só destravava reeditando o CEP à mão. Espera o carrinho
  // hidratar porque a cotação precisa dos itens para calcular peso e dimensões.
  useEffect(() => {
    if (!hydrated || !cepPendenteCotacao || cart.items.length === 0) return
    setCepPendenteCotacao(null)
    void cotarFrete(cepPendenteCotacao)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, cepPendenteCotacao, cart.items.length])

  // Bandeira do cartão pelo BIN (6 primeiros dígitos) via SDK do MP.
  // Zerar a bandeira a cada mudança de número é o ponto central: sem isso, trocar
  // de cartão mantinha a bandeira do anterior e o pagamento era enviado com a
  // bandeira errada — o MP recusava um Mastercard dizendo que o Visa não confere.
  useEffect(() => {
    const bin = card.number.replace(/\s/g, "").substring(0, 6)
    setPaymentMethodId("")

    if (bin.length < 6 || !mpRef.current) return

    let ativo = true
    mpRef.current
      .getPaymentMethods({ bin })
      .then((res) => {
        if (!ativo) return
        const id = res?.results?.[0]?.id
        if (id) setPaymentMethodId(id)
      })
      .catch(() => {
        // Sem bandeira o submit já bloqueia com mensagem própria
      })

    return () => {
      ativo = false
    }
  }, [card.number])

  if (!hydrated || cart.items.length === 0) return null

  // Único lugar que pede cotação ao Melhor Envio — chamado tanto quando a cliente
  // digita o CEP quanto quando ele já veio preenchido do cadastro.
  async function cotarFrete(cep: string) {
    setShippingLoading(true)
    setShippingOptions([])
    setShippingError("")
    setSelectedShipping(null)
    setShipping(0)

    const cartItems = cart.items.map((i) => ({ variantId: i.variant.id, quantity: i.quantity }))
    const resultado = await getShippingOptions(cep, cartItems)

    setShippingLoading(false)

    if (resultado.ok) {
      setShippingOptions(resultado.options)
      setFreeShippingThreshold(resultado.freeShippingThreshold)
    } else {
      setShippingError(resultado.error)
    }
  }

  async function handleCEPChange(value: string) {
    const masked = maskCEP(value)
    setAddress((prev) => ({ ...prev, cep: masked }))
    setCepError("")

    if (masked.replace(/\D/g, "").length === 8) {
      setCepLoading(true)

      const [addressResult] = await Promise.all([
        fetchAddressByCEP(masked),
        cotarFrete(masked),
      ])

      setCepLoading(false)

      if (addressResult) {
        setAddress((prev) => ({
          ...prev,
          street: addressResult.logradouro,
          neighborhood: addressResult.bairro,
          city: addressResult.localidade,
          state: addressResult.uf,
        }))
        setCepAutoFilled({ city: !!addressResult.localidade, state: !!addressResult.uf })
      } else {
        setCepError("CEP não encontrado")
        setCepAutoFilled({ city: false, state: false })
      }
    }
  }

  // Frete grátis na opção mais econômica quando o subtotal atinge o mínimo configurado.
  const qualifiesForFreeShipping = cart.subtotal >= freeShippingThreshold
  const cheapestShippingId =
    shippingOptions.length > 0
      ? shippingOptions.reduce((min, o) => (o.price < min.price ? o : min), shippingOptions[0]).id
      : null

  function isFreeShipping(option: ShippingOption) {
    return qualifiesForFreeShipping && option.id === cheapestShippingId
  }

  function effectiveShippingPrice(option: ShippingOption) {
    return isFreeShipping(option) ? 0 : option.price
  }

  function handleSelectShipping(option: ShippingOption) {
    setSelectedShipping(option)
    setShipping(effectiveShippingPrice(option))
    setErrors((prev) => ({ ...prev, shipping: "" }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const errs = validate(personal, address, method, card, selectedShipping, paymentMethodId)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setLoading(true)

    try {
      let cardToken: string | undefined

      if (method === "credit_card") {
        if (!mpRef.current) throw new Error("SDK de pagamento não carregado. Aguarde e tente novamente.")
        const [expMonth, expYear] = card.expiry.split("/")
        const tokenResult = await mpRef.current.createCardToken({
          cardNumber: card.number.replace(/\s/g, ""),
          cardholderName: card.holder,
          cardExpirationMonth: expMonth.padStart(2, "0"),
          cardExpirationYear: `20${expYear}`,
          securityCode: card.cvv,
          identificationType: "CPF",
          identificationNumber: personal.cpf.replace(/\D/g, "") || "00000000000",
        })
        cardToken = tokenResult.id
      }

      // Os preços, desconto e frete são recalculados no servidor a partir do
      // banco — daqui saem apenas identificadores e o total exibido (checagem).
      const result = await createPayment({
        method: method!,
        payer: {
          name: personal.name,
          email: personal.email,
          cpf: personal.cpf || undefined,
        },
        cardToken,
        paymentMethodId: paymentMethodId || undefined,
        orderData: {
          formData: {
            name: personal.name,
            email: personal.email,
            phone: personal.phone,
            cpf: personal.cpf,
            address: {
              street: address.street,
              number: address.number,
              complement: address.complement || null,
              neighborhood: address.neighborhood,
              city: address.city,
              state: address.state,
              zip: address.cep,
            },
          },
          items: cart.items.map((item) => ({
            variantId: item.variant.id,
            quantity: item.quantity,
          })),
          couponCode: cart.coupon?.code ?? null,
          shipping: selectedShipping
            ? { serviceId: selectedShipping.id, destCep: address.cep }
            : null,
          expectedTotal: cart.total,
        },
      })

      if (!result.ok) throw new Error(result.error)

      sessionStorage.setItem("mp_payment", JSON.stringify(result.data))
      clearCart()
      router.push(`/pedido/${result.orderId}`)
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Erro ao processar. Tente novamente.",
      })
      setLoading(false)
    }
  }

  return (
    <>
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        onLoad={() => {
          const mpWindow = window as unknown as {
            MercadoPago: new (key: string | undefined, opts: { locale: string }) => MercadoPagoSDK
          }
          mpRef.current = new mpWindow.MercadoPago(
            process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY,
            { locale: "pt-BR" }
          )
          setSdkLoaded(true)
        }}
      />

      <div className="mx-auto max-w-container px-margin-mobile py-8 md:px-margin-desktop md:py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1 font-caption text-caption text-on-surface-variant">
          <Link href="/" className="transition-colors hover:text-on-surface">Início</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/carrinho" className="transition-colors hover:text-on-surface">Carrinho</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-on-surface">Finalizar Compra</span>
        </nav>

        <h1 className="mb-8 font-headline-md text-headline-md text-on-surface">Finalizar Compra</h1>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">

            {/* ── Formulário ── */}
            <div className="flex flex-col gap-8">

              {/* Dados pessoais */}
              <section>
                <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
                  Dados Pessoais
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input
                      id="name"
                      value={personal.name}
                      onChange={(e) => setPersonal((p) => ({ ...p, name: e.target.value }))}
                      autoComplete="name"
                      className={cn(errors.name && "border-error")}
                    />
                    <FieldError msg={errors.name} />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={personal.email}
                      onChange={(e) => setPersonal((p) => ({ ...p, email: e.target.value }))}
                      autoComplete="email"
                      inputMode="email"
                      className={cn(errors.email && "border-error")}
                    />
                    <FieldError msg={errors.email} />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone / WhatsApp</Label>
                    <Input
                      id="phone"
                      value={personal.phone}
                      onChange={(e) => setPersonal((p) => ({ ...p, phone: maskPhone(e.target.value) }))}
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="(11) 99999-9999"
                      className={cn(errors.phone && "border-error")}
                    />
                    <FieldError msg={errors.phone} />
                  </div>
                  <div>
                    <Label htmlFor="cpf">
                      CPF <span className="text-error">*</span>{" "}
                      <span className="text-on-surface-variant/60">(para a nota fiscal)</span>
                    </Label>
                    <Input
                      id="cpf"
                      value={personal.cpf}
                      onChange={(e) => setPersonal((p) => ({ ...p, cpf: maskCPF(e.target.value) }))}
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      className={cn(errors.cpf && "border-error")}
                    />
                    <FieldError msg={errors.cpf} />
                  </div>
                </div>
              </section>

              <Separator />

              {/* Endereço */}
              <section>
                <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
                  Endereço de Entrega
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                  <div className="sm:col-span-2">
                    <Label htmlFor="cep">CEP</Label>
                    <div className="relative">
                      <Input
                        id="cep"
                        value={address.cep}
                        onChange={(e) => handleCEPChange(e.target.value)}
                        inputMode="numeric"
                        placeholder="00000-000"
                        className={cn((errors.cep || cepError) && "border-error")}
                      />
                      {cepLoading && (
                        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-on-surface-variant" />
                      )}
                    </div>
                    <FieldError msg={cepError || errors.cep} />
                  </div>
                  <div className="sm:col-span-4">
                    <Label htmlFor="street">Rua / Avenida</Label>
                    <Input
                      id="street"
                      value={address.street}
                      onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
                      autoComplete="street-address"
                      className={cn(errors.street && "border-error")}
                    />
                    <FieldError msg={errors.street} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      value={address.number}
                      onChange={(e) => setAddress((a) => ({ ...a, number: e.target.value }))}
                      inputMode="numeric"
                      className={cn(errors.number && "border-error")}
                    />
                    <FieldError msg={errors.number} />
                  </div>
                  <div className="sm:col-span-4">
                    <Label htmlFor="complement">
                      Complemento{" "}
                      <span className="text-on-surface-variant/60">(opcional)</span>
                    </Label>
                    <Input
                      id="complement"
                      value={address.complement}
                      onChange={(e) => setAddress((a) => ({ ...a, complement: e.target.value }))}
                      placeholder="Apto, bloco, referência..."
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      value={address.neighborhood}
                      onChange={(e) => setAddress((a) => ({ ...a, neighborhood: e.target.value }))}
                      className={cn(errors.neighborhood && "border-error")}
                    />
                    <FieldError msg={errors.neighborhood} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={address.city}
                      onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                      readOnly={cepAutoFilled.city}
                      className={cn(
                        errors.city && "border-error",
                        cepAutoFilled.city && "bg-surface-container-low"
                      )}
                    />
                    <FieldError msg={errors.city} />
                  </div>
                  <div className="sm:col-span-1">
                    <Label htmlFor="state">UF</Label>
                    <Input
                      id="state"
                      value={address.state}
                      onChange={(e) =>
                        setAddress((a) => ({
                          ...a,
                          state: e.target.value.toUpperCase().slice(0, 2),
                        }))
                      }
                      readOnly={cepAutoFilled.state}
                      maxLength={2}
                      className={cn(
                        errors.state && "border-error",
                        cepAutoFilled.state && "bg-surface-container-low"
                      )}
                    />
                    <FieldError msg={errors.state} />
                  </div>
                </div>
              </section>

              <Separator />

              {/* Frete */}
              <section>
                <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
                  Frete
                </h2>

                {shippingLoading && (
                  <div className="flex items-center gap-2 font-body-md text-body-md text-on-surface-variant">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Calculando opções de frete...
                  </div>
                )}

                {!shippingLoading && shippingError && (
                  <p className="font-body-md text-body-md text-error">{shippingError}</p>
                )}

                {!shippingLoading && shippingOptions.length === 0 && !shippingError && (
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Preencha o CEP para ver as opções de frete.
                  </p>
                )}

                {!shippingLoading && shippingOptions.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {shippingOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleSelectShipping(option)}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-4 text-left transition-colors",
                          selectedShipping?.id === option.id
                            ? "border-primary bg-primary/5"
                            : "border-outline-variant hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Truck
                            className={cn(
                              "h-5 w-5 flex-shrink-0",
                              selectedShipping?.id === option.id
                                ? "text-primary"
                                : "text-on-surface-variant"
                            )}
                          />
                          <div>
                            <p
                              className={cn(
                                "font-label-md text-label-md",
                                selectedShipping?.id === option.id
                                  ? "text-on-surface"
                                  : "text-on-surface-variant"
                              )}
                            >
                              {option.name}
                            </p>
                            <p className="font-caption text-caption text-on-surface-variant">
                              {option.company} · {option.delivery_days_min}–{option.delivery_days_max} dias úteis
                            </p>
                          </div>
                        </div>
                        <span className="flex flex-col items-end">
                          {isFreeShipping(option) ? (
                            <>
                              <span className="font-caption text-caption text-on-surface-variant line-through">
                                {formatPrice(option.price)}
                              </span>
                              <span className="font-label-lg text-label-lg text-tertiary">Grátis</span>
                            </>
                          ) : (
                            <span
                              className={cn(
                                "font-label-lg text-label-lg",
                                selectedShipping?.id === option.id
                                  ? "text-primary"
                                  : "text-on-surface"
                              )}
                            >
                              {formatPrice(option.price)}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {qualifiesForFreeShipping && shippingOptions.length > 0 && (
                  <p className="mt-3 font-caption text-caption text-tertiary">
                    🎉 Você ganhou frete grátis na opção mais econômica!
                  </p>
                )}

                <FieldError msg={errors.shipping} />
              </section>

              <Separator />

              {/* Pagamento */}
              <section>
                <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
                  Forma de Pagamento
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {PAYMENT_OPTIONS.map(({ id, label, description }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setMethod(id)
                        setErrors((prev) => ({ ...prev, method: "", cpf: "" }))
                      }}
                      className={cn(
                        "flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors",
                        method === id
                          ? "border-primary bg-primary/5"
                          : "border-outline-variant hover:border-primary/50"
                      )}
                    >
                      {id === "pix" && (
                        <QrCode className={cn("h-5 w-5", method === id ? "text-primary" : "text-on-surface-variant")} />
                      )}
                      {id === "credit_card" && (
                        <CreditCard className={cn("h-5 w-5", method === id ? "text-primary" : "text-on-surface-variant")} />
                      )}
                      {id === "boleto" && (
                        <FileText className={cn("h-5 w-5", method === id ? "text-primary" : "text-on-surface-variant")} />
                      )}
                      <span className={cn("font-label-md text-label-md", method === id ? "text-on-surface" : "text-on-surface-variant")}>
                        {label}
                      </span>
                      <span className="font-caption text-caption text-on-surface-variant">
                        {description}
                      </span>
                    </button>
                  ))}
                </div>
                <FieldError msg={errors.method} />

                {/* Campos do cartão */}
                {method === "credit_card" && !sdkLoaded && (
                  <p className="mt-3 flex items-center gap-2 font-caption text-caption text-on-surface-variant">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Carregando sistema de pagamento...
                  </p>
                )}
                {method === "credit_card" && sdkLoaded && (
                  <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg border border-outline-variant bg-surface-container-low p-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="card_number">Número do cartão</Label>
                      <Input
                        id="card_number"
                        value={card.number}
                        onChange={(e) =>
                          setCard((c) => ({ ...c, number: maskCardNumber(e.target.value) }))
                        }
                        inputMode="numeric"
                        placeholder="0000 0000 0000 0000"
                        maxLength={19}
                        className={cn(errors.card_number && "border-error")}
                      />
                      <FieldError msg={errors.card_number} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="card_holder">Nome no cartão</Label>
                      <Input
                        id="card_holder"
                        value={card.holder}
                        onChange={(e) =>
                          setCard((c) => ({ ...c, holder: e.target.value.toUpperCase() }))
                        }
                        autoComplete="cc-name"
                        placeholder="NOME COMO NO CARTÃO"
                        className={cn(errors.card_holder && "border-error")}
                      />
                      <FieldError msg={errors.card_holder} />
                    </div>
                    <div>
                      <Label htmlFor="card_expiry">Validade</Label>
                      <Input
                        id="card_expiry"
                        value={card.expiry}
                        onChange={(e) =>
                          setCard((c) => ({ ...c, expiry: maskExpiry(e.target.value) }))
                        }
                        inputMode="numeric"
                        placeholder="MM/AA"
                        maxLength={5}
                        className={cn(errors.card_expiry && "border-error")}
                      />
                      <FieldError msg={errors.card_expiry} />
                    </div>
                    <div>
                      <Label htmlFor="card_cvv">CVV</Label>
                      <Input
                        id="card_cvv"
                        value={card.cvv}
                        onChange={(e) =>
                          setCard((c) => ({
                            ...c,
                            cvv: e.target.value.replace(/\D/g, "").slice(0, 4),
                          }))
                        }
                        inputMode="numeric"
                        placeholder="123"
                        maxLength={4}
                        className={cn(errors.card_cvv && "border-error")}
                      />
                      <FieldError msg={errors.card_cvv} />
                    </div>
                  </div>
                )}

                {method === "pix" && (
                  <p className="mt-4 font-body-md text-body-md text-on-surface-variant">
                    O QR Code PIX será gerado após confirmar o pedido. Você terá 30 minutos para pagar.
                  </p>
                )}

                {method === "boleto" && (
                  <p className="mt-4 font-body-md text-body-md text-on-surface-variant">
                    O boleto será gerado após confirmar o pedido. Vence em 3 dias úteis — o pedido só é processado após confirmação do pagamento.
                  </p>
                )}
              </section>
            </div>

            {/* ── Resumo ── */}
            <div className="self-start rounded-xl border border-outline-variant bg-surface-container-low p-6">
              <h2 className="mb-4 font-headline-sm text-headline-sm text-on-surface">
                Resumo
              </h2>

              <div className="flex flex-col gap-2 mb-4">
                {cart.items.map((item) => (
                  <div key={item.variant.id} className="flex justify-between gap-2 font-body-md text-body-md">
                    <span className="text-on-surface-variant truncate">
                      {item.quantity}× {item.variant.product.name}
                    </span>
                    <span className="flex-shrink-0 text-on-surface">
                      {formatPrice(item.variant.product.base_price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="mt-4 flex flex-col gap-3 font-body-md text-body-md">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Subtotal</span>
                  <span>{formatPrice(cart.subtotal)}</span>
                </div>
                {cart.discount_amount > 0 && (
                  <div className="flex justify-between text-tertiary">
                    <span>Desconto</span>
                    <span>− {formatPrice(cart.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-on-surface-variant">
                  <span>Frete</span>
                  {selectedShipping ? (
                    isFreeShipping(selectedShipping) ? (
                      <span className="text-tertiary">Grátis</span>
                    ) : (
                      <span>{formatPrice(selectedShipping.price)}</span>
                    )
                  ) : (
                    <span className="italic">A calcular</span>
                  )}
                </div>
              </div>

              <Separator className="my-4" />

              <div className="mb-6 flex justify-between font-headline-sm text-headline-sm text-on-surface">
                <span>Total</span>
                <span>{formatPrice(cart.total)}</span>
              </div>

              {errors.submit && (
                <p className="mb-3 font-caption text-caption text-error">{errors.submit}</p>
              )}

              <div className="mb-4 flex items-start gap-2">
                <input
                  id="checkout-terms"
                  type="checkbox"
                  required
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-primary"
                />
                <label htmlFor="checkout-terms" className="font-body-sm text-body-sm text-on-surface-variant">
                  Concordo com os{" "}
                  <Link href="/termos" className="text-primary underline underline-offset-2" target="_blank">Termos de Uso</Link>
                  {" "}e a{" "}
                  <Link href="/privacidade" className="text-primary underline underline-offset-2" target="_blank">Política de Privacidade</Link>
                </label>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading || !acceptedTerms || (method === "credit_card" && !sdkLoaded)}
                id="btn-finalizar-compra"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processando...
                  </span>
                ) : (
                  "Finalizar Compra"
                )}
              </Button>

              <div className="mt-3 flex items-center justify-center gap-1.5 font-caption text-caption text-on-surface-variant">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2L4 5v6c0 5.25 3.5 10.15 8 11.5C16.5 21.15 20 16.25 20 11V5l-8-3z" fill="currentColor" opacity="0.3"/>
                  <path d="M12 2L4 5v6c0 5.25 3.5 10.15 8 11.5C16.5 21.15 20 16.25 20 11V5l-8-3z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Pagamento seguro via Mercado Pago
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  )
}
