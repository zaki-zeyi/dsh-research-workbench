import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowUpRight, ArrowLeft, ArrowRight, Plus, Search, Globe2, Library, FlaskConical, Check, ChevronDown, Clock3, FileText, X, LoaderCircle, RefreshCw, Square, ExternalLink, Sparkles, Command, BookOpen, Activity, AlertCircle } from 'lucide-react';
import './style.css';
import '../plugin/workbench-theme.css';
import { hostOrigin } from './host-origin.mjs';
import { conversationEntries } from './conversation.mjs';
import { TerminalPanel } from './TerminalPanel.jsx';

async function api(path, options) {
  const r = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
  const body = await r.json(); if (!r.ok) throw new Error(body.error ?? '请求失败'); return body;
}
const agentName = task => task?.nativeSession ? 'DSH 原生会话' : task?.ai?.agent === 'dsh' ? 'dsh tui' : 'Codex';
const date = v => new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai', hour12: false }).format(new Date(v));
const promptFor = (d, s, rootName = '调研工作台', folderUrl) => `帮我在【${s === 'web' ? '全网' : s}】进行【${d || '调研方向'}】的调研，整理成带数据来源的报告。${folderUrl ? `报告上传到指定飞书文件夹【${folderUrl}】。` : `报告上传到飞书云盘根目录【${rootName}】。`}`;
function stateOf(t) {
  if (t.status === 'failed') return ['failed', '调研失败'];
  if (t.status === 'interrupted') return ['failed', '已中断'];
  if (t.status === 'queued') return ['queued', '排队中'];
  if (t.status === 'running') return ['running', '调研中'];
  if (t.publication.owner === 'agent' && t.publication.status === 'not_requested') return ['ready', '报告已生成'];
  if (t.publication.owner === 'agent' && t.publication.status === 'awaiting_authorization') return ['warning', '待飞书授权'];
  if (t.publication.owner === 'agent' && ['waiting_agent', 'publishing'].includes(t.publication.status)) return ['running', '待 Agent 保存'];
  if (t.publication.owner === 'agent' && t.publication.status === 'failed') return ['warning', '飞书保存待处理'];
  if (['failed', 'interrupted'].includes(t.publication.status)) return ['warning', '保存失败'];
  if (t.publication.status === 'published') return ['ready', '已完成'];
  return ['running', '保存中'];
}
function Badge({ task }) { const [kind, label] = stateOf(task); return <span className={`badge ${kind}`}><i />{label}</span>; }
function PublicationActions({ task, onTerminal, onPublish }) {
  const [sending, setSending] = useState(false);
  const [qrFailed, setQrFailed] = useState(false), [qrAttempt, setQrAttempt] = useState(0), [now, setNow] = useState(Date.now);
  const p = task.publication;
  useEffect(() => { setQrFailed(false); setQrAttempt(0); }, [task.id, p.authorizationUrl, p.requestId]);
  useEffect(() => { if (p.status !== 'awaiting_authorization' || !p.expiresAt) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [p.status, p.expiresAt]);
  useEffect(() => { if (!qrFailed || qrAttempt >= 5) return; const timer = setTimeout(() => { setQrFailed(false); setQrAttempt(value => value + 1); }, 1500); return () => clearTimeout(timer); }, [qrFailed, qrAttempt]);
  if (!task.report || task.mode === 'demo') return null;
  const published = p.target === 'feishu' && p.status === 'published';
  const awaiting = p.status === 'awaiting_authorization';
  const busy = sending || p.status === 'publishing';
  const expired = p.expiresAt && Date.parse(p.expiresAt) <= now;
  return <section className="publication-actions" aria-label="Agent 飞书交付">
    <div className="agent-delivery-summary"><strong>{published ? 'Agent 已保存到飞书' : awaiting ? '请扫码授权飞书' : p.status === 'failed' ? 'Agent 保存飞书需要处理' : busy ? 'Agent 正在保存飞书' : task.autoUpload ? '报告已生成，等待保存到飞书' : '报告已生成，可按需上传飞书'}</strong>
      <small>{published ? '链接来自终端 Agent 的交付结果' : awaiting ? '授权后在原终端告知 Agent，继续保存这份报告，无需重新调研' : p.error && p.owner === 'agent' ? p.error : task.autoUpload ? '由原会话 Agent 自动保存，未授权时会提供二维码' : '点击“上传飞书”后由终端 Agent 保存，未授权时会提供二维码'}</small></div>
    {published ? <a className="doc-link" href={p.url} target="_blank" rel="noreferrer"><ExternalLink size={14}/>打开飞书文档</a> : awaiting && !expired ? <button className="secondary" onClick={onTerminal}><Command size={14}/>继续终端会话</button> : <button className="secondary" disabled={busy} onClick={async () => { setSending(true); try { await onPublish(); } finally { setSending(false); } }}>{busy ? <LoaderCircle size={14} className="spin"/> : <ExternalLink size={14}/>} {busy ? '正在上传飞书' : expired ? '重新获取授权二维码' : p.status === 'failed' ? '重试上传飞书' : '上传飞书'}</button>}
    {awaiting && <div className="agent-authorization">{expired ? <p>授权二维码已过期，请点击“重新获取授权二维码”，由原终端 Agent 重新发起授权。</p> : <><a className="doc-link" href={p.authorizationUrl} target="_blank" rel="noreferrer">打开飞书授权页</a>{!qrFailed ? <img src={`/api/tasks/${task.id}/agent-qr?receipt=${encodeURIComponent(p.authorizationUrl)}&request=${p.requestId ?? ''}&attempt=${qrAttempt}`} alt="Agent 生成的飞书授权二维码" onError={() => setQrFailed(true)}/> : <div><p>{qrAttempt < 5 ? '正在等待 Agent 的二维码，稍后自动刷新…' : '二维码暂不可用，可刷新重试或打开飞书授权页。'}</p><button className="secondary" onClick={() => { setQrFailed(false); setQrAttempt(0); }}>刷新二维码</button></div>}</>}</div>}
    {task.localPublication?.url && <a className="doc-link" href={task.localPublication.url} target="_blank" rel="noreferrer">本地报告备份</a>}
  </section>;
}
function readDetailRoute() {
  const [taskId, page] = location.hash.slice(1).split('/');
  return { taskId, view: page === 'chat' ? 'chat' : 'report' };
}
function App() {
  const [binding, setBinding] = useState(null), [bindingModal, setBindingModal] = useState(false);
  const [rootModal, setRootModal] = useState(false);
  const [aiSettings, setAISettings] = useState(null), [aiModal, setAIModal] = useState(false);
  useEffect(() => { api('/ai-settings').then(setAISettings).catch(() => {}); }, []);
  const [route, setRoute] = useState(readDetailRoute);
  const selected = route.taskId, chat = route.view === 'chat';
  const [config, setConfig] = useState(null), [tasks, setTasks] = useState([]), [detail, setDetail] = useState(null), [modal, setModal] = useState(false), [filter, setFilter] = useState('all'), [query, setQuery] = useState(''), [error, setError] = useState(''), [nextCursor, setNextCursor] = useState(null), [loading, setLoading] = useState(true), [connected, setConnected] = useState(true);
  const selection = useRef(selected); selection.current = selected;
  const listRef = useRef(tasks); listRef.current = tasks;
  async function loadList(append = false) {
    try { const r = await api(`/tasks${append && nextCursor ? `?cursor=${nextCursor}` : ''}`); setTasks(old => { const ids = new Set(r.items.map(t => t.id)); return append ? [...old.filter(t => !ids.has(t.id)), ...r.items] : [...r.items, ...old.filter(t => !ids.has(t.id))]; }); if (append || listRef.current.length <= 30) setNextCursor(r.nextCursor); } catch(e) { setError(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { api('/config').then(setConfig).catch(e => setError(e.message)); loadList(); const timer = setInterval(() => loadList(), 5000); const hash = () => setRoute(readDetailRoute()); window.addEventListener('hashchange', hash); return () => { clearInterval(timer); window.removeEventListener('hashchange', hash); }; }, []);
  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    setDetail(null); let disposed = false, inflight = false, dirty = false;
    const load = async () => { if (inflight) { dirty = true; return; } inflight = true; try { do { dirty = false; const d = await api(`/tasks/${selected}`); if (!disposed) setDetail(d); } while (dirty && !disposed); } catch(e) { if (!disposed) setError(e.message); } finally { inflight = false; } };
    load(); const stream = new EventSource(`/api/tasks/${selected}/events`);
    stream.onopen = () => { setConnected(true); load(); };
    stream.onerror = () => setConnected(false);
    stream.addEventListener('update', () => { load(); });
    return () => { disposed = true; stream.close(); };
  }, [selected]);
  useEffect(() => {
    const receive = event => {
      const origin = hostOrigin(document.referrer, new URLSearchParams(location.search).get('hostOrigin')); if (!origin) return;
      if (event.source !== window.parent || event.origin !== origin || event.data?.type !== 'research-workbench:show-report') return;
      const id = event.data.taskId;
      if (id !== '' && !/^[a-f0-9-]{36}$/.test(id ?? '')) return;
      location.hash = id; setRoute({ taskId: id, view: 'report' }); if (!id) loadList();
      if (event.data.publish && id) api(`/tasks/${id}/publish`, { method: 'POST', body: '{}' }).catch(error => setError(error.message));
    };
    window.addEventListener('message', receive); return () => window.removeEventListener('message', receive);
  }, []);
  const open = (id, view = 'report') => { if (id && config?.cloudOnly) view = 'chat'; location.hash = id ? `${id}${view === 'chat' ? '/chat' : ''}` : ''; setRoute({ taskId: id, view }); if (!id) loadList(); };
  const retryCloud = async id => { try { await api(`/tasks/${id}/retry`, { method: 'POST', body: JSON.stringify({ stage: 'research' }) }); await loadList(); open(id, 'chat'); } catch(e) { setError(e.message); } };
  const beginResearch = async () => { if (config?.cloudOnly) { try { const state = await api('/feishu-binding'); setBinding(state); if (!state.bound) { setBindingModal(true); return; } } catch(e) { setError(e.message); return; } } setModal(true); };
  useEffect(() => { if (!config?.cloudOnly) return; let live = true; const refresh = () => api('/feishu-binding').then(s => { if (live) setBinding(s); }).catch(() => { if (live) setBinding({ bound: false }); }); refresh(); const timer = setInterval(refresh, 30000); window.addEventListener('focus', refresh); return () => { live = false; clearInterval(timer); window.removeEventListener('focus', refresh); }; }, [config?.cloudOnly]);
  const openConversation = async () => { try { if (config?.terminalAvailable && detail.task.mode === 'codex' && !detail.task.terminalMode) { await api(`/tasks/${selected}/terminal`, { method: 'POST', body: '{}' }); await refresh(); } if (selection.current === selected) open(selected, 'chat'); } catch(e) { setError(e.message); } };
  const refresh = async () => { const id = selected; const d = await api(`/tasks/${id}`); if (selection.current === id) setDetail(d); await loadList(); };
  const action = async (kind, stage) => { try { await api(`/tasks/${selected}/${kind}`, { method: 'POST', body: JSON.stringify({ stage }) }); await refresh(); } catch(e) { setError(e.message); } };
  const filtered = tasks.filter(t => (filter === 'all' || (filter === 'ready' ? ['published','not_requested'].includes(t.publication.status) : ['queued','running'].includes(t.status) || ['publishing','pending','waiting_agent','awaiting_authorization'].includes(t.publication.status) && t.status === 'ready')) && t.direction.toLowerCase().includes(query.toLowerCase()));
  return <div className={`app-shell${new URLSearchParams(location.search).get('embed') === 'dsh' ? ' dsh-embedded' : ''}`}>
    <aside className="sidebar">
      <a className="brand" href="#"><span className="brand-mark"><FlaskConical size={21}/></span><span>Research<span className="brand-light"> Studio</span></span></a>
      <div className="workspace-label">工作空间 <span>PERSONAL</span></div>
      <button className={`nav-item ${!selected ? 'active' : ''}`} onClick={() => open('')}><Library size={18}/>dsh-research-workbench<span className="nav-count">{tasks.length}</span></button>
      <div className="sidebar-section">最近调研</div>
      <div className="recent-list">{tasks.slice(0, 6).map(t => <button key={t.id} className={`recent ${selected === t.id ? 'selected' : ''}`} onClick={() => open(t.id)}><FileText size={15}/><span>{t.direction}</span></button>)}{!tasks.length && <p>你的研究，将从这里开始。</p>}</div>
      <div className="sidebar-bottom"><div className="private-note"><span className="mini-orbit">✦</span><div>让好奇心更进一步<small>从一个问题，到有据可依的答案</small></div></div><div className="profile"><span className="avatar">研</span><div>我的工作空间<small>本地单用户版</small></div><ChevronDown size={14}/></div></div>
    </aside>
    <main className="main rw-workspace">
      <header className="topbar rw-topbar"><div className="breadcrumb">工作空间 <span>/</span> <strong>dsh-research-workbench</strong>{selected && <><span>/</span><span className="crumb-title">调研详情</span></>}</div><div className="top-right">{config?.cloudOnly && <button className="secondary" onClick={() => setBindingModal(true)}>{binding?.bound ? '已绑定飞书' : binding?.authenticated ? '补充飞书授权' : '绑定飞书'}</button>}<button className="secondary" onClick={() => setRootModal(true)}>设置飞书根目录</button>{!config?.nativeSessionAvailable && <button className="secondary ai-config-open" onClick={() => setAIModal(true)}>配置AI</button>}<span className={`mode-dot ${config?.mode !== 'demo' ? 'live' : ''}`}/>{config?.nativeSessionAvailable ? 'DSH 原生会话' : config?.mode === 'codex' ? `${aiSettings?.agent === 'dsh' ? 'dsh tui' : 'Codex CLI'}` : config?.mode === 'live' ? 'Harness 真实模式' : '离线演示模式'}<span className="top-divider"/><span className="top-avatar">研</span></div></header>
      {error && <div className="error-toast" role="alert"><AlertCircle size={17}/>{error}<button aria-label="关闭错误提示" onClick={() => setError('')}><X size={16}/></button></div>}
      {!selected ? <div className="dashboard">
        <div className="eyebrow"><span/> YOUR RESEARCH, ORGANIZED</div>
        <div className="page-heading"><div><h1>dsh-research-workbench<span className="heading-dot">.</span></h1><p>把问题交给 AI，让每一次探索都有迹可循。</p></div><button className="primary" onClick={beginResearch}><Plus size={18}/>新建调研</button></div>
        <div className="hero"><div className="hero-copy"><span className="hero-label"><Sparkles size={14}/>从好问题开始</span><h2>你的下一个洞察，<br/>从这里出发。</h2><p>探索一个方向，连接多方来源。<br/>让 AI 帮你收集证据、整理报告，沉淀研究成果。</p><button className="hero-link" onClick={beginResearch}>开始一次新调研 <ArrowRight size={16}/></button></div><div className="research-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit orbit-three"/><div className="art-node node-a"><Globe2 size={23}/></div><div className="art-node node-b"><BookOpen size={21}/></div><div className="art-node node-c"><Activity size={20}/></div><div className="art-paper"><span className="paper-spark">✦</span><div className="paper-title"/><div className="paper-line wide"/><div className="paper-line"/><div className="paper-line medium"/><div className="paper-chart"><i/><i/><i/><i/><i/></div><div className="paper-footer"><Check size={11}/> Evidence into insight</div></div><div className="art-tag"><span/>寻找线索，连接答案</div></div></div>
        <section className="research-section"><div className="section-heading"><h2>我的调研 <span>{tasks.length}</span></h2><div className="searchbox"><Search size={16}/><input aria-label="搜索调研" placeholder="搜索调研主题…" value={query} onChange={e => setQuery(e.target.value)}/></div></div><div className="filter-bar"><div className="tabs">{[['all','全部调研'],['progress','进行中'],['ready','已完成']].map(([key, label]) => <button key={key} className={filter === key ? 'current' : ''} onClick={() => setFilter(key)}>{label}</button>)}</div><span className="sort-label"><Clock3 size={13}/>最近创建</span></div>
          {loading ? <div className="empty"><LoaderCircle className="spin"/>正在加载调研…</div> : filtered.length ? <div className="card-grid">{filtered.map(t => <article className="research-card" key={t.id}>
            {React.createElement(t.publication.target === 'feishu' && t.publication.status === 'published' ? 'a' : 'button', {
              className: 'card-main', ...(t.publication.target === 'feishu' && t.publication.status === 'published' ? { href: t.publication.url, target: '_blank', rel: 'noreferrer' } : { onClick: () => open(t.id) }),
            }, <><div className="card-top"><span className="card-icon"><FileText size={20}/></span><Badge task={t}/></div><h3>{t.direction}</h3><p>{config?.cloudOnly ? '报告保存在飞书云文档，可进入 AI 会话查看执行进度并继续提出要求。' : t.summary ?? '从资料到洞察，AI 正在为你连接线索。你可以随时查看执行进度与会话记录。'}</p><div className="card-source"><Globe2 size={13}/>{t.sources === 'web' ? '全网调研' : '指定来源'}{t.mode === 'demo' && <span>演示</span>}</div><span className="card-destination">{t.publication.target === 'feishu' && t.publication.status === 'published' ? '打开飞书报告' : config?.cloudOnly ? '进入 AI 会话' : '查看报告与保存状态'} <ArrowUpRight size={15}/></span></>)}
            <div className="card-footer"><time>{date(t.createdAt)}</time>{config?.cloudOnly && ['failed', 'interrupted'].includes(t.status) && <button className="card-chat" onClick={() => retryCloud(t.id)}>重试任务</button>}<button className="card-chat" onClick={() => open(t.id, 'chat')}><Command size={14}/>AI会话</button></div>
          </article>)}</div> : <div className="empty"><div className="empty-icon"><FlaskConical size={29}/></div><h3>{query || filter !== 'all' ? '没有匹配的调研' : '给你的好奇心，一个起点'}</h3><p>{query || filter !== 'all' ? '试试其他关键词或切换筛选条件。' : '创建第一个调研，AI 将为你整理资料、追溯来源并生成报告。'}</p>{!query && filter === 'all' && <button className="secondary" onClick={beginResearch}><Plus size={16}/>创建第一个调研</button>}</div>}
          {nextCursor && <button className="load-more secondary" onClick={() => loadList(true)}>加载更多历史调研</button>}
        </section><footer className="page-footer"><span>dsh-research-workbench</span> 每一个结论，都有来源。</footer>
      </div> : detail && config?.cloudOnly ? <CloudTaskView task={detail.task} onBack={() => open('')} onRetry={() => action('retry', 'research')} onBind={() => setBindingModal(true)}/> : detail ? <div className="detail-page rw-detail"><div className="detail-heading"><button className="back-link rw-back" onClick={() => open('')}><ArrowLeft size={15}/>返回</button><div className="detail-title rw-title"><h1>{detail.task.direction}</h1><Badge task={detail.task}/></div><div className="detail-meta rw-meta"><span><Clock3 size={13}/>{date(detail.task.createdAt)}</span><span><Globe2 size={13}/>{detail.task.sources === 'web' ? '全网' : detail.task.sources}</span><span>{detail.task.runs.length} 次执行</span></div></div>
        <nav className="detail-views rw-tabs" aria-label="调研详情视图"><button className={!chat ? 'current' : ''} aria-current={!chat ? 'page' : undefined} onClick={() => open(selected)}><FileText size={16}/>调研报告</button><button className={chat ? 'current' : ''} aria-current={chat ? 'page' : undefined} onClick={openConversation}><Command size={16}/>AI对话</button></nav>
        {detail.task.mode === 'demo' && <div className="demo-notice"><FlaskConical size={15}/>离线演示：报告和本地演示文档用于验证流程，未进行真实检索或飞书发布。</div>}
        {detail.task.nativeSession && <div className="cli-notice"><Sparkles size={15}/><span>复用宿主 DSH 原生会话 · 模型、工具和历史记录由 DSH 管理</span><small>飞书保存与授权由原会话 Agent 完成</small></div>}
        {detail.task.mode === 'codex' && <div className="cli-notice"><Command size={15}/><span>通过 {agentName(detail.task)} 命令行执行 · 消息、命令与工具结果实时同步</span><small>飞书保存与授权由终端 Agent 完成</small></div>}
        <PublicationActions task={detail.task} onPublish={async () => { try { await api(`/tasks/${selected}/publish`, { method: 'POST', body: '{}' }); if (selection.current === selected) open(selected, 'chat'); await refresh(); } catch(e) { setError(e.message); } }} onTerminal={openConversation}/>

        {detail.task.nativeSession && chat && <NativeConversation task={detail.task}/>}
        {detail.task.terminalMode && chat && <TerminalPanel task={detail.task} onRefresh={refresh}/>}
        {(detail.task.error || detail.task.mode === 'demo' && detail.task.publication.error) && <div className="failure-banner" role="alert"><AlertCircle size={18}/><span>{detail.task.error ?? detail.task.publication.error}</span><button onClick={() => action('retry', detail.task.report ? 'publish' : 'research')}><RefreshCw size={14}/>{detail.task.report ? '重试保存' : '重试调研'}</button></div>}
        {!chat && <div className="detail-grid without-chat"><section className="report-pane"><div className="pane-header"><span><FileText size={17}/>调研报告</span><div>{detail.task.report && <small>版本 {detail.task.report.version}</small>}{detail.task.publication.url && <a className="doc-link" href={detail.task.publication.url} target="_blank" rel="noreferrer">{detail.task.publication.target === 'local' ? '打开本地报告' : detail.task.mode === 'demo' ? '打开演示文档' : '打开飞书'}<ExternalLink size={13}/></a>}</div></div><div className="report-body">{detail.task.report ? <><div className="report-eyebrow">RESEARCH REPORT</div><h1>{detail.task.report.title}</h1><div className="report-summary">{detail.task.report.summary}</div><article><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: props => <a {...props} target="_blank" rel="noreferrer"/> }}>{detail.task.report.markdown}</ReactMarkdown></article><div className="source-list"><h3><Globe2 size={17}/>数据来源 <span>{detail.task.report.sources.length}</span></h3>{detail.task.report.sources.map(s => <div className="source-item" key={s.id}><span className="source-id">{s.id}</span><div><a href={s.url} target="_blank" rel="noreferrer">{s.title}<ArrowUpRight size={13}/></a><p>{s.excerpt}</p><small>{new URL(s.url).hostname}</small></div></div>)}</div></> : detail.task.draft ? <><span className="draft-label">已保存的草稿</span><article><ReactMarkdown>{detail.task.draft}</ReactMarkdown></article></> : <div className="report-pending"><div className="pending-orb"><Sparkles size={26}/></div><h3>{detail.task.status === 'failed' ? '暂时未能生成报告' : '让线索慢慢汇成答案'}</h3><p>执行记录会持续保存，关闭页面也不会停止调研。</p>{['queued','running'].includes(detail.task.status) && <LoaderCircle className="spin" size={19}/>}</div>}</div></section>
        </div>}
        {chat && !detail.task.terminalMode && !detail.task.nativeSession && <div className="conversation-page"><ConversationPane task={detail.task} events={detail.events} connected={connected} onCancel={() => action('cancel')}/></div>}
      </div> : <div className="empty"><LoaderCircle className="spin"/>正在读取调研记录…</div>}
    </main>
    {bindingModal && <FeishuBindingModal onStatus={setBinding} onClose={() => setBindingModal(false)} onBound={state => { setBinding(state); setBindingModal(false); }}/>}
    {rootModal && <FeishuRootModal current={config?.feishuRoot} onClose={() => setRootModal(false)} onSaved={value => { setConfig(old => ({ ...old, feishuRoot: value, feishuTarget: value.folderUrl ? '飞书云盘 / 指定文件夹' : `飞书云盘 / ${value.rootName}` })); setRootModal(false); }}/>}
    {aiModal && <AIConfigModal current={aiSettings} onClose={() => setAIModal(false)} onSaved={value => { setAISettings(value); setAIModal(false); }}/> }
    {modal && <CreateModal config={{ ...config, ai: aiSettings }} onClose={() => setModal(false)} onCreated={t => { setModal(false); loadList(); open(t.id, 'chat'); }}/>}
  </div>;
}

