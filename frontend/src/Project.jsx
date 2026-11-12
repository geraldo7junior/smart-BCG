import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, FileText, Pencil, Plus, Target } from 'lucide-react'
import { api, Badge, brl, Card, choices, dateLabel, Empty, ErrorMessage, Field, FooterButtons, Modal, number, percent, quadrants } from './ui'

const projectFields = [
  ['name', 'Nome do projeto'], ['domain', 'Área de atuação'], ['objective', 'Objetivo estratégico'],
  ['owner', 'Código da equipe responsável', 'code'], ['cost', 'Orçamento estimado (R$)', 'money'],
  ['hours', 'Capacidade necessária (horas)', 'hours'], ['description', 'Descrição', 'optionalText'],
]
const decisionFields = [
  ['reviewer', 'Código do responsável pela decisão', 'code'], ['choice', 'Decisão', 'choice'],
  ['review_due', 'Data da próxima revisão', 'date'], ['rationale', 'Justificativa da decisão', 'notes'],
]
const actionFields = [
  ['title', 'Ação'], ['owner', 'Código do responsável', 'code'], ['due', 'Prazo', 'date'],
  ['status', 'Status', 'status'], ['evidence', 'Evidência ou referência', 'optionalText'],
]
const benefitFields = [
  ['name', 'Indicador de benefício'], ['unit', 'Unidade de medida'], ['baseline', 'Linha de base', 'measure'],
  ['target', 'Meta', 'measure'], ['due', 'Data da meta', 'date'],
]
const observationFields = [
  ['measured_on', 'Data da medição', 'date'], ['value', 'Valor observado', 'measure'],
  ['evidence', 'Evidência ou referência da medição', 'notes'],
]
const fieldOptions = {
  choice: choices, status: { aberta: 'Aberta', 'em curso': 'Em curso', concluída: 'Concluída' },
}
const numericFields = ['money', 'hours', 'measure']
const today = () => new Date().toISOString().slice(0, 10)

