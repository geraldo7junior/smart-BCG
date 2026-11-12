import { useEffect, useState } from 'react'
import { Archive, ClipboardList, Database, FileUp, FlaskConical, Plus, Timer } from 'lucide-react'
import { api, Card, choices, conditions, dateLabel, Download, Empty, ErrorMessage, Field, FooterButtons, Modal } from './ui'

function StudyForm({ onClose, onSaved }) {
  const [start, setStart] = useState(null)
  const [seconds, setSeconds] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  async function save(event) {
    event.preventDefault()
    const form = Object.fromEntries(new FormData(event.currentTarget))
    for (const key of ['period', 'elapsed_seconds', 'confidence']) form[key] = Number(form[key])
    setError('')
    setPending(true)
    try {
      onSaved(await api('/study', 'POST', form))
    } catch (problem) {
      setError(problem.message)
      setPending(false)
    }
  }
  return <Modal title="Registrar sessão" subtitle="Use códigos do protocolo e a condição designada ao participante." onClose={() => { if (!pending) onClose() }}>
    <form onSubmit={save}>
      <div className="form-grid">
        <Field label="Código do participante"><input name="participant" placeholder="P-01" required minLength={2} maxLength={40} /></Field>
        <Field label="Código do caso"><input name="case_code" placeholder="C-01" required minLength={2} maxLength={40} /></Field>
        <Field label="Versão do caso"><input name="case_version" placeholder="v1" required minLength={2} maxLength={40} /></Field>
        <Field label="Condição"><select name="condition">{Object.entries(conditions).map(([key, value]) => <option value={key} key={key}>{value}</option>)}</select></Field>
        <Field label="Período"><input type="number" name="period" min="1" max="20" defaultValue="1" required /></Field>
        <Field label="Duração (segundos)"><input type="number" name="elapsed_seconds" min="1" max="86400" value={seconds} onChange={(event) => setSeconds(event.target.value)} required /></Field>
        <button type="button" className="button secondary" onClick={() => {
          if (start === null) setStart(performance.now())
          else { setSeconds(String(Math.max(1, Math.round((performance.now() - start) / 1000)))); setStart(null) }
        }}><Timer size={17} />{start === null ? 'Iniciar cronômetro' : 'Parar cronômetro'}</button>
        <span className="muted align-center" role="status">{start !== null ? 'Cronômetro em andamento' : ''}</span>
        <Field label="Decisão"><select name="choice">{Object.entries(choices).map(([key, value]) => <option value={key} key={key}>{value}</option>)}</select></Field>
        <Field label="Confiança (1 a 5)"><input name="confidence" type="number" min="1" max="5" defaultValue="3" required /></Field>
        <Field label="Justificativa" className="full"><textarea name="rationale" minLength={10} maxLength={2000} rows={3} required /></Field>
      </div>
      <ErrorMessage message={error} />
      <FooterButtons onClose={onClose} pending={pending || start !== null} submit="Salvar sessão" />
    </form>
  </Modal>
}

export function ExportForm({ onClose }) {
  const [synthetic, setSynthetic] = useState(false)
  const [includeText, setIncludeText] = useState(false)
  return <Modal title="Exportar dados de pesquisa" onClose={onClose}>
    <div className="export-options">
      <label className="check"><input type="checkbox" checked={synthetic} onChange={(event) => setSynthetic(event.target.checked)} />Incluir projetos e cenários de demonstração no JSON</label>
      <label className="check"><input type="checkbox" checked={includeText} onChange={(event) => setIncludeText(event.target.checked)} />Incluir justificativas e demais campos textuais</label>
      <p className="muted">Revise códigos, áreas, unidades e texto livre antes de compartilhar os dados.</p>
      <div className="head-actions"><Download href={`/api/export/research.json?include_synthetic=${synthetic}&include_text=${includeText}`}>Dados e decisões (JSON)</Download>
        <Download href={`/api/export/study.csv?include_text=${includeText}`}>Sessões (CSV)</Download></div>
    </div>
  </Modal>
}

