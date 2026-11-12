import { useEffect, useState } from 'react'
import { ArrowLeftRight, Check, Plus, SlidersHorizontal } from 'lucide-react'
import { api, Badge, brl, Card, dateLabel, Empty, ErrorMessage, Field, FooterButtons, Modal, number, percent } from './ui'

function PolicyFields({ prefix, title, values }) {
  return <fieldset className="criterion-group"><legend>{title}</legend><div className="form-grid">
    <Field label="Orçamento disponível (R$)"><input type="number" name={`${prefix}-budget`} defaultValue={values.budget} min="0" max="100000000" step=".01" required /></Field>
    <Field label="Capacidade disponível (horas)"><input type="number" name={`${prefix}-capacity`} defaultValue={values.capacity} min="0" max="100000" required /></Field>
    <Field label="Peso de tecnologia na seleção (%)"><input type="number" name={`${prefix}-tech_share`} defaultValue={values.tech_share} min="0" max="100" required /></Field>
    <Field label="Limiar de tecnologia"><input type="number" name={`${prefix}-tech_threshold`} defaultValue={values.tech_threshold} min="1" max="5" step=".1" required /></Field>
    <Field label="Limiar de mercado"><input type="number" name={`${prefix}-market_threshold`} defaultValue={values.market_threshold} min="1" max="5" step=".1" required /></Field>
    <label className="check"><input type="checkbox" name={`${prefix}-evidence_only`} defaultChecked={values.evidence_only} />Exigir evidência completa</label>
  </div></fieldset>
}

function ScenarioForm({ previous, onClose, onSaved }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const defaultPolicy = { budget: 500000, capacity: 1000, tech_share: 50, tech_threshold: 3, market_threshold: 3, evidence_only: false }
  async function save(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    function policy(prefix) {
      return Object.fromEntries(Object.keys(defaultPolicy).map((key) =>
        [key, key === 'evidence_only' ? form.has(`${prefix}-${key}`) : Number(form.get(`${prefix}-${key}`))]))
    }
    setPending(true)
    setError('')
    try {
      onSaved(await api('/scenarios', 'POST', { name: form.get('name'), baseline: policy('base'), proposed: policy('alt') }))
    } catch (problem) {
      setError(problem.message)
      setPending(false)
    }
  }
  return <Modal wide title="Novo cenário comparativo" subtitle="Compare duas políticas sobre as avaliações atuais do mesmo portfólio."
    onClose={() => { if (!pending) onClose() }}><form onSubmit={save}>
    <Field label="Nome do cenário"><input name="name" required minLength={2} maxLength={140} placeholder="Ex. Restrição de capacidade" /></Field>
    <PolicyFields prefix="base" title="Política de referência" values={previous?.baseline || defaultPolicy} />
    <PolicyFields prefix="alt" title="Política alternativa" values={previous?.proposed || { ...defaultPolicy, budget: 400000, tech_share: 60, evidence_only: true }} />
    <p className="form-note">A carteira maximiza a soma do valor conservador dentro de orçamento e horas. Os limiares alteram o quadrante. O peso de mercado complementa o peso de tecnologia até 100%.</p>
    <ErrorMessage message={error} />
    <FooterButtons onClose={onClose} pending={pending} submit="Simular e salvar" />
  </form></Modal>
}

function PolicySummary({ label, policy, result }) {
  return <div className="policy"><span>{label}</span><strong>{result.selected_ids.length} selecionados</strong>
    <p>{brl(result.cost)} de {brl(policy.budget)} · {number(result.hours)} de {number(policy.capacity)} h</p>
    <small>Tecnologia {policy.tech_share}% · Mercado {100 - policy.tech_share}% · Limiares {number(policy.tech_threshold, 1)} / {number(policy.market_threshold, 1)}</small>
    <small>Evidência completa {policy.evidence_only ? 'obrigatória' : 'opcional'}</small></div>
}

function Selection({ item }) {
  return <><div className="scenario-selection">
    {item.selected ? <span className="selected"><Check size={15} />Selecionado</span> : <span className="muted">{item.ineligible_reason || 'Fora da carteira'}</span>}
    {item.analysis && <Badge kind={item.analysis.quadrant} />}</div>
    {item.analysis && <small className="muted">Valor conservador: {number(item.utility_units / 100000, 2)} · evidência {percent(item.analysis.evidence_coverage)}</small>}</>
}

export function Scenarios({ flash, initialId = '' }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(initialId)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    let active = true
    api('/scenarios').then((result) => { if (active) setItems(result) }).catch((problem) => { if (active) setError(problem.message) })
    return () => { active = false }
  }, [])
  const scenario = items?.find((item) => item.id === selected) || items?.[0]
  return <>
    <div className="page-head"><div><h1>Cenários de decisão</h1><p>Compare carteiras sob limites de orçamento, capacidade e evidência.</p></div>
      <button className="button primary" onClick={() => setOpen(true)}><Plus size={18} />Novo cenário</button></div>
    <ErrorMessage message={error} />
    {scenario ? <>
      <Card title="Comparação de políticas" subtitle={`${scenario.name} · ${dateLabel(scenario.created_at)} · ${scenario.version}`}
        action={<label className="filter"><SlidersHorizontal size={16} /><select aria-label="Escolher cenário salvo" value={scenario.id} onChange={(event) => setSelected(event.target.value)}>
          {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>}>
        <div className="policy-grid"><PolicySummary label="Referência" policy={scenario.baseline} result={scenario.results.baseline} />
          <PolicySummary label="Alternativa" policy={scenario.proposed} result={scenario.results.proposed} /></div>
      </Card>
      <Card title="Projetos por política" subtitle="Resultado armazenado com as avaliações usadas na simulação">
        <div className="table-scroll"><table><thead><tr><th>Projeto</th><th>Referência</th><th>Alternativa</th><th>Mudança de carteira</th></tr></thead><tbody>
          {scenario.results.baseline.rows.map((item, index) => {
            const alt = scenario.results.proposed.rows[index]
            return <tr key={item.id}><td><a href={`#/projetos/${item.id}`} className="text-link">{item.name}</a><small className="scenario-cost">{brl(item.cost)} · {number(item.hours)} h</small></td>
              <td><Selection item={item} /></td><td><Selection item={alt} /></td>
              <td>{item.selected === alt.selected ? '—' : <span className="change"><ArrowLeftRight size={15} />{alt.selected ? 'Entra na carteira' : 'Sai da carteira'}</span>}</td></tr>
          })}
        </tbody></table></div>
      </Card>
    </> : <Card title="Cenários salvos">{items ? <Empty>Crie um cenário para comparar duas políticas de seleção.</Empty> :
      !error && <p className="side-body" role="status">Carregando cenários…</p>}</Card>}
    {open && <ScenarioForm previous={scenario} onClose={() => setOpen(false)} onSaved={(result) => {
      setItems((current) => [result, ...(current || [])])
      setSelected(result.id)
      setOpen(false)
      flash('Cenário calculado e salvo.')
    }} />}
  </>
}
