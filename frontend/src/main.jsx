import { StrictMode, useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Boxes, ChartNoAxesCombined, ChevronDown, FlaskConical, FolderKanban, LayoutDashboard, Menu, PanelTop, X } from 'lucide-react'
import { api, ErrorMessage } from './ui'
import { Overview, ProjectList } from './Portfolio'
import { ProjectForm, ProjectPage } from './Project'
import { Scenarios } from './Scenarios'
import { ExportForm, Research } from './Research'
import '@fontsource-variable/inter'
import './styles.css'

const pages = [
  ['/', 'Visão geral', LayoutDashboard],
  ['/projetos', 'Projetos', FolderKanban],
  ['/cenarios', 'Cenários', ChartNoAxesCombined],
  ['/pesquisa', 'Pesquisa', FlaskConical],
]
const getRoute = () => window.location.hash.slice(1) || '/'
const openProject = (id) => { window.location.hash = `/projetos/${id}` }

function App() {
  const [route, setRoute] = useState(getRoute)
  const [projects, setProjects] = useState(null)
  const [model, setModel] = useState(null)
  const [error, setError] = useState('')
  const [projectError, setProjectError] = useState('')
  const [activeForm, setActiveForm] = useState(null)
  const [mobile, setMobile] = useState(false)
  const [notice, setNotice] = useState(null)
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  const flash = useCallback((message) => setNotice({ message }), [])
  useEffect(() => {
    const change = () => { setRoute(getRoute()); setMobile(false); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])
  useEffect(() => {
    let active = true
    api('/model').then((result) => { if (active) setModel(result) }).catch((problem) => { if (active) setError(problem.message) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    let active = true
    api('/projects').then((items) => { if (active) { setProjects(items); setProjectError('') } })
      .catch((problem) => { if (active) setProjectError(problem.message) })
    return () => { active = false }
  }, [revision])
  useEffect(() => {
    if (notice === null) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])
  const active = pages.find(([path]) => path === route || (path !== '/' && route.startsWith(path + '/')))
  const projectId = /^\/projetos\/([A-Za-z0-9]+)$/.exec(route)?.[1]
  const scenarioId = /^\/cenarios\/([a-f0-9]{32})$/.exec(route)?.[1]
  const newProject = () => setActiveForm('new')
  const onExport = () => setActiveForm('export')
  const close = () => setActiveForm(null)
  const showPortfolio = route === '/' || route === '/projetos'
  const synthetic = projects?.some((item) => item.origin === 'synthetic')
  return <div className="app">
    <a className="skip-link" href="#main" onClick={(event) => { event.preventDefault(); document.getElementById('main').focus() }}>Ir para o conteúdo</a>
    {mobile && <button className="backdrop" aria-label="Fechar menu" onClick={() => setMobile(false)} />}
    <aside className={`sidebar ${mobile ? 'is-open' : ''}`} id="sidebar">
      <a className="brand" href="#/" onClick={() => setMobile(false)}><span className="brand-icon"><Boxes size={23} strokeWidth={1.8} /></span><span><strong>SmartBCG</strong><small>Gestão de portfólio</small></span></a>
      <nav aria-label="Navegação principal">
        {pages.map(([path, label, Icon]) => <a key={path} href={`#${path}`} className={active?.[0] === path ? 'active' : ''} aria-current={active?.[0] === path ? 'page' : undefined}
          onClick={() => setMobile(false)}><Icon size={19} strokeWidth={1.8} />{label}</a>)}
      </nav>
      <div className="sidebar-foot"><span className="workspace-icon"><PanelTop size={17} /></span><div><strong>SmartBCG Local</strong>
        <small>{synthetic ? 'Ambiente de demonstração' : 'Ambiente de pesquisa'}</small></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><button className="icon-button mobile-toggle" aria-label={mobile ? 'Fechar menu' : 'Abrir menu'}
        aria-controls="sidebar" aria-expanded={mobile} onClick={() => setMobile(!mobile)}>{mobile ? <X size={21} /> : <Menu size={21} />}</button>
        <div className="top-path"><span>Portfólio</span><ChevronDown className="top-chevron" size={13} /><strong>{active?.[1] || 'SmartBCG'}</strong></div>
        <span className="top-status"><i />{synthetic ? 'Dados de demonstração' : 'Ambiente local'}</span>
      </header>
      <main id="main" tabIndex={-1}>
        <ErrorMessage message={error || (showPortfolio ? projectError : '')} />
        {showPortfolio && projects === null && !projectError && <p role="status">Carregando portfólio…</p>}
        {route === '/' && projects && <Overview projects={projects} onOpen={openProject} onNew={newProject} onExport={onExport} />}
        {route === '/projetos' && projects && <ProjectList projects={projects} onOpen={openProject} onNew={newProject} />}
        {projectId && <ProjectPage key={projectId} id={projectId} model={model} onRefresh={refresh} flash={flash} />}
        {(route === '/cenarios' || scenarioId) && <Scenarios key={scenarioId || 'scenarios'} initialId={scenarioId} flash={flash} />}
        {route === '/pesquisa' && <Research flash={flash} onExport={onExport} />}
        {!showPortfolio && !projectId && !scenarioId && !['/cenarios', '/pesquisa'].includes(route) && <><h1>Página indisponível</h1><a className="text-link" href="#/">Voltar ao portfólio</a></>}
      </main>
    </div>
    {activeForm === 'new' && <ProjectForm onClose={close} onSaved={(item) => { close(); refresh(); openProject(item.id); flash('Projeto cadastrado.') }} />}
    {activeForm === 'export' && <ExportForm onClose={close} />}
    {notice && <div className="toast" role="status">{notice.message}</div>}
  </div>
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
