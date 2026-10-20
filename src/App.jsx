import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, BriefcaseBusiness,
  Building2, CalendarClock, CheckCircle2, ChevronDown, CircleHelp, ClipboardCheck,
  FileCheck2, FolderKanban, LayoutDashboard, ListTodo, LogOut, Menu, Plus,
  Search, Settings2, ShieldCheck, Target, Users, X, Zap
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'WORKSPACE' },
  { id: 'tasks', label: 'Tasks & workflow', icon: ListTodo, group: 'WORKSPACE' },
  { id: 'growth', label: 'Growth & sales', icon: Target, group: 'WORKSPACE' },
  { id: 'projects', label: 'Projects', icon: FolderKanban, group: 'DELIVERY' },
  { id: 'qa', label: 'Quality assurance', icon: ClipboardCheck, group: 'DELIVERY' },
  { id: 'decisions', label: 'Decisions', icon: FileCheck2, group: 'MANAGEMENT' },
]
const DEMO_TASKS = [
  { id: 'd1', title: 'Prepare school systems marketing plan', department: 'Growth & marketing', priority: 'high', status: 'in_progress', due_date: '2026-10-22', owner_name: 'Shelton' },
  { id: 'd2', title: 'Define software QA service packages', department: 'IT & quality', priority: 'high', status: 'todo', due_date: '2026-10-23', owner_name: 'Cipher' },
  { id: 'd3', title: 'Agree first-quarter operating budget', department: 'Management', priority: 'medium', status: 'todo', due_date: '2026-10-24', owner_name: 'Partner review' },
  { id: 'd4', title: 'Create school prospect list', department: 'Growth & marketing', priority: 'medium', status: 'done', due_date: '2026-10-19', owner_name: 'Shelton' },
]
const DEMO_LEADS = [
  { id: 'l1', organization: 'School systems prospects', contact_name: 'Initial prospect research', stage: 'contacted', segment: 'Education', next_follow_up: '2026-10-22', owner_name: 'Shelton' },
  { id: 'l2', organization: 'Software QA opportunities', contact_name: 'Service validation', stage: 'new', segment: 'Software testing', next_follow_up: '2026-10-24', owner_name: 'Cipher' },
  { id: 'l3', organization: 'Potential delivery partner', contact_name: 'Partnership research', stage: 'meeting_booked', segment: 'Partnership', next_follow_up: '2026-10-26', owner_name: 'Unassigned' },
]
const DEMO_PROJECTS = [
  { id: 'p1', title: 'School systems go-to-market', status: 'in_progress', progress: 35, owner_name: 'Shelton', due_date: '2026-11-06' },
  { id: 'p2', title: 'QA service framework', status: 'planning', progress: 20, owner_name: 'Cipher', due_date: '2026-11-12' },
]
const titleCase = value => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, s => s.toUpperCase())
const shortDate = value => value ? new Date(value + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date'
const initials = value => String(value || 'Partner').split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()

function Button({ children, variant = 'primary', ...props }) {
  return <button className={'button ' + variant} {...props}>{children}</button>
}
function Stat({ label, value, note, icon: Icon, trend }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={17}/></span></div><strong className="stat-value">{value}</strong><div className="stat-note">{trend === 'up' ? <ArrowUpRight size={14}/> : trend === 'down' ? <ArrowDownRight size={14}/> : <Activity size={14}/>}<span>{note}</span></div></div>
}
function Badge({ children, tone = 'neutral' }) { return <span className={'badge ' + tone}>{children}</span> }
function Empty({ title, text }) { return <div className="empty-state"><div className="empty-icon"><CircleHelp size={20}/></div><strong>{title}</strong><span>{text}</span></div> }

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [userProfile, setUserProfile] = useState(null)
  const [organization, setOrganization] = useState(null)
  const [active, setActive] = useState('overview')
  const [tasks, setTasks] = useState(() => { try { return JSON.parse(window.localStorage.getItem('workspace-hub-preview-tasks')) || DEMO_TASKS } catch { return DEMO_TASKS } })
  const [leads, setLeads] = useState(() => { try { return JSON.parse(window.localStorage.getItem('workspace-hub-preview-leads')) || DEMO_LEADS } catch { return DEMO_LEADS } })
  const [projects, setProjects] = useState(() => { try { return JSON.parse(window.localStorage.getItem('workspace-hub-preview-projects')) || DEMO_PROJECTS } catch { return DEMO_PROJECTS } })
  const [defects, setDefects] = useState(() => { try { return JSON.parse(window.localStorage.getItem('workspace-hub-preview-defects')) || [] } catch { return [] } })
  const [decisions, setDecisions] = useState(() => { try { return JSON.parse(window.localStorage.getItem('workspace-hub-preview-decisions')) || [] } catch { return [] } })
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createType, setCreateType] = useState('task')
  const [form, setForm] = useState({})
  const [search, setSearch] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) { setAuthLoading(false); return }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) { setUserProfile(null); setOrganization(null); return }
    loadWorkspace()
  }, [session?.user?.id])

  async function loadWorkspace() {
    setLoadError('')
    setTasks([]); setLeads([]); setProjects([]); setDefects([]); setDecisions([])
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('id, organization_id, full_name, role, organizations(id, name, status)')
      .eq('user_id', session.user.id).eq('is_active', true).limit(1).maybeSingle()
    if (memberError) { setLoadError(memberError.message); return }
    if (!member) { setLoadError('Your account is not linked to a workspace yet. Ask a company administrator to add your membership.'); return }
    setUserProfile(member)
    setOrganization(member.organizations)
    const orgId = member.organization_id
    const results = await Promise.all([
      supabase.from('workspace_tasks').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(100),
      supabase.from('growth_opportunities').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(100),
      supabase.from('workspace_projects').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(100),
      supabase.from('qa_defects').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(100),
      supabase.from('workspace_decisions').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(100),
    ])
    const failure = results.find(result => result.error)
    if (failure) { setLoadError(failure.error.message); return }
    setTasks(results[0].data || [])
    setLeads(results[1].data || [])
    setProjects(results[2].data || [])
    setDefects(results[3].data || [])
    setDecisions(results[4].data || [])
  }

  async function signIn(event) {
    event.preventDefault(); setBusy(true); setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setAuthError(error.message)
    setBusy(false)
  }
  async function signOut() { await supabase.auth.signOut(); setSession(null) }
  function openCreate(type) {
    setCreateType(type); setNotice(''); setLoadError('')
    setForm(type === 'task'
      ? { title: '', description: '', department: 'IT & quality', priority: 'medium', status: 'todo', due_date: '', owner_name: '' }
      : type === 'lead'
        ? { organization: '', contact_name: '', segment: 'Education', stage: 'new', next_follow_up: '', notes: '', owner_name: '' }
        : type === 'decision'
          ? { title: '', description: '', status: 'open', due_date: '', owner_name: '' }
          : type === 'project'
            ? { title: '', description: '', status: 'planning', progress: 0, owner_name: '', start_date: '', due_date: '' }
            : { title: '', description: '', status: 'open', severity: 'medium', owner_name: '' })
    setShowCreate(true)
  }
  async function submitCreate(event) {
    event.preventDefault()
    if (isSupabaseConfigured && (!session || !organization)) {
      setLoadError('Your account must be linked to the company workspace before you can save records.')
      return
    }
    if (!isSupabaseConfigured) {
      const item = { ...form, id: 'local-' + Date.now(), created_at: new Date().toISOString(), owner_name: userProfile?.full_name || 'Preview user' }
      if (createType === 'task') setTasks(current => [item, ...current])
      if (createType === 'lead') setLeads(current => [item, ...current])
      if (createType === 'decision') setDecisions(current => [item, ...current])
      if (createType === 'project') setProjects(current => [item, ...current])
      if (createType === 'defect') setDefects(current => [item, ...current])
      setShowCreate(false); setNotice('Saved in this browser only. These changes are not shared with partners.')
      return
    }
    setBusy(true); setLoadError('')
    const table = createType === 'task' ? 'workspace_tasks' : createType === 'lead' ? 'growth_opportunities' : createType === 'decision' ? 'workspace_decisions' : createType === 'project' ? 'workspace_projects' : 'qa_defects'
    const payload = { ...form, organization_id: organization.id, created_by: session.user.id, owner_name: form.owner_name || userProfile?.full_name || null }
    Object.keys(payload).forEach(key => { if (payload[key] === '') payload[key] = null })
    const { error } = await supabase.from(table).insert(payload)
    if (error) setLoadError(error.message)
    else { setShowCreate(false); setNotice('Record saved.'); await loadWorkspace() }
    setBusy(false)
  }
  async function changeTaskStatus(task, status) {
    if (DEMO_TASKS.some(row => row.id === task.id) || String(task.id).startsWith('local-') || !isSupabaseConfigured || !session) {
      setTasks(current => current.map(row => row.id === task.id ? { ...row, status } : row)); return
    }
    const { error } = await supabase.from('workspace_tasks').update({ status }).eq('id', task.id)
    if (error) setLoadError(error.message); else setTasks(current => current.map(row => row.id === task.id ? { ...row, status } : row))
  }

  useEffect(() => { if (!isSupabaseConfigured) { try { window.localStorage.setItem('workspace-hub-preview-tasks', JSON.stringify(tasks)) } catch {} } }, [tasks])
  useEffect(() => { if (!isSupabaseConfigured) { try { window.localStorage.setItem('workspace-hub-preview-leads', JSON.stringify(leads)) } catch {} } }, [leads])
  useEffect(() => { if (!isSupabaseConfigured) { try { window.localStorage.setItem('workspace-hub-preview-projects', JSON.stringify(projects)) } catch {} } }, [projects])
  useEffect(() => { if (!isSupabaseConfigured) { try { window.localStorage.setItem('workspace-hub-preview-defects', JSON.stringify(defects)) } catch {} } }, [defects])
  useEffect(() => { if (!isSupabaseConfigured) { try { window.localStorage.setItem('workspace-hub-preview-decisions', JSON.stringify(decisions)) } catch {} } }, [decisions])

  const activeTasks = tasks.filter(task => task.status !== 'done' && task.status !== 'cancelled')
  const overdue = activeTasks.filter(task => task.due_date && task.due_date < new Date().toISOString().slice(0, 10))
  const openLeads = leads.filter(lead => !['won', 'lost'].includes(lead.stage))
  const followUps = openLeads.filter(lead => lead.next_follow_up && lead.next_follow_up <= new Date().toISOString().slice(0, 10))
  const openDefects = defects.filter(defect => !['closed', 'wont_fix'].includes(defect.status))
  const currentNav = NAV.find(item => item.id === active) || NAV[0]
  const filteredTasks = useMemo(() => tasks.filter(task => [task.title, task.department, task.priority, task.status, task.owner_name].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())), [tasks, search])

  if (authLoading) return <div className="loading-screen"><div className="loader-mark"><Zap size={24}/></div><span>Preparing your workspace…</span></div>
  if (isSupabaseConfigured && !session) return <div className="auth-page"><div className="auth-glow"/><form className="auth-card" onSubmit={signIn}><div className="brand-symbol"><Zap size={22}/></div><p className="eyebrow">PRIVATE COMPANY WORKSPACE</p><h1>Welcome back.</h1><p className="muted">Sign in to continue to your company's operations hub.</p>{authError && <div className="inline-error">{authError}</div>}<label>Email address<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" required /></label><label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required /></label><Button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={16}/></Button><div className="auth-foot"><ShieldCheck size={15}/> Secure sign-in · Authorized partners and team only</div></form></div>

  const demo = !isSupabaseConfigured
  const pageTitle = currentNav.label
  return <div className="app-shell">
    <aside className={'sidebar ' + (mobileNav ? 'sidebar-open' : '')}>
      <div className="brand"><div className="brand-symbol"><Zap size={21}/></div><div><strong>workspace<span>hub</span></strong><small>COMPANY OPERATIONS</small></div><button className="mobile-close" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
      <div className="workspace-switch"><div className="org-avatar"><Building2 size={17}/></div><div><strong>{organization?.name || 'Your Company'}</strong><small>{demo ? 'Preview workspace' : 'Primary workspace'}</small></div><ChevronDown size={15}/></div>
      <div className="nav-scroll">{['WORKSPACE', 'DELIVERY', 'MANAGEMENT'].map(group => <div className="nav-group" key={group}><p>{group}</p>{NAV.filter(item => item.group === group).map(item => { const Icon = item.icon; return <button key={item.id} className={'nav-item ' + (active === item.id ? 'active' : '')} onClick={() => { setActive(item.id); setMobileNav(false); setSearch('') }}><Icon size={17}/><span>{item.label}</span>{item.id === 'tasks' && activeTasks.length > 0 && <small>{activeTasks.length}</small>}</button> })}</div>)}</div>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><ShieldCheck size={17}/></div><strong>One team. Clear ownership.</strong><p>Keep work, decisions and delivery visible to the partners.</p></div><button className="nav-item" onClick={() => setNotice('Workspace settings will be enabled after company setup.')}><Settings2 size={17}/><span>Workspace settings</span></button><div className="user-card"><div className="avatar">{initials(userProfile?.full_name || 'Cipher')}</div><div className="user-meta"><strong>{userProfile?.full_name || 'Partner preview'}</strong><small>{titleCase(userProfile?.role || 'preview mode')}</small></div>{session ? <button className="icon-button" onClick={signOut} title="Sign out"><LogOut size={16}/></button> : <span className="demo-dot" title="Preview mode"/>}</div></div>
    </aside>
    {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation"/>}
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setMobileNav(true)}><Menu size={19}/></button><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{pageTitle}</strong></div></div><div className="topbar-right">{demo && <Badge tone="warning">Preview mode</Badge>}<button className="icon-button notification-button" onClick={() => setNotice('You are all caught up. Notifications will appear here as workflows go live.')} aria-label="Notifications"><Bell size={18}/><i/></button><div className="top-avatar">{initials(userProfile?.full_name || 'CP')}</div></div></header>
      <div className="page-content">
        {loadError && <div className="notice error-notice"><span>{loadError}</span><button onClick={() => setLoadError('')}><X size={15}/></button></div>}
        {notice && <div className="notice"><CheckCircle2 size={16}/><span>{notice}</span><button onClick={() => setNotice('')}><X size={15}/></button></div>}
        {demo && <div className="preview-banner"><Zap size={16}/><div><strong>You're viewing a working preview</strong><span>Preview records stay in this browser only. They are not shared with partners; connect your separate company account later for secure shared data.</span></div><button onClick={() => setNotice('Shared sign-in and multi-device records will be enabled after the new company’s separate database account is connected.')}>Setup guide <ArrowRight size={14}/></button></div>}
        {active === 'overview' && <Overview tasks={tasks} activeTasks={activeTasks} overdue={overdue} openLeads={openLeads} followUps={followUps} projects={projects} openDefects={openDefects} decisions={decisions} onCreate={openCreate} onNavigate={setActive} onTaskStatus={changeTaskStatus}/>}
        {active === 'tasks' && <TasksPage tasks={filteredTasks} search={search} setSearch={setSearch} onCreate={() => openCreate('task')} onStatus={changeTaskStatus}/>}
        {active === 'growth' && <GrowthPage leads={leads} onCreate={() => openCreate('lead')} />}
        {active === 'projects' && <ProjectsPage projects={projects} onCreate={() => openCreate('project')} />}
        {active === 'qa' && <QaPage defects={defects} onCreate={() => openCreate('defect')} />}
        {active === 'decisions' && <DecisionsPage decisions={decisions} onCreate={() => openCreate('decision')} />}
      </div>
      <footer className="app-footer"><span>Workspace Hub <span className="footer-dot">•</span> Built for shared accountability</span><span>{demo ? 'Browser-local preview · Not shared' : organization?.name || 'Workspace'} <span className="footer-dot">•</span> <ShieldCheck size={13}/> Private workspace</span></footer>
    </main>
    {showCreate && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowCreate(false) }}><form className="modal" onSubmit={submitCreate}><div className="modal-head"><div><p className="eyebrow">ADD TO WORKSPACE</p><h2>{createType === 'task' ? 'Create a task' : createType === 'lead' ? 'Add an opportunity' : createType === 'decision' ? 'Record a decision' : createType === 'project' ? 'Create a project' : 'Log a QA defect'}</h2></div><button type="button" className="icon-button" onClick={() => setShowCreate(false)}><X size={18}/></button></div>
      <label>{createType === 'lead' ? 'Organisation / opportunity name' : 'Title'}<input autoFocus value={form.title ?? form.organization ?? ''} onChange={event => setForm(current => ({ ...current, [createType === 'lead' ? 'organization' : 'title']: event.target.value }))} required /></label>
      {createType === 'lead' && <><label>Contact / context<input value={form.contact_name || ''} onChange={event => setForm(current => ({ ...current, contact_name: event.target.value }))} placeholder="Person, school, or next step"/></label><div className="form-grid"><label>Business line<select value={form.segment} onChange={event => setForm(current => ({ ...current, segment: event.target.value }))}><option>Education</option><option>Software testing</option><option>Software development</option><option>Other</option></select></label><label>Pipeline stage<select value={form.stage} onChange={event => setForm(current => ({ ...current, stage: event.target.value }))}>{['new','contacted','meeting_booked','proposal_sent','won','lost'].map(value => <option value={value} key={value}>{titleCase(value)}</option>)}</select></label></div><label>Next follow-up<input type="date" value={form.next_follow_up || ''} onChange={event => setForm(current => ({ ...current, next_follow_up: event.target.value }))}/></label><label>Owner<input value={form.owner_name || ''} onChange={event => setForm(current => ({ ...current, owner_name: event.target.value }))} placeholder="Cipher, Shelton, or partner"/></label></>}
      {createType === 'task' && <><label>Description<textarea rows="3" value={form.description || ''} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="What needs to be done and what does done look like?"/></label><div className="form-grid"><label>Department<select value={form.department} onChange={event => setForm(current => ({ ...current, department: event.target.value }))}><option>IT & quality</option><option>Growth & marketing</option><option>Management</option><option>Finance & administration</option><option>Operations</option></select></label><label>Priority<select value={form.priority} onChange={event => setForm(current => ({ ...current, priority: event.target.value }))}><option>low</option><option>medium</option><option>high</option><option>urgent</option></select></label></div><div className="form-grid"><label>Status<select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="done">Done</option></select></label><label>Due date<input type="date" value={form.due_date || ''} onChange={event => setForm(current => ({ ...current, due_date: event.target.value }))}/></label></div><label>Owner<input value={form.owner_name || ''} onChange={event => setForm(current => ({ ...current, owner_name: event.target.value }))} placeholder="Person responsible"/></label></>}
      {createType === 'project' && <><label>Project description<textarea rows="3" value={form.description || ''} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="Outcome, scope and what delivery should achieve"/></label><div className="form-grid"><label>Status<select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))}><option value="planning">Planning</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="done">Done</option><option value="cancelled">Cancelled</option></select></label><label>Progress (%)<input type="number" min="0" max="100" value={form.progress} onChange={event => setForm(current => ({ ...current, progress: Number(event.target.value) }))}/></label></div><div className="form-grid"><label>Start date<input type="date" value={form.start_date || ''} onChange={event => setForm(current => ({ ...current, start_date: event.target.value }))}/></label><label>Due date<input type="date" value={form.due_date || ''} onChange={event => setForm(current => ({ ...current, due_date: event.target.value }))}/></label></div><label>Owner<input value={form.owner_name || ''} onChange={event => setForm(current => ({ ...current, owner_name: event.target.value }))} placeholder="Partner responsible"/></label></>}
      {createType === 'decision' && <><label>Decision details<textarea rows="3" value={form.description || ''} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="Context, options and agreed outcome"/></label><label>Review date<input type="date" value={form.due_date || ''} onChange={event => setForm(current => ({ ...current, due_date: event.target.value }))}/></label><label>Owner<input value={form.owner_name || ''} onChange={event => setForm(current => ({ ...current, owner_name: event.target.value }))} placeholder="Partner responsible"/></label></>}
      {createType === 'defect' && <><label>Description<textarea rows="3" value={form.description || ''} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} required placeholder="Steps to reproduce, expected vs actual behaviour"/></label><div className="form-grid"><label>Severity<select value={form.severity} onChange={event => setForm(current => ({ ...current, severity: event.target.value }))}><option>low</option><option>medium</option><option>high</option><option>critical</option></select></label><label>Status<select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))}><option>open</option><option>triaged</option><option>in_progress</option><option>fixed</option><option>retest</option><option>closed</option></select></label></div><label>Owner<input value={form.owner_name || ''} onChange={event => setForm(current => ({ ...current, owner_name: event.target.value }))} placeholder="Person responsible for the fix"/></label></>}
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save record'} <ArrowRight size={15}/></Button></div>
    </form></div>}
  </div>
}