export function Research({ flash, onExport }) {
  const [runs, setRuns] = useState(null)
  const [legacy, setLegacy] = useState(null)
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    Promise.all([api('/study'), api('/legacy')]).then(([records, archive]) => {
      if (active) { setRuns(records); setLegacy(archive) }
    }).catch((problem) => { if (active) setError(problem.message) })
    return () => { active = false }
  }, [])
  async function importLegacy(event) {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    setError('')
    setPending(true)
    try {
      if (file.size > 1_000_000) throw new Error('Selecione um JSON de até 1 MB.')
      const data = JSON.parse(await file.text())
      const result = await api('/legacy', 'POST', data)
      setLegacy(await api('/legacy'))
      flash(`${result.imported} registros arquivados · ${result.duplicates} duplicados.`)
    } catch (problem) {
      setError(problem.message)
    } finally {
      setPending(false)
    }
  }
  return <>
    <div className="page-head"><div><h1>Pesquisa e evidências</h1><p>Registre sessões de avaliação e extraia dados para análise.</p></div>
      <div className="head-actions"><button className="button secondary" onClick={onExport}><Database size={17} />Exportar</button>
        <button className="button primary" onClick={() => setOpen(true)}><Plus size={18} />Registrar sessão</button></div></div>
    <ErrorMessage message={error} />
    <div className="research-grid">
      {[[ClipboardList, 'Manual', 'Deliberação baseada no dossiê e nos materiais usuais.'],
        [Archive, 'Matriz estruturada', 'Critérios e quadrantes apresentados com a ficha de avaliação.'],
        [FlaskConical, 'SmartBCG completo', 'Sensibilidade, cenários e trilha de decisão disponíveis.']].map(([Icon, title, note]) =>
        <div className="card research-card" key={title}><span className="metric-icon blue"><Icon size={18} /></span><h2>{title}</h2><p>{note}</p></div>)}
    </div>
    <Card title="Sessões registradas" subtitle="Acompanhamento por participante, caso e condição">
      {runs?.length ? <div className="table-scroll"><table><thead><tr><th>Participante</th><th>Caso</th><th>Condição</th><th>Período</th><th>Tempo</th><th>Decisão</th><th>Confiança</th></tr></thead>
        <tbody>{runs.map((run) => <tr key={run.id}><td>{run.participant}</td><td>{run.case_code} · {run.case_version}</td><td>{conditions[run.condition]}</td>
          <td>{run.period}</td><td>{run.elapsed_seconds} s</td><td>{choices[run.choice]}</td><td>{run.confidence}/5</td></tr>)}</tbody></table></div> :
        <Empty>{runs ? 'Nenhuma sessão registrada.' : error ? 'Sessões indisponíveis.' : 'Carregando sessões…'}</Empty>}
    </Card>
    <Card title="Arquivo Hoshin" subtitle="Importe o data.json dos protótipos para consultar os dados originais."
      action={<label className={`button secondary file-button ${pending ? 'disabled' : ''}`}><FileUp size={17} />{pending ? 'Importando…' : 'Importar JSON'}
        <input type="file" accept=".json,application/json" aria-label="Importar JSON legado" disabled={pending} onChange={importLegacy} /></label>}>
      {legacy?.length ? <div className="records">{legacy.map((item) => <details className="legacy-row" key={item.id}>
        <summary>{item.name} · {dateLabel(item.created_at)}</summary><dl>{Object.entries(item.raw).map(([key, value]) =>
          <div key={key}><dt>{key}</dt><dd>{value ?? '—'}</dd></div>)}</dl></details>)}</div> : <Empty>Os projetos legados ficam disponíveis para consulta de origem.</Empty>}
    </Card>
    {open && <StudyForm onClose={() => setOpen(false)} onSaved={(run) => {
      setRuns((current) => [run, ...(current || [])])
      setOpen(false)
      flash('Sessão registrada.')
    }} />}
  </>
}
