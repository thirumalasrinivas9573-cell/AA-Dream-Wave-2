/**
 * Six-box OTP input — modern, accessible, paste-friendly.
 */
import { useRef, useEffect } from 'react'
import './otp-input.css'

export default function OtpInput({
  value = '',
  onChange,
  length = 6,
  disabled = false,
  accent = '#38BDF8',
  autoFocus = true,
}) {
  const refs = useRef([])
  const digits = String(value).replace(/\D/g, '').slice(0, length).padEnd(length, ' ').split('')

  useEffect(() => {
    if (autoFocus && refs.current[0]) refs.current[0].focus()
  }, [autoFocus])

  const emit = (next) => onChange?.(next.replace(/\D/g, '').slice(0, length))

  const onDigit = (idx, raw) => {
    const cleaned = raw.replace(/\D/g, '')
    if (!cleaned) {
      const arr = String(value).padEnd(length, ' ').split('')
      arr[idx] = ' '
      emit(arr.join('').replace(/ /g, ''))
      return
    }
    if (cleaned.length > 1) {
      // paste into this cell
      const merged = (String(value).slice(0, idx) + cleaned).replace(/\D/g, '').slice(0, length)
      emit(merged)
      const focusAt = Math.min(merged.length, length - 1)
      refs.current[focusAt]?.focus()
      return
    }
    const arr = String(value).padEnd(length, ' ').split('')
    arr[idx] = cleaned
    const next = arr.join('').replace(/ /g, '')
    emit(next)
    if (idx < length - 1) refs.current[idx + 1]?.focus()
  }

  const onKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const current = String(value)
      if (current[idx]) {
        emit(current.slice(0, idx) + current.slice(idx + 1))
      } else if (idx > 0) {
        emit(current.slice(0, idx - 1) + current.slice(idx))
        refs.current[idx - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      refs.current[idx - 1]?.focus()
    } else if (e.key === 'ArrowRight' && idx < length - 1) {
      refs.current[idx + 1]?.focus()
    }
  }

  const onPaste = (e) => {
    e.preventDefault()
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, length)
    emit(text)
    refs.current[Math.min(text.length, length - 1)]?.focus()
  }

  return (
    <div className="otp-input" style={{ '--otp-accent': accent }} onPaste={onPaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          value={d.trim()}
          onChange={(e) => onDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          aria-label={`Digit ${i + 1}`}
          data-filled={Boolean(d.trim())}
        />
      ))}
    </div>
  )
}

export function mapOtpError(err) {
  const code = err?.response?.data?.code
  const msg = err?.response?.data?.message || err?.message || ''
  if (!err?.response) return 'Network Error'
  if (code === 'INVALID_NUMBER' || /invalid number/i.test(msg)) return 'Invalid Number'
  if (code === 'OTP_EXPIRED' || /expired/i.test(msg)) return 'OTP Expired'
  if (code === 'OTP_INCORRECT' || /incorrect|invalid or expired/i.test(msg)) return 'OTP Incorrect'
  if (code === 'RATE_LIMIT' || code === 'DUPLICATE_REQUEST' || err?.response?.status === 429) return 'Too Many Requests'
  if (code === 'TWILIO_CONFIG' || code === 'TWILIO_ERROR' || code === 'TWILIO_AUTH' || /twilio/i.test(msg)) {
    return 'Twilio Service Error'
  }
  return msg || 'Something went wrong'
}