function PageHeader({ eyebrow, title, subtitle, action }) { return <div className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{subtitle}</p></div>{action}</div> }
function Overview({ tasks, activeTasks, overdue, openLeads, followUps, projects, openDefects, decisions, onCreate, onNavigate, onTaskStatus }) {
  const recent = activeTasks.slice(0, 4)
  return <><PageHeader eyebrow="COMPANY PULSE" title="Good work starts with visibility." subtitle="Your shared view of priorities, delivery and the next actions that move the business forward." action={<Button onClick={() => onCreate('task')}><Plus size={16}/> New task</Button>}/>
    <div className="welcome-strip"><div className="welcome-mark"><Zap size={20}/></div><div><strong>One workspace for every business line.</strong><p>Keep responsibilities clear, move work forward and give all partners a reliable view of the day.</p></div><div className="welcome-avatars"><span>CP</span><span>SH</span><span>3+</span></div></div>
    <div className="stats-grid"><Stat label="Open tasks" value={activeTasks.length} note={overdue.length ? overdue.length + ' overdue' : 'No overdue tasks'} icon={ListTodo} trend={overdue.length ? 'down' : 'up'}/><Stat label="Active opportunities" value={openLeads.length} note={followUps.length ? followUps.length + ' follow-ups due' : 'Pipeline being built'} icon={Target}/><Stat label="Active projects" value={projects.filter(project => !['done','completed'].includes(project.status)).length} note="Across business lines" icon={FolderKanban}/><Stat label="Open QA defects" value={openDefects.length} note="Track fixes and retests" icon={ShieldCheck}/></div>
    <div className="content-grid"><section className="panel task-panel"><div className="panel-heading"><div><p className="eyebrow">EXECUTION</p><h2>Priority work</h2></div><button className="text-action" onClick={() => onNavigate('tasks')}>View all <ArrowRight size={14}/></button></div>{recent.length ? <div className="task-list">{recent.map(task => <TaskRow key={task.id} task={task} onStatus={onTaskStatus}/>)}</div> : <Empty title="No active tasks" text="Create a task to start coordinating work."/>}</section>
    <section className="panel pulse-panel"><div className="panel-heading"><div><p className="eyebrow">ATTENTION NEEDED</p><h2>Keep an eye on</h2></div><span className="live-indicator"><i/> Live view</span></div><AttentionRow icon={CalendarClock} title="Overdue work" detail={overdue.length ? overdue.length + ' tasks need attention' : 'Nothing overdue right now'} tone={overdue.length ? 'warning' : 'success'}/><AttentionRow icon={Target} title="Follow-ups" detail={followUps.length ? followUps.length + ' opportunities due' : 'No follow-ups due today'} tone={followUps.length ? 'warning' : 'neutral'}/><AttentionRow icon={ClipboardCheck} title="QA & testing" detail={openDefects.length ? openDefects.length + ' defects still open' : 'No defects logged'} tone={openDefects.length ? 'warning' : 'success'}/><AttentionRow icon={FileCheck2} title="Partner decisions" detail={decisions.filter(decision => decision.status === 'open').length + ' decisions awaiting closure'} tone="neutral"/></section></div>
    <div className="lower-grid"><section className="panel"><div className="panel-heading"><div><p className="eyebrow">PIPELINE</p><h2>Growth opportunities</h2></div><button className="text-action" onClick={() => onNavigate('growth')}>Open pipeline <ArrowRight size={14}/></button></div>{openLeads.slice(0,3).map(lead => <div className="compact-row" key={lead.id}><div className="row-mark"><Target size={15}/></div><div className="row-main"><strong>{lead.organization || lead.title}</strong><span>{lead.segment || 'General'} · Follow-up {shortDate(lead.next_follow_up)}</span></div><Badge tone={lead.stage === 'won' ? 'success' : 'neutral'}>{titleCase(lead.stage)}</Badge></div>)}{!openLeads.length && <Empty title="Pipeline is ready" text="Add your first opportunity."/>}</section>
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">DELIVERY</p><h2>Project progress</h2></div><button className="text-action" onClick={() => onNavigate('projects')}>All projects <ArrowRight size={14}/></button></div>{projects.slice(0,3).map(project => <div className="project-row" key={project.id}><div className="project-row-top"><div><strong>{project.title}</strong><span>{project.owner_name || 'Owner to be assigned'} · Due {shortDate(project.due_date)}</span></div><Badge tone={project.status === 'done' ? 'success' : 'neutral'}>{titleCase(project.status)}</Badge></div><div className="progress-track"><span style={{ width: Math.max(0, Math.min(100, Number(project.progress || 0))) + '%' }}/></div></div>)}{!projects.length && <Empty title="No projects yet" text="Projects will appear here when added."/>}</section></div>
  </>
}
function AttentionRow({ icon: Icon, title, detail, tone }) { return <div className="attention-row"><div className={'attention-icon ' + tone}><Icon size={17}/></div><div><strong>{title}</strong><span>{detail}</span></div><ArrowRight size={15} className="attention-arrow"/></div> }
function TaskRow({ task, onStatus }) { return <div className="task-row"><button className={'task-check ' + (task.status === 'done' ? 'checked' : '')} onClick={() => onStatus(task, task.status === 'done' ? 'todo' : 'done')} aria-label="Toggle task completion">{task.status === 'done' && <CheckCircle2 size={15}/>}</button><div className="task-main"><strong>{task.title}</strong><span>{task.department || 'General'} · {task.owner_name || 'Owner unassigned'}</span></div><Badge tone={task.priority === 'urgent' || task.priority === 'high' ? 'warning' : 'neutral'}>{task.priority || 'medium'}</Badge><span className="task-date">{shortDate(task.due_date)}</span></div> }
function TasksPage({ tasks, search, setSearch, onCreate, onStatus }) { return <><PageHeader eyebrow="EXECUTION & ACCOUNTABILITY" title="Tasks & workflow" subtitle="Every task has a clear owner, priority, status and next deadline." action={<Button onClick={onCreate}><Plus size={16}/> New task</Button>}/><section className="panel"><div className="list-toolbar"><div className="search-field"><Search size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search tasks, teams or status"/></div><span className="muted small-text">{tasks.length} tasks</span></div>{tasks.length ? <div className="task-list">{tasks.map(task => <TaskRow key={task.id} task={task} onStatus={onStatus}/>)}</div> : <Empty title="No matching tasks" text="Try another search or create a task."/>}</section></> }
function GrowthPage({ leads, onCreate }) { return <><PageHeader eyebrow="MARKETING & SALES" title="Growth pipeline" subtitle="Track leads from first contact to proposal, conversion and follow-up." action={<Button onClick={onCreate}><Plus size={16}/> Add opportunity</Button>}/><div className="stats-grid three"><Stat label="Total opportunities" value={leads.length} note="Across business lines" icon={Target}/><Stat label="In progress" value={leads.filter(item => !['won','lost'].includes(item.stage)).length} note="Open pipeline" icon={Activity}/><Stat label="Follow-ups due" value={leads.filter(item => item.next_follow_up && item.next_follow_up <= new Date().toISOString().slice(0,10) && !['won','lost'].includes(item.stage)).length} note="Next action needed" icon={CalendarClock}/></div><section className="panel"><div className="panel-heading"><div><p className="eyebrow">OPPORTUNITY REGISTER</p><h2>Prospects & partnerships</h2></div></div>{leads.length ? <div className="table-wrap"><table><thead><tr><th>Opportunity</th><th>Business line</th><th>Stage</th><th>Owner</th><th>Next follow-up</th><th>Contact / context</th></tr></thead><tbody>{leads.map(lead => <tr key={lead.id}><td><strong>{lead.organization || lead.title}</strong></td><td>{lead.segment || 'General'}</td><td><Badge tone={lead.stage === 'won' ? 'success' : 'neutral'}>{titleCase(lead.stage)}</Badge></td><td>{lead.owner_name || 'Unassigned'}</td><td>{shortDate(lead.next_follow_up)}</td><td>{lead.contact_name || lead.notes || '—'}</td></tr>)}</tbody></table></div> : <Empty title="Start building the pipeline" text="Add school-system prospects, QA clients, partnerships or other business opportunities."/>}</section></> }
function ProjectsPage({ projects, onCreate }) { return <><PageHeader eyebrow="DELIVERY MANAGEMENT" title="Projects" subtitle="Group related work into initiatives, milestones and measurable outcomes." action={<Button onClick={onCreate}><Plus size={16}/> New project</Button>}/><div className="project-cards">{projects.map(project => <div className="panel project-card" key={project.id}><div className="project-card-icon"><BriefcaseBusiness size={19}/></div><Badge tone={project.status === 'done' ? 'success' : 'neutral'}>{titleCase(project.status)}</Badge><h3>{project.title}</h3><p>{project.description || 'A shared initiative tracked by the company partners.'}</p><div className="project-card-meta"><span><Users size={14}/> {project.owner_name || 'Owner to be assigned'}</span><span><CalendarClock size={14}/> {shortDate(project.due_date)}</span></div><div className="progress-track"><span style={{ width: Math.max(0, Math.min(100, Number(project.progress || 0))) + '%' }}/></div><small>{Number(project.progress || 0)}% complete</small></div>)}{!projects.length && <div className="panel"><Empty title="Your project space is ready" text="Create your first project to coordinate milestones and delivery." /></div>}</div></> }
function QaPage({ defects, onCreate }) { return <><PageHeader eyebrow="QUALITY ENGINEERING" title="Quality assurance" subtitle="Record defects, manage retesting and protect the quality of every delivery." action={<Button onClick={onCreate}><Plus size={16}/> Log defect</Button>}/><div className="stats-grid three"><Stat label="Open defects" value={defects.filter(item => !['closed','wont_fix'].includes(item.status)).length} note="Awaiting resolution" icon={ShieldCheck}/><Stat label="High / critical" value={defects.filter(item => ['high','critical'].includes(item.severity) && !['closed','wont_fix'].includes(item.status)).length} note="Prioritise these" icon={Activity}/><Stat label="Ready to retest" value={defects.filter(item => item.status === 'retest').length} note="Verification required" icon={ClipboardCheck}/></div><section className="panel"><div className="panel-heading"><div><p className="eyebrow">DEFECT REGISTER</p><h2>Issues & fixes</h2></div></div>{defects.length ? <div className="table-wrap"><table><thead><tr><th>Defect</th><th>Severity</th><th>Status</th><th>Owner</th><th>Description</th></tr></thead><tbody>{defects.map(item => <tr key={item.id}><td><strong>{item.title}</strong></td><td><Badge tone={['high','critical'].includes(item.severity) ? 'warning' : 'neutral'}>{titleCase(item.severity)}</Badge></td><td>{titleCase(item.status)}</td><td>{item.owner_name || 'Unassigned'}</td><td>{item.description || '—'}</td></tr>)}</tbody></table></div> : <Empty title="No defects logged" text="Log and track defects from testing through fix verification."/>}</section></> }
function DecisionsPage({ decisions, onCreate }) { return <><PageHeader eyebrow="PARTNER GOVERNANCE" title="Decisions & approvals" subtitle="Record important decisions, owners and follow-through so agreements don't get lost in chats." action={<Button onClick={onCreate}><Plus size={16}/> Record decision</Button>}/><section className="panel">{decisions.length ? decisions.map(item => <div className="decision-row" key={item.id}><div className="decision-mark"><FileCheck2 size={17}/></div><div className="row-main"><strong>{item.title}</strong><span>{item.description || 'No decision notes yet'} · Owner {item.owner_name || 'Unassigned'} · Review {shortDate(item.due_date)}</span></div><Badge tone={item.status === 'approved' || item.status === 'closed' ? 'success' : 'neutral'}>{titleCase(item.status)}</Badge></div>) : <Empty title="Keep partner decisions documented" text="Record the decision, reasoning and follow-up date for important company choices."/>}</section></> }