function NativeConversation({ task }) {
  const [status, setStatus] = useState(''), sent = useRef(null);
  const embedded = new URLSearchParams(location.search).get('embed') === 'dsh' && window.parent !== window;
  const open = () => {
    if (!embedded) { setStatus('请在 DeepSeek Harness 的“调研工作台”页签打开此原生会话。'); return; }
    const requestId = crypto.randomUUID(); sent.current = requestId; setStatus('正在连接原生会话…');
    const origin = hostOrigin(document.referrer, new URLSearchParams(location.search).get('hostOrigin')); if (!origin) { setStatus('无法确认宿主来源，请从 DSH 重新打开调研工作台。'); return; }
    window.parent.postMessage({ type: 'research-workbench:embed-session', taskId: task.id, requestId }, origin);
  };
  useEffect(() => {
    const receive = event => {
      const origin = hostOrigin(document.referrer, new URLSearchParams(location.search).get('hostOrigin')); if (!origin) return;
      if (event.source !== window.parent || event.origin !== origin || event.data?.type !== 'research-workbench:session-result' || event.data.requestId !== sent.current) return;
      setStatus(event.data.ok ? '已连接，在工作台内继续对话。' : event.data.error ?? '打开原生会话失败，请重试');
    };
    window.addEventListener('message', receive);
    if (task.nativeSessionId) open();
    return () => { window.removeEventListener('message', receive); if (embedded && sent.current) { try { window.parent.postMessage({ type: 'research-workbench:hide-session', taskId: task.id, requestId: sent.current }, hostOrigin(document.referrer, new URLSearchParams(location.search).get('hostOrigin'))); } catch {} } };
  }, [task.id, task.nativeSessionId]);
  return <section className="native-conversation" aria-label="DSH 原生会话"><div className="pending-orb"><Sparkles size={28}/></div><h2>在工作台内继续调研</h2><p>正在载入 DSH 原生消息与输入框，支持追问与停止当前轮次。</p><button className="primary" onClick={open} disabled={!task.nativeSessionId}><ExternalLink size={16}/>重新连接对话</button><p role="status">{status || '正在创建宿主会话…'}</p></section>;
}