function RecordForm({ config, onClose, onSaved }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function save(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const body = Object.fromEntries(config.fields.map(([key, , type]) =>
      [key, numericFields.includes(type) ? Number(data.get(key)) : data.get(key)]))
    if (body.scenario_id === '') body.scenario_id = null
    setPending(true)
    setError('')
    try {
      const result = await api(config.path, config.method || 'POST', body)
      onSaved(result)
    } catch (problem) {
      setError(problem.message)
      setPending(false)
    }
  }
  return <Modal title={config.title} subtitle={config.subtitle} onClose={() => { if (!pending) onClose() }}>
    <form onSubmit={save}>
      <div className="form-grid">{config.fields.map(([key, label, type, options]) => {
        const text = type === 'notes' || type === 'optionalText'
        const select = options || fieldOptions[type]
        return <Field key={key} label={label} className={text ? 'full' : ''}>
          {select ? <select name={key} defaultValue={config.defaults?.[key]} required={type !== 'optionalSelect'}>
            {Object.entries(select).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
          </select> : text ? <textarea name={key} defaultValue={config.defaults?.[key]}
            required={type === 'notes'} minLength={type === 'notes' ? 10 : undefined}
            maxLength={key === 'evidence' && type === 'optionalText' ? 600 : 2000} rows={3} />
            : <input name={key} defaultValue={config.defaults?.[key]} required
              type={numericFields.includes(type) ? 'number' : type === 'date' ? 'date' : 'text'}
              step={type === 'hours' ? 1 : type === 'measure' ? 'any' : type === 'money' ? '0.01' : undefined}
              min={['hours', 'money'].includes(type) ? 0 : undefined}
              max={type === 'hours' ? 100000 : type === 'money' ? 100000000 : undefined}
              minLength={type === 'code' || !type ? 2 : undefined}
              maxLength={type === 'code' ? 40 : !type ? 140 : undefined}
              pattern={type === 'code' ? '[A-Za-z0-9_\\-]{2,40}' : undefined}
              title={type === 'code' ? 'Letras sem acento, números, hífen ou sublinhado.' : undefined} />}
        </Field>
      })}</div>
      <ErrorMessage message={error} />
      <FooterButtons onClose={onClose} pending={pending} />
    </form>
  </Modal>
}

export function ProjectForm({ project, onClose, onSaved }) {
  const config = {
    title: project ? 'Editar projeto' : 'Novo projeto', defaults: project,
    fields: projectFields, path: project ? `/projects/${project.id}` : '/projects', method: project ? 'PUT' : 'POST',
  }
  return <RecordForm config={config} onClose={onClose} onSaved={onSaved} />
}

function ReviewForm({ pid, model, previous, onClose, onSaved }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function save(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const ratings = {}
    for (const item of model.criteria) {
      const value = data.get(item.key)
      const evidence = data.get(`e_${item.key}`).trim()
      if (evidence && !value) {
        setError(`Selecione a nota de ${item.label} para registrar a evidência.`)
        return
      }
      if (value) ratings[item.key] = { score: Number(value), evidence }
    }
    if (!Object.keys(ratings).length) { setError('Informe ao menos uma nota.'); return }
    setPending(true)
    setError('')
    try {
      await api(`/projects/${pid}/reviews`, 'POST', { cycle: data.get('cycle'), reviewer: data.get('reviewer'), ratings })
      onSaved()
    } catch (problem) {
      setError(problem.message)
      setPending(false)
    }
  }
  return <Modal title="Nova avaliação" subtitle="Registre notas e referências que possam ser verificadas." onClose={() => { if (!pending) onClose() }} wide>
    <form onSubmit={save}>
      <div className="form-grid">
        <Field label="Ciclo de avaliação"><input name="cycle" placeholder="Ex. Revisão trimestral" required minLength={2} maxLength={140} /></Field>
        <Field label="Código do avaliador"><input name="reviewer" placeholder="Ex. AV-01" defaultValue={previous?.reviewer} required pattern="[A-Za-z0-9_\-]{2,40}" /></Field>
      </div>
      <p className="form-note">Os campos sem nota recebem 3 provisoriamente. Sem uma referência de evidência, o intervalo simulado para o critério é de 1 a 5.</p>
      {['tech', 'market'].map((axis) => <fieldset className="criterion-group" key={axis}><legend>{axis === 'tech' ? 'Potencial tecnológico' : 'Aderência de mercado'}</legend>
        {model.criteria.filter((item) => item.axis === axis).map((item) => <div className="criterion-input" key={item.key}>
          <Field label={`${item.label} · peso ${item.weight}`}><select name={item.key} defaultValue="">
            <option value="">Sem nota</option>{model.anchors.map((anchor, index) => <option key={anchor} value={index + 1}>{index + 1} · {anchor}</option>)}
          </select></Field>
          <Field label={`Evidência de ${item.label.toLowerCase()}`}><input name={`e_${item.key}`} maxLength={600} placeholder="Ex. Relatório de piloto, seção 4" /></Field>
        </div>)}
      </fieldset>)}
      <ErrorMessage message={error} />
      <FooterButtons onClose={onClose} pending={pending} submit="Registrar avaliação" />
    </form>
  </Modal>
}

function Analysis({ review }) {
  const { analysis } = review
  const axisName = { tech: 'Potencial tecnológico', market: 'Aderência de mercado' }
  return <Card title="Diagnóstico e evidências" subtitle={`${review.cycle} · ${dateLabel(review.created_at)} · ${analysis.version}`}
    action={<Badge kind={analysis.quadrant} />}>
    <div className="analysis-body">
      <div className="axis-scores">{Object.entries(analysis.axes).map(([axis, score]) => <div key={axis}>
        <span>{axisName[axis]}</span><strong>{number(score.nominal, 1)} <small>/ 5</small></strong>
        <small>Faixa plausível de {number(score.low, 1)} a {number(score.high, 1)}</small></div>)}</div>
      <div className={`callout ${analysis.stable ? 'subtle' : 'warning'}`}>
        <strong>{analysis.stable ? 'Quadrante estável sob as faixas simuladas' : 'Quadrante sensível a evidências pendentes'}</strong>
        <span>{percent(analysis.evidence_coverage)} de cobertura ponderada. Quadrantes possíveis: {analysis.possible_quadrants.map((item) => quadrants[item].label).join(', ')}.</span>
      </div>
      <p className="muted">Distância aos limiares para Estrela: {number(analysis.distance_to_star, 2)} ponto(s).</p>
      <details><summary>Ver contribuição por critério</summary>
        <div className="table-scroll"><table><thead><tr><th>Critério</th><th>Peso</th><th>Nota</th><th>Contribuição</th><th>Evidência</th></tr></thead>
          <tbody>{analysis.breakdown.map((item) => <tr key={item.key}><td>{item.label}</td><td>{item.weight}</td><td>{item.score ?? '—'}</td>
            <td>{item.contribution == null ? '—' : number(item.contribution, 2)}</td><td>{review.ratings[item.key]?.evidence || 'Pendente'}</td></tr>)}</tbody>
        </table></div>
      </details>
    </div>
  </Card>
}

export function ProjectPage({ id, model, onRefresh, flash }) {
  const [project, setProject] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)
  const [selected, setSelected] = useState(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    api(`/projects/${id}`).then((result) => { if (active) { setProject(result); setError('') } })
      .catch((problem) => { if (active) setError(problem.message) })
    return () => { active = false }
  }, [id, revision])
  const saved = (reviewAdded = false) => {
    setForm(null)
    if (reviewAdded) setSelected(null)
    setRevision((value) => value + 1)
    onRefresh()
    flash('Registro salvo.')
  }
  if (!project) return <><a className="text-link" href="#/projetos"><ArrowLeft size={17} />Projetos</a>
    {error ? <ErrorMessage message={error} /> : <p role="status">Carregando projeto…</p>}</>
  const base = `/projects/${id}`
  const review = project.reviews.find((item) => item.id === selected) || project.reviews[0]
  const decision = project.decisions.find((item) => item.review_id === review?.id)
  const scenarioLinks = project.scenario_links.filter((item) => item.review_id === review?.id)
  const scenarioField = ['scenario_id', 'Cenário consultado', 'optionalSelect',
    { '': 'Sem cenário vinculado', ...Object.fromEntries(scenarioLinks.map((item) => [item.id, item.name])) }]
  const linkedScenario = scenarioLinks.find((item) => item.id === decision?.scenario_id)
  function openAction(title = '', item = null) {
    if (item) {
      const revisionId = encodeURIComponent(item.updated_at || item.created_at)
      setForm({ title: 'Atualizar ação', fields: actionFields, defaults: item, method: 'PUT',
        path: `${base}/actions/${item.id}?revision=${revisionId}` })
    } else {
      setForm({ title: 'Adicionar ação', fields: actionFields, defaults: { title, owner: project.owner, due: decision.review_due, status: 'aberta' },
        path: `${base}/decisions/${decision.id}/actions` })
    }
  }

  return <>
    <a className="text-link breadcrumb" href="#/projetos"><ArrowLeft size={16} />Projetos</a>
    <div className="page-head"><div><h1>{project.name}</h1><p>{project.domain} · {project.objective}</p></div>
      <div className="head-actions"><button className="button secondary" onClick={() => setForm('edit')}><Pencil size={16} />Editar</button>
        <button className="button primary" onClick={() => setForm('review')} disabled={!model}><Plus size={18} />Nova avaliação</button></div></div>
    <ErrorMessage message={error} />
    <div className="facts card"><div><span>Orçamento estimado</span><strong>{brl(project.cost)}</strong></div>
      <div><span>Capacidade necessária</span><strong>{number(project.hours)} h</strong></div><div><span>Equipe responsável</span><strong>{project.owner}</strong></div>
      {project.description && <p>{project.description}</p>}</div>
    <div className="detail-grid">
      {review ? <Analysis review={review} /> : <Card title="Diagnóstico e evidências"><Empty>Faça a primeira avaliação deste projeto.</Empty></Card>}
      <Card title="Decisão de comitê" subtitle="Escolha gerencial vinculada à avaliação">
        <div className="side-body">
          {review ? <>
            <div className="recommendation"><span>Recomendação do sistema</span><strong>{choices[review.analysis.choice]}</strong></div>
            {decision ? <div className="decision-summary"><strong>{choices[decision.choice]}</strong><span className={`pill ${decision.override ? 'amber-pill' : 'green-pill'}`}>{decision.override ? 'Divergente' : 'Aderente'}</span>
              <p>{decision.rationale}</p><small><CalendarDays size={15} />Revisão em {dateLabel(decision.review_due)} · {decision.reviewer}</small>
              {linkedScenario && <p><a className="text-link" href={`#/cenarios/${linkedScenario.id}`}>{linkedScenario.name}</a></p>}</div>
              : <p className="muted">Aguardando decisão do comitê.</p>}
            <button className="button secondary" onClick={() => setForm({ title: 'Registrar decisão',
              fields: scenarioLinks.length ? [...decisionFields, scenarioField] : decisionFields,
              subtitle: `Recomendação da avaliação: ${choices[review.analysis.choice]}`,
              defaults: { choice: review.analysis.choice, review_due: today() }, path: `${base}/reviews/${review.id}/decisions` })}>
              <ClipboardCheck size={17} />Registrar decisão</button>
          </> : <p className="muted">Registre uma avaliação para iniciar a deliberação.</p>}
        </div>
      </Card>
    </div>
    {review && <Card title="Ações recomendadas" subtitle="Sugestões priorizadas pelas lacunas dos critérios">
      {review.analysis.actions.length ? <div className="records">{review.analysis.actions.map((item) => <div key={item.criterion} className="record-row">
        <span><CheckCircle2 size={17} />{item.text}</span>{decision && <button className="button small secondary" onClick={() => openAction(item.text)}><Plus size={16} />Criar ação</button>}
      </div>)}</div> : <Empty>Os critérios avaliados dispensam ações corretivas pelas regras atuais.</Empty>}
    </Card>}
    <Card title="Plano de ação" subtitle="Responsabilidades, prazos e comprovação"
      action={decision && <button className="button small secondary" onClick={() => openAction()}><Plus size={16} />Adicionar</button>}>
      {project.actions.length ? <div className="records">{project.actions.map((item) => <div key={item.id} className="record-row">
        <div><strong>{item.title}</strong><small>{item.owner} · {dateLabel(item.due)} · {item.status}</small>{item.evidence && <p>{item.evidence}</p>}
          <details><summary>Histórico da ação</summary><ul>{project.action_events.filter((event) => event.action_id === item.id)
            .map((event) => <li key={event.id}>{dateLabel(event.created_at)} · {event.snapshot.status} · {event.snapshot.owner}{event.snapshot.evidence ? ` · ${event.snapshot.evidence}` : ''}</li>)}</ul></details></div>
        <button className="icon-button" aria-label={`Editar ${item.title}`} onClick={() => openAction('', item)}><Pencil size={17} /></button>
      </div>)}</div> : <Empty>{decision ? 'Adicione uma ação para acompanhar a decisão.' : 'O registro de uma decisão habilita o plano de ação.'}</Empty>}
    </Card>
    <Card title="Benefícios" subtitle="Linha de base, meta e medições ao longo do tempo"
      action={decision && <button className="button small secondary" onClick={() => setForm({ title: 'Definir benefício', fields: benefitFields,
        defaults: { due: decision.review_due }, path: `${base}/decisions/${decision.id}/benefits` })}><Plus size={16} />Definir benefício</button>}>
      {project.benefits.length ? <div className="records">{project.benefits.map((item) => <div key={item.id} className="record-row benefit-row">
        <div><strong><Target size={17} />{item.name}</strong>
          <small>Base: {number(item.baseline, 2)} {item.unit} · Meta: {number(item.target, 2)} {item.unit} até {dateLabel(item.due)}</small>
          <p>{item.progress === null ? 'Aguardando medição' : `${percent(item.progress)} do caminho até a meta · Último valor: ${number(item.observations[0].value, 2)} ${item.unit}`}</p>
          {item.observations.length > 0 && <details><summary>Histórico de medições</summary><ul>{item.observations.map((obs) =>
            <li key={obs.id}>{dateLabel(obs.measured_on)} · {number(obs.value, 2)} {item.unit} · {obs.evidence}</li>)}</ul></details>}</div>
        <button className="button small secondary" onClick={() => setForm({ title: 'Registrar medição', fields: observationFields,
          defaults: { measured_on: today() }, path: `${base}/benefits/${item.id}/observations` })}><Plus size={16} />Medir</button>
      </div>)}</div> : <Empty>{decision ? 'Defina um indicador para monitorar o efeito da decisão.' : 'Registre uma decisão para definir um benefício.'}</Empty>}
    </Card>
    <Card title="Histórico" subtitle="Avaliações e decisões registradas">
      {project.reviews.length ? <div className="records">{project.reviews.map((item) => <div key={item.id} className="history-row">
        <button className="record-row record-button" aria-pressed={item.id === review?.id} onClick={() => setSelected(item.id)}>
          <span><FileText size={17} />{item.cycle} · {item.reviewer}</span><span>{dateLabel(item.created_at)} <ChevronRight size={16} /></span></button>
        {project.decisions.filter((entry) => entry.review_id === item.id).map((entry) => <div key={entry.id} className="history-entry">
          <strong>{choices[entry.choice]} · {entry.reviewer} · {dateLabel(entry.created_at)}</strong><p>{entry.rationale}</p></div>)}
      </div>)}</div> : <Empty>O histórico aparecerá após a primeira avaliação.</Empty>}
    </Card>
    {form === 'edit' && <ProjectForm project={project} onClose={() => setForm(null)} onSaved={() => saved()} />}
    {form === 'review' && <ReviewForm pid={id} model={model} previous={review} onClose={() => setForm(null)} onSaved={() => saved(true)} />}
    {form && typeof form === 'object' && <RecordForm config={form} onClose={() => setForm(null)} onSaved={() => saved()} />}
  </>
}
