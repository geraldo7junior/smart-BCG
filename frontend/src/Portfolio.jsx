import { useState } from 'react'
import {
  Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, ClipboardCheck, Crosshair, Folders,
  LayoutGrid, ListFilter, Plus, Search, Sparkles, TrendingUp, CircleHelp, Layers3, Route,
} from 'lucide-react'
import { Badge, Card, Empty, number, percent, quadrants, shortBRL } from './ui'

const ordered = ['star', 'question', 'cash', 'dog']
const quadrantIcons = { star: Sparkles, question: CircleHelp, cash: Layers3, dog: Route }
const ticks = [1, 2, 3, 4, 5]

function Matrix({ projects, onOpen }) {
  const [focused, setFocused] = useState(null)
  const plotted = projects.filter((item) => item.review)
  return <Card title="Matriz estratégica" subtitle="Posicionamento dos projetos na matriz BCG adaptada"
    action={<span className="card-icon" aria-hidden="true"><Crosshair size={17} /></span>} className="matrix-card">
    {plotted.length === 0 ? <Empty>Registre uma avaliação para posicionar um projeto.</Empty> :
      <div className="matrix-area">
        <span className="vertical-axis">Aderência de mercado</span>
        <div className="plot-wrap">
          <div className="plot" role="group" aria-label="Matriz de potencial tecnológico por aderência de mercado">
            <div className="quadrant q-question"><span>INTERROGAÇÃO</span></div>
            <div className="quadrant q-star"><span>ESTRELAS</span></div>
            <div className="quadrant q-dog"><span>REPOSICIONAMENTO</span></div>
            <div className="quadrant q-cash"><span>VACAS LEITEIRAS</span></div>
            {ticks.map((tick) => <span className="tick tick-x" key={`x${tick}`} style={{ left: `${(tick - 1) * 25}%` }}>{tick}</span>)}
            {ticks.map((tick) => <span className="tick tick-y" key={`y${tick}`} style={{ top: `${(5 - tick) * 25}%` }}>{tick}</span>)}
            {plotted.map((item, index) => {
              const { axes, quadrant } = item.review.analysis
              const open = focused === item.id
              return <button type="button" key={item.id} onClick={() => onOpen(item.id)}
                onMouseEnter={() => setFocused(item.id)} onMouseLeave={() => setFocused(null)}
                onFocus={() => setFocused(item.id)} onBlur={() => setFocused(null)}
                className={`project-point ${open ? 'point-focus' : ''}`}
                style={{ left: `${(axes.tech.nominal - 1) * 25}%`, top: `${(5 - axes.market.nominal) * 25}%`, '--dot': quadrants[quadrant].color }}
                aria-label={`${item.name}, potencial ${number(axes.tech.nominal, 1)}, mercado ${number(axes.market.nominal, 1)}`}>
                {index + 1}
                {open && <span className={`point-tooltip ${axes.tech.nominal >= 3 ? 'tooltip-left' : ''}`}>{item.name}</span>}
              </button>
            })}
          </div>
          <span className="horizontal-axis">Potencial tecnológico</span>
        </div>
      </div>}
    <div className="matrix-foot"><span><span className="dash" /> Limiar dos eixos em 3,0</span><span>{plotted.length} {plotted.length === 1 ? 'projeto avaliado' : 'projetos avaliados'}</span></div>
  </Card>
}

function Distribution({ projects }) {
  const counts = Object.fromEntries(ordered.map((key) => [key, 0]))
  for (const item of projects) if (item.review) counts[item.review.analysis.quadrant] += 1
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
  return <Card title="Por quadrante" subtitle="Distribuição dos projetos avaliados" className="distribution">
    <div className="distribution-rows">
      {ordered.map((key) => {
        const info = quadrants[key]
        const Icon = quadrantIcons[key]
        return <div className="distribution-row" key={key} style={{ '--tone': info.tone, '--mark': info.color }}>
          <span className="distribution-icon"><Icon size={18} /></span>
          <div><strong>{info.label}</strong><small>{info.hint}</small></div><b>{counts[key]}</b>
        </div>
      })}
    </div>
    <div className="distribution-foot"><div className="segment-bar" aria-hidden="true">{ordered.map((key) =>
      <span key={key} style={{ flex: counts[key], background: quadrants[key].color }} />)}</div>
      <div><span>{total} {total === 1 ? 'avaliado' : 'avaliados'}</span>
        <span>{projects.length - total} {projects.length - total === 1 ? 'pendente' : 'pendentes'}</span></div>
    </div>
  </Card>
}