function ConversationPane({ task, events, connected, onCancel }) {
  const bodyRef = useRef(null), follow = useRef(true);
  const entries = conversationEntries(events);
  useEffect(() => { const el = bodyRef.current; if (el && follow.current) el.scrollTop = el.scrollHeight; }, [events.at(-1)?.seq]);
  const isCodex = task.mode === 'codex' || events.some(e => e.type === 'cli');
  return <aside className={`conversation-pane ${isCodex ? 'codex-pane' : ''}`}>
    <div className="pane-header"><span>{isCodex ? <Command size={16}/> : <Sparkles size={16}/>} {isCodex ? 'Codex 命令行对话' : 'AI 会话记录'}</span><span className={`connection ${connected ? '' : 'offline'}`}>{connected ? '已连接' : '重连中'}</span></div>
    {isCodex && <div className="cli-session"><span>SESSION</span><code>{task.runs.at(-1)?.sessionId ?? '等待命令行连接…'}</code></div>}
    <div ref={bodyRef} className="conversation-body" role="log" aria-label={isCodex ? 'Codex 命令行对话记录' : 'AI 会话记录'} aria-live="polite" onScroll={e => { const el = e.currentTarget; follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}>
      {entries.map(e => e.item ? <CliItem key={e.seq} entry={e} running={task.status === 'running' && e.runId === task.runs.at(-1)?.id}/> : e.type === 'cli-log' ? <details className="cli-diagnostic" key={e.seq}><summary>{e.label}</summary><pre>{e.text}</pre></details> : <div key={e.seq} className={`message ${e.type}`}><div className="message-label">{e.label}<time>{date(e.at)}</time></div><div className="message-content">{e.text}</div></div>)}
    </div><div className="conversation-footer"><span><Check size={13}/>会话已自动保存</span>{['running', 'queued'].includes(task.status) && <button onClick={onCancel}><Square size={11}/>停止任务</button>}</div>
  </aside>;
}
function CliItem({ entry, running }) {
  const item = entry.item;
  const working = !entry.finished && running;
  const label = ({ agent_message: 'Codex', command_execution: '命令执行', web_search: '网页检索', mcp_tool_call: '工具调用', reasoning: '执行说明', file_change: '文件变更', todo_list: '执行计划', error: '执行异常' })[item.type] ?? 'Codex 事件';
  let text = item.text ?? item.message ?? '';
  if (item.type === 'agent_message') { try { const r = JSON.parse(text); if (r.markdown) text = r.markdown; } catch {} }
  const command = item.type === 'command_execution';
  return <div className={`message cli-message ${command ? 'cli-command' : ''}`} data-item-id={item.id}>
    <div className="message-label"><span>{label}</span><span>{working ? <LoaderCircle size={12} className="spin"/> : item.exit_code != null ? `退出码 ${item.exit_code}` : item.status === 'failed' || item.type === 'error' ? '异常' : entry.finished ? '已完成' : '已中断'}</span></div>
    {command ? <div className="terminal-block"><div className="terminal-command">$ {item.command}</div>{item.aggregated_output && <pre>{item.aggregated_output}</pre>}</div> : <div className="message-content">{item.type === 'agent_message' ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown> : item.type === 'web_search' ? (item.query ?? item.action?.query ?? JSON.stringify(item.action ?? item)) : item.type === 'mcp_tool_call' ? <><strong>{item.server} · {item.tool}</strong><pre>{JSON.stringify(item.result ?? item.arguments ?? item.error, null, 2)}</pre></> : text || JSON.stringify(item.items ?? item.changes ?? item, null, 2)}</div>}
  </div>;
}

function CreateModal({ config, onClose, onCreated }) {
  const [direction, setDirection] = useState(''), [sourceType, setSourceType] = useState('web'), [customSource, setCustomSource] = useState(''), [prompt, setPrompt] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const key = useRef(crypto.randomUUID()), submitLock = useRef(false), closeRef = useRef(null), inputRef = useRef(null); const sources = sourceType === 'web' ? 'web' : customSource;
  useEffect(() => { const previous = document.activeElement; inputRef.current?.focus(); const listener = e => { if (e.key === 'Escape' && !submitLock.current) onClose(); if (e.key === 'Tab') { const els = [...document.querySelectorAll('.modal button:not(:disabled), .modal input, .modal textarea, .modal select')]; const first = els[0], last = els.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } } }; document.addEventListener('keydown', listener); return () => { document.removeEventListener('keydown', listener); previous?.focus(); }; }, []);
  async function submit(e) { e.preventDefault(); if (submitLock.current) return; submitLock.current = true; setBusy(true); setError(''); try { const t = await api('/tasks', { method: 'POST', headers: { 'Idempotency-Key': key.current }, body: JSON.stringify({ direction, sources, prompt: prompt ?? promptFor(direction, sources, config?.feishuRoot?.rootName, config?.feishuRoot?.folderUrl) }) }); onCreated(t); } catch(e) { setError(e.message); } finally { submitLock.current = false; setBusy(false); } }
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div className="modal-symbol"><Sparkles size={22}/></div><button ref={closeRef} className="icon-button" aria-label="关闭新建调研" disabled={busy} onClick={onClose}><X size={20}/></button></div><h2 id="modal-title">开始一次新调研</h2><p className="modal-intro">告诉 AI 你的研究方向，剩下的交给它。</p><form onSubmit={submit}><label htmlFor="direction">调研方向 <span>*</span></label><input ref={inputRef} id="direction" required minLength={2} maxLength={200} placeholder="例如：AI Agent 对 CPU 算力的需求趋势" value={direction} onChange={e => { setDirection(e.target.value); setPrompt(null); }}/><label htmlFor="sources">数据来源</label><select id="sources" value={sourceType} onChange={e => { setSourceType(e.target.value); setPrompt(null); }}><option value="web">全网 · 公开互联网来源</option><option value="custom">指定网址或域名</option></select>{sourceType === 'custom' && <textarea aria-label="指定数据来源" required maxLength={2000} placeholder="输入网址或域名，多个来源用换行分隔" value={customSource} onChange={e => { setCustomSource(e.target.value); setPrompt(null); }}/>}<div className="prompt-label"><label htmlFor="prompt">任务 Prompt</label><span>可编辑</span></div><textarea id="prompt" className="prompt-editor" required minLength={10} maxLength={6000} value={prompt ?? promptFor(direction, sources, config?.feishuRoot?.rootName, config?.feishuRoot?.folderUrl)} onChange={e => setPrompt(e.target.value)}/><div className="destination"><FileText size={17}/><div>{config?.nativeSessionAvailable ? '报告生成后自动上传飞书' : '报告生成后可点击上传飞书'}<small>{config?.feishuTarget ?? '本地演示文档'}</small></div><span>{config?.mode === 'demo' ? '演示' : config?.nativeSessionAvailable ? '自动上传' : '手动上传'}</span></div>{config?.terminalPermissions?.sandbox === 'danger-full-access' && <p className="terminal-permission-note">{config?.ai?.agent === 'dsh' ? 'dsh tui' : 'Codex'} 默认完整访问 · 当前用户的文件系统和网络</p>}{error && <div role="alert" className="form-error">{error}</div>}<div className="modal-footer"><span><Clock3 size={13}/>可随时离开，进度自动保存</span><button className="primary" disabled={busy || direction.trim().length < 2 || !sources.trim()}>{busy ? <LoaderCircle className="spin" size={16}/> : <Sparkles size={16}/>}启动调研</button></div></form></section></div>;
}
createRoot(document.getElementById('root')).render(<App/>);

