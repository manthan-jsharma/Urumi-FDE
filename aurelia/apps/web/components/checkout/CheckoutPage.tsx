'use client'

import { useState } from 'react'
import { useConfigStore } from '@/lib/store'
import { BASE_RING_PRICE } from '@/lib/materials'
import { useRouter } from 'next/navigation'

interface BillingForm {
  first_name: string
  last_name: string
  email: string
  phone: string
  address_1: string
  city: string
  state: string
  postcode: string
  country: string
}

const EMPTY_FORM: BillingForm = {
  first_name: '', last_name: '', email: '', phone: '',
  address_1: '', city: '', state: '', postcode: '', country: 'US',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#111',
  border: '1px solid #1f1f1f',
  color: '#f0ede8',
  padding: '13px 16px',
  fontSize: 13,
  fontFamily: 'var(--font-body)',
  letterSpacing: '0.04em',
  outline: 'none',
  transition: 'border-color 0.2s',
}

function Input({ label, value, onChange, type = 'text', placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888880', fontFamily: 'var(--font-body)' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ ...inputStyle, borderColor: focused ? 'rgba(201,168,76,0.5)' : '#1f1f1f' }}
      />
    </div>
  )
}

export function CheckoutPage() {
  const router = useRouter()
  const cartItems = useConfigStore(s => s.cartItems)
  const total = cartItems.length > 0
    ? cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    : BASE_RING_PRICE

  const [form, setForm] = useState<BillingForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [orderId, setOrderId] = useState<number | null>(null)
  const [error, setError] = useState('')

  function setField(key: keyof BillingForm) {
    return (v: string) => setForm(f => ({ ...f, [key]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name || !form.last_name || !form.email || !form.address_1 || !form.city) {
      setError('Please fill in all required fields.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/wc/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billing: { ...form },
          cartItems,
          total,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Order failed')
      setOrderId(data.orderId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Order success ────────────────────────────────────────────────────────────
  if (orderId) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', fontSize: 24 }}>
            ✦
          </div>
          <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 16, fontFamily: 'var(--font-body)' }}>
            Order Confirmed
          </p>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 300, color: '#f0ede8', marginBottom: 16, lineHeight: 1.1 }}>
            Thank you,<br />{form.first_name}.
          </h1>
          <p style={{ fontSize: 13, color: '#888880', lineHeight: 1.7, marginBottom: 8 }}>
            Order #{orderId} · {cartItems.length} ring{cartItems.length > 1 ? 's' : ''}
          </p>
          <p style={{ fontSize: 13, color: '#888880', lineHeight: 1.7, marginBottom: 40 }}>
            Total · ${total.toLocaleString()}
          </p>
          <p style={{ fontSize: 11, color: '#444', letterSpacing: '0.06em', marginBottom: 40 }}>
            A confirmation will be sent to {form.email}
          </p>
          <button
            onClick={() => router.push('/select')}
            style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.35)', color: '#f0ede8', padding: '13px 32px', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: 'var(--font-body)', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = '#0a0a0a' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#f0ede8' }}
          >
            Configure Another
          </button>
        </div>
      </div>
    )
  }

  // ── Checkout form ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f0ede8' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #1f1f1f', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#888880', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
          ← Back
        </button>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 300, letterSpacing: '0.08em' }}>
          Aurelia
        </span>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(32px, 5vw, 64px) 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'clamp(32px, 5vw, 80px)', alignItems: 'start' }}>

        {/* Order Summary */}
        <div>
          <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 32, fontFamily: 'var(--font-body)' }}>
            Your Order · {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
          </p>

          {/* Cart items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 24 }}>
            {cartItems.map((item, i) => (
              <div key={item.id} style={{ border: '1px solid #1f1f1f', padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 300, marginBottom: 4 }}>
                      Aurelia Twist Ring {cartItems.length > 1 ? `#${i + 1}` : ''}
                    </p>
                    <p style={{ fontSize: 11, color: '#888880', letterSpacing: '0.06em' }}>
                      Made to order · Ships in 4–6 weeks
                    </p>
                  </div>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 300, color: 'var(--gold)' }}>
                    ${item.price.toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontSize: 11, color: '#888880', fontFamily: 'var(--font-body)' }}>
                    {item.metalLabel}
                  </span>
                  <span style={{ fontSize: 11, color: '#444' }}>·</span>
                  <span style={{ fontSize: 11, color: '#888880', fontFamily: 'var(--font-body)' }}>
                    {item.stoneLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '20px 0', borderTop: '1px solid #1f1f1f', marginBottom: 32 }}>
            <span style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888880', fontFamily: 'var(--font-body)' }}>Total</span>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 300 }}>
              ${total.toLocaleString()}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['Free worldwide shipping', 'Lifetime resize guarantee', 'Ethically sourced diamonds', '30-day returns'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--gold)', fontSize: 10 }}>✦</span>
                <span style={{ fontSize: 12, color: '#888880', fontFamily: 'var(--font-body)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Billing Form */}
        <div>
          <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 32, fontFamily: 'var(--font-body)' }}>
            Billing Details
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Input label="First Name *" value={form.first_name} onChange={setField('first_name')} />
              <Input label="Last Name *" value={form.last_name} onChange={setField('last_name')} />
            </div>
            <Input label="Email *" type="email" value={form.email} onChange={setField('email')} placeholder="you@example.com" />
            <Input label="Phone" type="tel" value={form.phone} onChange={setField('phone')} placeholder="+1 (555) 000-0000" />
            <Input label="Address *" value={form.address_1} onChange={setField('address_1')} placeholder="123 Main Street" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Input label="City *" value={form.city} onChange={setField('city')} />
              <Input label="State" value={form.state} onChange={setField('state')} placeholder="NY" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Input label="ZIP Code" value={form.postcode} onChange={setField('postcode')} />
              <Input label="Country" value={form.country} onChange={setField('country')} />
            </div>

            <div style={{ border: '1px solid #1f1f1f', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--gold)', fontSize: 12, marginTop: 1 }}>✦</span>
              <p style={{ fontSize: 11, color: '#888880', lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
                <span style={{ color: '#f0ede8' }}>Demo mode</span> — No payment required. Places a real order in WooCommerce marked as pending.
              </p>
            </div>

            {error && (
              <p style={{ fontSize: 12, color: '#c0392b', fontFamily: 'var(--font-body)' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{ width: '100%', padding: '16px 24px', background: 'transparent', border: '1px solid rgba(201,168,76,0.4)', color: '#f0ede8', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'var(--font-body)', cursor: submitting ? 'default' : 'pointer', transition: 'background 0.3s, color 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
              onMouseEnter={e => { if (!submitting) { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = '#0a0a0a' } }}
              onMouseLeave={e => { if (!submitting) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#f0ede8' } }}
            >
              {submitting ? (
                <>
                  <span style={{ width: 12, height: 12, border: '1px solid rgba(201,168,76,0.4)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                  Placing Order...
                </>
              ) : `Place Order · $${total.toLocaleString()}`}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
