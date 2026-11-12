import { cloneElement, useEffect, useId, useRef } from 'react'
import { X, AlertCircle, FolderOpen, ArrowUpRight } from 'lucide-react'

export const quadrants = {
  star: { label: 'Estrelas', color: '#2463eb', tone: '#eaf1ff', hint: 'Investir e consolidar' },
  question: { label: 'Interrogação', color: '#a1600a', tone: '#fff4dd', hint: 'Validar hipóteses' },
  cash: { label: 'Vacas leiteiras', color: '#087d6a', tone: '#def5ef', hint: 'Sustentar e otimizar' },
  dog: { label: 'Reposicionamento', color: '#7354a7', tone: '#f1ebfb', hint: 'Revisar continuidade' },
}
export const choices = {
  investir: 'Investir', validar: 'Validar', sustentar: 'Sustentar', reposicionar: 'Reposicionar', pausar: 'Pausar',
}
export const conditions = { manual: 'Manual', matriz: 'Matriz estruturada', smartbcg: 'SmartBCG completo' }
export const number = (x, digits = 0) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(x)
export const percent = (x) => `${number(x * 100)}%`
export const brl = (x) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(x)
export const shortBRL = (x) => `R$ ${new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 2 }).format(x)}`
export const dateLabel = (x) => x ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(x)) : '—'

export async function api(path, method = 'GET', data) {
  const response = await fetch(`/api${path}`, {
    method,
    ...(data === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const message = Array.isArray(body.detail)
      ? body.detail.map((issue) => `${issue.loc.at(-1)} · ${issue.msg}`).join(' | ')
      : body.detail
    throw new Error(message || `A API respondeu com erro ${response.status}.`)
  }
  return response.json()
}

export function useDialog(dialog, onClose) {
  useEffect(() => {
    const node = dialog.current
    if (!node.open) node.showModal()
    return () => { if (node.open) node.close() }
  }, [dialog])
  return (event) => { event.preventDefault(); onClose() }
}

export function Modal({ title, subtitle, onClose, children, wide = false }) {
  const ref = useRef(null)
  const cancel = useDialog(ref, onClose)
  return <dialog ref={ref} className={wide ? 'modal wide' : 'modal'} aria-labelledby="modal-title" onCancel={cancel}>
    <header className="modal-head"><div><h2 id="modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
      <button className="icon-button" aria-label="Fechar" onClick={onClose}><X size={20} /></button>
    </header>
    <div className="modal-body">{children}</div>
  </dialog>
}

export function Field({ label, children, className = '' }) {
  const labelId = useId()
  return <label className={`field ${className}`}><span id={labelId}>{label}</span>{cloneElement(children, { 'aria-labelledby': labelId })}</label>
}
export function ErrorMessage({ message }) {
  return message ? <div className="error" role="alert"><AlertCircle size={17} />{message}</div> : null
}
export function Empty({ children }) {
  return <div className="empty"><FolderOpen size={23} /><p>{children}</p></div>
}
export function Badge({ kind }) {
  const info = quadrants[kind]
  return info ? <span className="badge" style={{ '--tone': info.tone, '--mark': info.color }}><i />{info.label}</span>
    : <span className="badge neutral"><i />Sem avaliação</span>
}
export function Card({ title, subtitle, action, children, className = '' }) {
  return <section className={`card ${className}`}>
    {title && <header className="card-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</header>}
    {children}
  </section>
}
export function Download({ href, children }) {
  return <a className="button secondary" href={href}>{children}<ArrowUpRight size={16} /></a>
}
export function FooterButtons({ onClose, pending, submit = 'Salvar' }) {
  return <div className="form-footer"><button className="button secondary" type="button" onClick={onClose}>Cancelar</button>
    <button className="button primary" disabled={pending}>{pending ? 'Salvando…' : submit}</button></div>
}