function AIConfigModal({ current, onClose, onSaved }) {
  const [agent, setAgent] = useState(current?.agent ?? 'codex'), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const first = useRef(null);
  useEffect(() => { first.current?.focus(); const key = e => { if (e.key === 'Escape' && !busy) onClose(); }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key); }, [busy]);
  async function save(e) { e.preventDefault(); if (busy) return; setBusy(true); setError(''); try { onSaved(await api('/ai-settings', { method: 'PUT', body: JSON.stringify({ agent }) })); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="ai-config-title"><div className="modal-heading"><Command size={24}/><button className="icon-button" aria-label="关闭AI配置" onClick={onClose} disabled={busy}><X size={20}/></button></div><h2 id="ai-config-title">配置AI</h2><p className="modal-intro">选择用于新调研的命令行 Agent，历史会话保持原配置。</p><form onSubmit={save}><label htmlFor="ai-agent">选择agent</label><select ref={first} id="ai-agent" value={agent} onChange={e => setAgent(e.target.value)}><option value="codex">Codex</option><option value="dsh">dsh tui</option></select><p className="ai-config-hint">{agent === 'dsh' ? '使用 DSH 已配置的默认模型和登录信息。请先在 DSH 中完成模型配置，并安装 dsh tui。' : '使用 Codex 本机已有的模型配置和登录信息。'}</p>{error && <div className="form-error" role="alert">{error}</div>}<div className="modal-footer"><span>仅影响新建调研</span><button className="primary" disabled={busy}>{busy ? '正在保存…' : '保存配置'}</button></div></form></section></div>;
}

function FeishuRootModal({ current, onClose, onSaved }) {
  const [mode, setMode] = useState(current?.folderUrl ? 'link' : 'name');
  const [folderUrl, setFolderUrl] = useState(current?.folderUrl ?? '');
  const [rootName, setRootName] = useState(current?.rootName ?? '调研工作台'), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const input = useRef(null), lock = useRef(false);
  useEffect(() => { const previous = document.activeElement; input.current?.focus(); const key = e => { if (e.key === 'Escape' && !lock.current) onClose(); if (e.key === 'Tab') { const els = [...document.querySelectorAll('.modal button:not(:disabled), .modal input:not(:disabled)')]; const first = els[0], last = els.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } } }; document.addEventListener('keydown', key); return () => { document.removeEventListener('keydown', key); previous?.focus(); }; }, []);
  async function submit(e) { e.preventDefault(); if (lock.current) return; lock.current = true; setBusy(true); setError(''); try { onSaved(await api('/feishu-settings', { method: 'PUT', body: JSON.stringify(mode === 'link' ? { folderUrl } : { rootName }) })); } catch(e) { setError(e.message); } finally { lock.current = false; setBusy(false); } }
  return <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="root-title">
    <div className="modal-heading"><Library size={24}/><button className="icon-button" aria-label="关闭飞书根目录设置" disabled={busy} onClick={onClose}><X size={20}/></button></div><h2 id="root-title">设置飞书根目录</h2><p className="modal-intro">选择一种方式设置报告保存位置。</p>
    <form onSubmit={submit}><fieldset className="root-mode-options"><legend>设置方式</legend>
      <label><input type="radio" name="root-mode" checked={mode === 'name'} disabled={busy} onChange={() => { setMode('name'); setError(''); }}/>按名字创建</label>
      <label><input type="radio" name="root-mode" checked={mode === 'link'} disabled={busy} onChange={() => { setMode('link'); setError(''); }}/>使用文件夹链接</label>
    </fieldset>
    {mode === 'name' ? <><label htmlFor="feishu-root">根目录名字</label><input ref={input} id="feishu-root" required maxLength={100} value={rootName} onChange={e => setRootName(e.target.value)} disabled={busy}/><p className="ai-config-hint">默认“调研工作台”。首次创建并记住目录，后续复用；已有文件夹请切换到“使用文件夹链接”。</p></> : <><label htmlFor="feishu-folder-url">飞书文件夹链接</label><input ref={input} id="feishu-folder-url" type="url" required maxLength={2000} placeholder="https://你的企业.feishu.cn/drive/folder/…" value={folderUrl} onChange={e => setFolderUrl(e.target.value)} disabled={busy}/><p className="ai-config-hint">只需提供文件夹链接，直接上传到该目录，不改动文件夹名字，也不读取目录列表。</p></>}
    {error && <div className="form-error" role="alert">{error}</div>}<div className="modal-footer"><span>历史调研保留原目录</span><button className="primary" disabled={busy || !(mode === 'link' ? folderUrl.trim() : rootName.trim())}>{busy ? '正在保存…' : '保存设置'}</button></div></form>
  </section></div>;
}