function Metric({ label, value, note, icon: Icon, color }) {
  return <div className="card metric">
    <div className="metric-top"><span>{label}</span><span className={`metric-icon ${color}`}><Icon size={17} /></span></div>
    <strong>{value}</strong><small>{note}</small>
  </div>
}

export function Overview({ projects, onOpen, onNew, onExport }) {
  const assessed = projects.filter((item) => item.review)
  const evidenced = assessed.filter((item) => item.review.analysis.evidence_coverage === 1).length
  const fragile = assessed.filter((item) => !item.review.analysis.stable).length
  const cost = projects.reduce((sum, item) => sum + item.cost, 0)
  return <>
    <div className="page-head"><div><h1>Visão geral do portfólio</h1><p>Acompanhe o posicionamento e a qualidade das evidências dos projetos de inovação.</p></div>
      <div className="head-actions"><button className="button secondary" onClick={onExport}><ArrowDownToLine size={17} />Exportar</button>
        <button className="button primary" onClick={onNew}><Plus size={19} />Novo projeto</button></div>
    </div>
    <div className="metrics">
      <Metric label="Projetos no portfólio" value={projects.length} note={`${new Set(projects.map((item) => item.domain)).size} áreas de atuação`} icon={Folders} color="blue" />
      <Metric label="Projetos avaliados" value={assessed.length} note={`${projects.length - assessed.length} aguardando avaliação`} icon={ClipboardCheck} color="green" />
      <Metric label="Orçamento estimado" value={shortBRL(cost)} note="Soma dos custos cadastrados" icon={TrendingUp} color="purple" />
      <Metric label="Evidência completa" value={assessed.length ? percent(evidenced / assessed.length) : '—'} note={`${fragile} com quadrante sensível`} icon={Activity} color="amber" />
    </div>
    <div className="overview-grid"><Matrix projects={projects} onOpen={onOpen} /><Distribution projects={projects} /></div>
    <ProjectList projects={projects} onOpen={onOpen} overview />
  </>
}

export function ProjectList({ projects, onOpen, onNew, overview = false }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const normalized = (value) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  const rows = projects.map((item, index) => ({ item, index })).filter(({ item }) =>
    normalized(`${item.name} ${item.domain}`).includes(normalized(search.trim())) &&
    (!filter || (item.review?.analysis.quadrant || 'pending') === filter))
  return <>
    {!overview && <div className="page-head"><div><h1>Projetos</h1><p>Cadastre iniciativas e consulte o histórico de avaliação e decisão.</p></div>
      <button className="button primary" onClick={onNew}><Plus size={19} />Novo projeto</button></div>}
    <Card title={overview ? 'Projetos do portfólio' : 'Lista de projetos'} subtitle={`${projects.length} projetos cadastrados`}
      action={overview && <a href="#/projetos" className="text-link">Ver todos <ArrowRight size={16} /></a>} className="projects-card">
      {!overview && <div className="filters"><label className="search"><Search size={17} /><input aria-label="Buscar projetos" placeholder="Buscar por projeto ou área" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label className="filter"><ListFilter size={17} /><select aria-label="Filtrar por quadrante" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="">Todos os quadrantes</option>{ordered.map((key) => <option key={key} value={key}>{quadrants[key].label}</option>)}<option value="pending">Sem avaliação</option>
        </select></label></div>}
      {rows.length ? <div className="table-scroll"><table><thead><tr><th>Projeto</th><th>Área</th><th>Quadrante</th><th>Evidência</th><th><span className="sr-only">Abrir</span></th></tr></thead>
        <tbody>{(overview ? rows.slice(0, 5) : rows).map(({ item, index }) => <tr key={item.id}>
          <td><button className="table-project" onClick={() => onOpen(item.id)}><span className="project-avatar" aria-hidden="true">{item.review ? projects.slice(0, index + 1).filter((entry) => entry.review).length : <LayoutGrid size={15} />}</span><strong>{item.name}</strong></button></td>
          <td>{item.domain}</td><td><Badge kind={item.review?.analysis.quadrant} /></td>
          <td>{item.review ? percent(item.review.analysis.evidence_coverage) : '—'}</td>
          <td><button className="icon-button" aria-label={`Abrir ${item.name}`} onClick={() => onOpen(item.id)}><ArrowUpRight size={17} /></button></td>
        </tr>)}</tbody></table></div> : <Empty>{projects.length ? 'Nenhum projeto corresponde aos filtros.' : 'Seu portfólio ainda está vazio.'}</Empty>}
    </Card>
  </>
}