function CloudTaskView({ task, onBack, onRetry, onBind }) {
  return <div className="detail-page rw-detail"><button className="back-link rw-back" onClick={onBack}><ArrowLeft size={15}/>返回</button><div className="detail-title rw-title"><h1>{task.direction}</h1><Badge task={task}/></div><div className="detail-meta rw-meta"><span>{date(task.createdAt)}</span><span>{task.sources === 'web' ? '全网' : task.sources}</span></div>
    <div className="cloud-delivery-note">报告仅存储在飞书云文档。{task.publication.target === 'feishu' && task.publication.status === 'published' ? <a className="doc-link" href={task.publication.url} target="_blank" rel="noreferrer">打开飞书报告 <ExternalLink size={14}/></a> : <span>完成后首页卡片将提供文档链接。</span>}<button className="secondary" onClick={onBind}>绑定飞书</button></div>
    {task.error && <div className="failure-banner" role="alert"><AlertCircle size={18}/><span>{task.error}</span>{['failed', 'interrupted'].includes(task.status) && <button onClick={onRetry}>重试任务</button>}</div>}
    {task.nativeSession ? <NativeConversation task={task}/> : task.terminalMode ? <TerminalPanel task={task} onRefresh={() => {}}/> : <p>此历史任务没有可恢复的原生会话，请在 DSH 中查看历史记录。</p>}
  </div>;
}
function FeishuBindingModal({ onClose, onBound, onStatus }) {
  const [applicationEditing, setApplicationEditing] = useState(false), [registering, setRegistering] = useState(false);
  const [state, setState] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [qrError, setQrError] = useState(false), [now, setNow] = useState(Date.now());
  const lock = useRef(false), first = useRef(null), revision = useRef(0), editing = useRef(false);
  editing.current = applicationEditing || registering;
  useEffect(() => { first.current?.focus(); let live = true; api('/feishu-binding').then(value => { if (live && revision.current === 0) { setState(value); onStatus?.(value); } }).catch(e => { if (live) setError(e.message); }); const listener = e => { if (editing.current) return; if (e.key === 'Escape' && !lock.current) onClose(); if (e.key === 'Tab') { const els = [...document.querySelectorAll('.modal button:not(:disabled), .modal a')]; const first = els[0], last = els.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } }; document.addEventListener('keydown', listener); const timer = setInterval(() => setNow(Date.now()), 1000); return () => { live = false; document.removeEventListener('keydown', listener); clearInterval(timer); }; }, []);
  const expired = state?.expiresAt && Date.parse(state.expiresAt) <= now;
  async function run(complete = false, rebind = false) { if (lock.current) return; revision.current++; lock.current = true; setBusy(true); setError(''); setQrError(false); try { const value = await api(complete ? '/feishu-binding/complete' : '/feishu-binding', { method: 'POST', body: JSON.stringify(complete ? { flowId: state.flowId } : { rebind }) }); setState(value); if (value.bound) onBound(value); } catch(e) { setError(e.message); } finally { lock.current = false; setBusy(false); } }
  async function applicationSaved() { revision.current++; let value; try { value = await api('/feishu-binding'); } catch { value = { bound: false, error: '应用已保存，请重新检查授权状态' }; } setState(value); onStatus?.(value); setApplicationEditing(false); setRegistering(false); if (value.appId) await run(false); }
  if (registering) return <FeishuRegistrationModal onClose={() => setRegistering(false)} onRegistered={applicationSaved}/>;
  if (applicationEditing) return <FeishuApplicationModal onClose={() => setApplicationEditing(false)} onSaved={applicationSaved}/>;
  return <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="binding-title">
    <div className="modal-heading"><Library size={24}/><button ref={first} className="icon-button" aria-label="关闭飞书绑定" disabled={busy} onClick={onClose}><X size={20}/></button></div><h2 id="binding-title">绑定飞书</h2><p className="modal-intro">先扫码登录飞书，在飞书页面选择已有应用或创建新应用，再完成个人文档授权。</p>
    <section className="binding-application" aria-label="授权应用"><div><strong>当前应用</strong><p>{state?.appName || state?.appId || '尚未绑定应用'}</p>{state?.appName && state?.appId && <small>{state.appId}</small>}</div><button className="secondary" disabled={busy || !state} onClick={() => setRegistering(true)}>更换应用</button></section>
    {state?.bound ? <p role="status">已绑定飞书：{state.userName}</p> : state?.authorizationUrl && !expired ? <div className="binding-qr"><a className="doc-link" href={state.authorizationUrl} target="_blank" rel="noreferrer">打开飞书授权页</a>{!qrError ? <img src={`/api/feishu-binding/qr/${state.flowId}`} alt="绑定飞书授权二维码" onError={() => setQrError(true)}/> : <p>二维码加载失败，可打开授权链接或重新获取。</p>}<p>请使用刚才登录并绑定应用的同一账号授权，然后点击“我已授权”。</p><button className="secondary" disabled={busy} onClick={() => setRegistering(true)}>换账号，重新扫码绑定应用</button></div> : <p>{busy ? '正在获取个人授权二维码…' : expired ? '个人授权二维码已过期，请重新获取。' : state?.error ?? '检查飞书授权中…'}</p>}
    <p className="ai-config-hint">换账号时请重新扫码选择该账号可管理的应用，避免继续授权旧账号的应用。报告仍以个人身份保存；应用创建、选择及权限变更需在飞书页面确认。</p>{error && <div className="form-error" role="alert">{error}</div>}
    <div className="modal-footer"><span>个人身份 · 报告仅存飞书</span>{state?.bound ? <><button className="secondary" disabled={busy} onClick={() => setRegistering(true)}>重新绑定</button><button className="primary" disabled={busy} onClick={() => onBound(state)}>完成</button></> : <><button className="primary" disabled={busy || !state} onClick={() => setRegistering(true)}>扫码登录并选择应用</button>{state?.flowId && !expired && <button className="primary" disabled={busy} onClick={() => run(true)}>我已授权</button>}</>}</div>
    {!state?.bound && state?.appId && <button className="text-button" disabled={busy} onClick={() => run(false, Boolean(state?.authorizationUrl))}>{state?.authorizationUrl ? '重新获取个人授权二维码' : '仅补充当前应用授权'}</button>}
    <button className="text-button" disabled={busy || !state} onClick={() => setApplicationEditing(true)}>手动配置已有应用</button>
  </section></div>;
}

function FeishuRegistrationModal({ onClose, onRegistered }) {
  const [state, setState] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [qrError, setQrError] = useState(false), [attempt, setAttempt] = useState(0);
  const live = useRef(true), finish = useRef(false), lock = useRef(false), first = useRef(null);
  async function receive(value) { if (!live.current) return; setState(value); if (value.status === 'completed' && !finish.current) { finish.current = true; try { await onRegistered(); } catch(e) { finish.current = false; setError(e.message); } } }
  async function start(refresh = false) { if (lock.current) return; lock.current = true; setBusy(true); setError(''); setQrError(false); try { await receive(await api('/feishu-registration', { method: 'POST', body: JSON.stringify({ refresh }) })); } catch(e) { if (live.current) setError(e.message); } finally { lock.current = false; if (live.current) setBusy(false); } }
  async function close() { if (lock.current) return; lock.current = true; setBusy(true); try { await api('/feishu-registration', { method: 'DELETE' }); onClose(); } catch(e) { setError(e.message); } finally { lock.current = false; setBusy(false); } }
  const closeRef = useRef(close); closeRef.current = close;
  useEffect(() => { live.current = true; first.current?.focus(); void start(); let polling = false; const timer = setInterval(async () => { if (polling || finish.current) return; polling = true; try { await receive(await api('/feishu-registration')); } catch(e) { if (live.current) setError(e.message); } finally { polling = false; } }, 1000); const key = e => { if (e.key === 'Escape') void closeRef.current(); if (e.key === 'Tab') { const els = [...document.querySelectorAll('.modal button:not(:disabled), .modal a')]; if (e.shiftKey && document.activeElement === els[0]) { e.preventDefault(); els.at(-1)?.focus(); } else if (!e.shiftKey && document.activeElement === els.at(-1)) { e.preventDefault(); els[0]?.focus(); } } }; document.addEventListener('keydown', key); return () => { live.current = false; clearInterval(timer); document.removeEventListener('keydown', key); }; }, []);
  useEffect(() => { if (!qrError || attempt >= 5) return; const timer = setTimeout(() => { setQrError(false); setAttempt(v => v + 1); }, 1000); return () => clearTimeout(timer); }, [qrError, attempt]);
  const waiting = state?.status === 'awaiting_scan';
  return <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="registration-title"><div className="modal-heading"><Library size={24}/><button ref={first} className="icon-button" aria-label="关闭扫码绑定应用" disabled={busy || state?.status === 'saving'} onClick={close}><X size={20}/></button></div><h2 id="registration-title">扫码登录并绑定应用</h2><p className="modal-intro">1. 扫码登录你要使用的飞书账号。<br/>2. 在飞书页面选择已有应用或创建新应用并确认。<br/>3. 返回工作台，继续个人文档授权。</p>
    {waiting && <div className="binding-qr"><a className="doc-link" href={state.authorizationUrl} target="_blank" rel="noreferrer">打开飞书应用绑定页</a>{!qrError ? <img key={`${state.flowId}-${attempt}`} src={`/api/feishu-registration/qr/${state.flowId}?attempt=${attempt}`} alt="飞书账号登录与应用绑定二维码" onError={() => setQrError(true)}/> : <p>二维码暂不可用，可打开绑定链接或重新获取。</p>}<p>先确认飞书页面登录的是新账号，再选择或创建应用。完成后将自动继续。</p></div>}
    {(!state || state.status === 'initializing') && <p role="status">正在生成扫码登录与应用绑定二维码…</p>}{state?.status === 'saving' && <p role="status">应用已确认，正在安全保存配置…</p>}{state?.status === 'completed' && <p role="status">应用已绑定，正在继续个人授权…</p>}
    <p className="ai-config-hint">无需填写 App ID 或密钥。选择已有应用需具备相应管理权限；企业审批限制仍由飞书控制。取消待扫码流程会保留原绑定。</p>{(error || state?.error) && <div className="form-error" role="alert">{error || state.error}</div>}<div className="modal-footer"><button className="secondary" disabled={busy || state?.status === 'saving'} onClick={close}>取消</button><button className="primary" disabled={busy || !state || ['initializing', 'saving', 'completed'].includes(state.status)} onClick={() => { setAttempt(0); start(true); }}>重新获取应用绑定二维码</button></div>
  </section></div>;
}

function FeishuApplicationModal({ onClose, onSaved }) {
  const [info, setInfo] = useState(null), [mode, setMode] = useState('custom'), [appId, setAppId] = useState(''), [secret, setSecret] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const first = useRef(null), lock = useRef(false);
  useEffect(() => { let live = true; api('/feishu-application').then(value => { if (live) { setInfo(value); if (value.mode === 'custom') setAppId(value.appId); } }).catch(e => { if (live) setError(e.message); }); first.current?.focus(); return () => { live = false; }; }, []);
  useEffect(() => { const key = e => { if (e.key === 'Escape' && !lock.current) onClose(); if (e.key === 'Tab') { const controls = [...document.querySelectorAll('.modal button:not(:disabled), .modal input:not(:disabled), .modal select:not(:disabled)')]; if (e.shiftKey && document.activeElement === controls[0]) { e.preventDefault(); controls.at(-1)?.focus(); } else if (!e.shiftKey && document.activeElement === controls.at(-1)) { e.preventDefault(); controls[0]?.focus(); } } }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key); }, []);
  const keepSecret = info?.mode === 'custom' && info?.appId === appId.trim() && info?.hasSecret;
  async function submit(e) { e.preventDefault(); if (lock.current) return; lock.current = true; setBusy(true); setError(''); try { await api('/feishu-application', { method: 'PUT', body: JSON.stringify(mode === 'default' ? { mode } : { mode, appId, ...(secret ? { appSecret: secret } : {}) }) }); setSecret(''); await onSaved(); } catch(e) { setError(e.message); } finally { lock.current = false; setBusy(false); } }
  return <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="application-title"><div className="modal-heading"><Library size={24}/><button ref={first} className="icon-button" aria-label="关闭飞书应用配置" disabled={busy} onClick={onClose}><X size={20}/></button></div><h2 id="application-title">配置自己的飞书应用</h2><p className="modal-intro">使用你所在企业的应用，再扫码授权自己的飞书账号。</p><form onSubmit={submit}>
    <label htmlFor="application-mode">应用来源</label><select id="application-mode" value={mode} disabled={busy} onChange={e => setMode(e.target.value)}><option value="custom">使用自己的飞书应用</option><option value="default">使用本机默认应用</option></select>
    {mode === 'custom' ? <><label htmlFor="application-id">App ID</label><input id="application-id" required maxLength={104} placeholder="cli_…" value={appId} disabled={busy} onChange={e => setAppId(e.target.value)}/><label htmlFor="application-secret">App Secret</label><input id="application-secret" type="password" autoComplete="new-password" required={!keepSecret} maxLength={512} placeholder={keepSecret ? '留空保留已保存的凭据' : '输入应用密钥'} value={secret} disabled={busy} onChange={e => setSecret(e.target.value)}/><p className="ai-config-hint">在飞书开放平台创建或选择你有使用权限的应用，开通文档创建、编辑及文件夹创建权限。密钥由本机 Lark CLI 保存，工作台不回显，也不覆盖 CLI 默认应用。</p></> : <p className="ai-config-hint">恢复使用本机 Lark CLI 当前默认应用，不删除自定义应用或历史会话。</p>}
    {info?.appId && <p className="ai-config-hint">已选应用：{info.appName || info.appId}</p>}{error && <div className="form-error" role="alert">{error}</div>}<div className="modal-footer"><button className="secondary" type="button" disabled={busy} onClick={onClose}>取消</button><button className="primary" disabled={busy || !info || mode === 'custom' && (!appId.trim() || !keepSecret && !secret.trim())}>{busy ? '正在保存…' : '保存应用配置'}</button></div>
  </form></section></div>;
}
