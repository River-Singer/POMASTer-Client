/** Components v5: explorer-style category gallery (owner-preferred form) with all
 * categories filled in (text/paragraphs, badges, buttons, progress, grids, layout,
 * icons, cards, empty states, document typography, token palette), plus the full
 * Storybook workbench tucked in as its own expandable section. */
import React, { useMemo, useState } from 'react'
import { getJSON } from '../api.ts'
import { Badge, Card, DocTitle, EmptyState, ProgressBar, SectionTitle, StackedBar, str, usePageData, type AnyRecord } from '../ui.tsx'
import type { Translate } from '../i18n.ts'

interface StoryEntry { id: string; title: string; name: string; type: string }
interface StudioPayload {
  react: { available: boolean; base: string }
  stories: StoryEntry[]
  startCommand: string
}
interface ThemePayload { tokens: Record<string, string> }

/* --- linear SVG glyph set (one family, stroke 1.5; no icon library in this bundle) --- */
const G = {
  typography: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 7V5h14v2M12 5v14M9 19h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  badges: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="3" y="8" width="18" height="8" rx="4" stroke="currentColor" strokeWidth="1.5" /><circle cx="8" cy="12" r="1.6" fill="currentColor" /></svg>,
  buttons: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="3" y="8" width="18" height="8" rx="3" stroke="currentColor" strokeWidth="1.5" /><path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  progress: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="3" y="10" width="18" height="4" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M3 12h9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>,
  tables: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M3 9h18M3 14h18M9 4v16" stroke="currentColor" strokeWidth="1.5" /></svg>,
  layout: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M3 9h18M12 9v12" stroke="currentColor" strokeWidth="1.5" /></svg>,
  icons: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" /><circle cx="17" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" /><rect x="3" y="13" width="8" height="8" rx="4" stroke="currentColor" strokeWidth="1.5" /><rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" /></svg>,
  cards: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" /><path d="M4 10h16" stroke="currentColor" strokeWidth="1.5" /></svg>,
  empty: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" /></svg>,
  palette: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" opacity=".85" /><rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" fill="currentColor" opacity=".4" /></svg>,
  docs: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M6 2h8l4 4v16H6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M14 2v4h4M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  storybook: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 3h14v18l-7-3-7 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M9 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
}

function SampleFrame(props: { name: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="pmwb-tile" style={{ cursor: 'default' }}>
      <div className="pmwb-sample-frame">{props.children}</div>
      <div className="pmwb-sample-name" style={{ textAlign: 'center' }}>{props.name}</div>
    </div>
  )
}

/* --- category samples --- */
function buildSamples(t: Translate): Record<string, Array<{ name: string; node: React.ReactNode }>> {
  void t
  return {
    typography: [
      { name: '标题 title-20', node: <div className="pmwb-doc-title">任务中心 · 开发任务</div> },
      { name: '小节标题 section', node: <SectionTitle>为什么入选</SectionTitle> },
      { name: '正文 body', node: <p className="pmwb-para">工作台把治理状态翻译成人能直接读懂的语言，不再需要打开命令行逐条核对。</p> },
      { name: '辅助说明 muted', node: <div className="pmwb-muted">辅助说明文字，比正文弱一级。</div> },
      { name: '行内代码 mono', node: <span className="pmwb-mono">pomaster status --json</span> },
      { name: '长文折叠 expand', node: <LongTextDemo /> },
    ],
    paragraphs: [
      { name: '段落 paragraph', node: <div style={{ maxWidth: 420 }}><p className="pmwb-para">段落一：项目状态由 kernel 同源投影产出，界面只读不写，任何变化都以命令信封为准。</p><p className="pmwb-para">段落二：需要下钻时，按「摘要 → 结构化明细 → 内核证据」三级逐层展开。</p></div> },
      { name: '列表 list', node: <ul className="pmwb-list" style={{ maxWidth: 360 }}><li>先看当前任务</li><li>再看注意力</li><li>最后核对验证</li></ul> },
      { name: '引用 quote', node: <div className="pmwb-err" style={{ borderLeftColor: 'var(--tk-color-brand-primary,#1677ff)' }}>引用块：重要结论单独成行强调。</div> },
    ],
    badges: [
      { name: '通过 ok', node: <Badge tone="ok">confirmed</Badge> },
      { name: '警告 warn', node: <Badge tone="warn">not_run</Badge> },
      { name: '失败 bad', node: <Badge tone="bad">failed</Badge> },
      { name: '中性 neutral', node: <Badge tone="neutral">PROPOSED</Badge> },
      { name: '组合行 row', node: <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><Badge tone="ok">5 通过</Badge><Badge tone="warn">1 待验证</Badge><Badge tone="bad">0 失败</Badge></div> },
    ],
    buttons: [
      { name: '主按钮 primary', node: <button className="pmwb-btn" style={{ background: 'var(--tk-color-brand-primary,#1677ff)', borderColor: 'var(--tk-color-brand-primary,#1677ff)', color: '#fff' }}>刷新</button> },
      { name: '次按钮 default', node: <button className="pmwb-btn">刷新</button> },
      { name: '危险 danger', node: <button className="pmwb-btn" style={{ borderColor: 'var(--tk-color-semantic-error,#ff4d4f)', color: 'var(--tk-color-semantic-error,#ff4d4f)' }}>删除</button> },
      { name: '链接 link', node: <button className="pmwb-btn" style={{ border: 'none', background: 'none', color: 'var(--tk-color-brand-primary,#1677ff)', padding: '4px 6px' }}>展开全文</button> },
      { name: '小尺寸 small', node: <button className="pmwb-btn" style={{ height: 'var(--tk-density-compact_control_height,24px)', padding: '2px 8px', fontSize: 12 }}>小按钮</button> },
      { name: '带图标 icon', node: <button className="pmwb-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1v10M4 7l4 4 4-4M2 14h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>导出</button> },
      { name: '禁用 disabled', node: <button className="pmwb-btn" disabled>不可用</button> },
      { name: '输入框 input', node: <input className="pmwb-input" placeholder="搜索…" readOnly style={{ maxWidth: 200 }} /> },
      { name: '开关 switch', node: <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}><span style={{ width: 36, height: 20, borderRadius: 999, background: 'var(--tk-color-brand-primary,#1677ff)', position: 'relative', display: 'inline-block' }}><span style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: '#fff' }} /></span>开启</label> },
    ],
    progress: [
      { name: '进度 100%', node: <div style={{ width: 240 }}><ProgressBar value={5} total={5} /></div> },
      { name: '进度 60%', node: <div style={{ width: 240 }}><ProgressBar value={3} total={5} tone="warn" /></div> },
      { name: '占比条 stacked', node: <div style={{ width: 240 }}><StackedBar segments={[{ label: 'policies', value: 206, color: '#1677ff' }, { label: 'archetypes', value: 41, color: '#52c41a' }, { label: '其余', value: 23, color: '#faad14' }]} /></div> },
      { name: '大数字 stat', node: <div style={{ width: 140 }}><div className="pmwb-big-stat">5<small>已验证</small></div></div> },
    ],
    tables: [
      {
        name: '数据表 grid',
        node: (
          <table className="pmwb-table" style={{ minWidth: 320 }}>
            <thead><tr><th>检查</th><th>状态</th><th>证据</th></tr></thead>
            <tbody>
              <tr><td>构建与单元测试</td><td><Badge tone="ok">passed</Badge></td><td className="pmwb-mono">GRN-0006</td></tr>
              <tr><td>浏览器界面检查</td><td><Badge tone="ok">passed</Badge></td><td className="pmwb-mono">GRN-0007</td></tr>
              <tr><td>类型检查</td><td><Badge tone="warn">not_run</Badge></td><td className="pmwb-mono">—</td></tr>
            </tbody>
          </table>
        ),
      },
      { name: '栅格 grid-2col', node: <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: 260 }}>{[1, 2, 3, 4].map((n) => <div key={n} style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 10px', fontSize: 12 }}>栅格 {n}</div>)}</div> },
      { name: '键值对 kv', node: <div style={{ width: 260 }}><dl className="pmwb-kv"><dt>基线</dt><dd><Badge tone="ok">confirmed</Badge></dd><dt>对象</dt><dd>20</dd></dl></div> },
    ],
    layout: [
      { name: '间距尺度 spacing', node: <div>{['xs', 'sm', 'md', 'lg', 'xl', 'xxl'].map((k) => <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><span className="pmwb-muted" style={{ width: 30 }}>{k}</span><span style={{ height: 10, width: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }[k as 'xs'] ?? 8, background: 'var(--tk-color-brand-primary,#1677ff)', borderRadius: 2, display: 'inline-block' }} /></div>)}</div> },
      { name: '断点 breakpoints', node: <div>{[['sm', 576], ['md', 768], ['lg', 992], ['xl', 1200]].map(([k, w]) => <div key={k as string} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><span className="pmwb-muted" style={{ width: 30 }}>{k}</span><span style={{ height: 10, width: `${(w as number) / 12}px`, maxWidth: 200, background: '#1677ff', borderRadius: 2, display: 'inline-block' }} /><span className="pmwb-muted">{w}</span></div>)}</div> },
      { name: '阴影 elevation', node: <div style={{ display: 'flex', gap: 10 }}><div style={{ width: 64, height: 42, borderRadius: 8, background: '#fff', boxShadow: 'var(--tk-elevation-card,none)', border: '1px solid #f3f4f6' }} /><div style={{ width: 64, height: 42, borderRadius: 8, background: '#fff', boxShadow: 'var(--tk-elevation-popover,none)', border: '1px solid #f3f4f6' }} /></div> },
    ],
    icons: [
      { name: '功能图标集', node: (
        <div className="pmwb-icon-row">
          <svg viewBox="0 0 16 16" fill="none"><path d="M2 8.5 6 12l8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <svg viewBox="0 0 16 16" fill="none"><path d="m3 3 10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          <svg viewBox="0 0 16 16" fill="none"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <svg viewBox="0 0 16 16" fill="none"><rect x="2" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><path d="M2 6h12" stroke="currentColor" strokeWidth="1.5" /></svg>
          <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" /><circle cx="8" cy="8" r="2" fill="currentColor" /></svg>
          <svg viewBox="0 0 16 16" fill="none"><ellipse cx="8" cy="3.5" rx="5.5" ry="2.2" stroke="currentColor" strokeWidth="1.4" /><path d="M2.5 3.5V12c0 1.2 2.5 2.2 5.5 2.2s5.5-1 5.5-2.2V3.5" stroke="currentColor" strokeWidth="1.4" /></svg>
        </div>
      ) },
    ],
    cards: [
      { name: '基础卡 card', node: <div style={{ width: 250 }}><Card title="项目"><div className="pmwb-muted">pomaster client · 20 对象</div></Card></div> },
      { name: '错误提示 error', node: <div style={{ width: 250 }}><div className="pmwb-err">有检查项未全绿——展开查看明细</div></div> },
    ],
    empty: [
      { name: '空状态 empty', node: <div style={{ width: 230 }}><EmptyState line1="没有需要你处理的决策" line2="Agent 可以继续执行当前任务。" next="运行验证场景" /></div> },
    ],
    documents: [
      { name: '文档版式 doc-layout', node: (
        <div style={{ width: 340 }}>
          <div className="pmwb-doc-title">2026-10-02 · 任务标题</div>
          <div className="pmwb-doc-sub">副标题与日期说明</div>
          <div className="pmwb-sec-title">小节标题</div>
          <p className="pmwb-para">文档正文段落，用于知识页与任务详情的阅读排版。</p>
          <ul className="pmwb-list"><li>要点一</li><li>要点二</li></ul>
        </div>
      ) },
      { name: '代码块 code-block', node: <pre className="pmwb-pre" style={{ width: 320 }}>{'{\n  "command": "status",\n  "ok": true,\n  "result": { } \n}'}</pre> },
    ],
    palette: [],
  }
}

function LongTextDemo(): React.ReactElement {
  const [open, setOpen] = useState(false)
  const text = '长文折叠示例：超过限定长度的文本先截断，点击「展开全文」后再完整呈现，避免长段内容占满首屏。'
  return (
    <span>
      {open ? text : `${text.slice(0, 30)}…`}{' '}
      <a onClick={() => setOpen(!open)} style={{ color: 'var(--tk-color-brand-primary,#1677ff)', cursor: 'pointer', whiteSpace: 'nowrap' }}>{open ? '收起' : '展开全文'}</a>
    </span>
  )
}

const CATEGORY_ORDER: Array<{ id: string; icon: React.ReactNode; nameKey: string }> = [
  { id: 'typography', icon: G.typography, nameKey: 'gallery.cat.typography' },
  { id: 'paragraphs', icon: G.docs, nameKey: 'gallery.cat.paragraphs' },
  { id: 'badges', icon: G.badges, nameKey: 'gallery.cat.badges' },
  { id: 'buttons', icon: G.buttons, nameKey: 'gallery.cat.buttons' },
  { id: 'progress', icon: G.progress, nameKey: 'gallery.cat.progress' },
  { id: 'tables', icon: G.tables, nameKey: 'gallery.cat.tables' },
  { id: 'layout', icon: G.layout, nameKey: 'gallery.cat.layout' },
  { id: 'icons', icon: G.icons, nameKey: 'gallery.cat.icons' },
  { id: 'cards', icon: G.cards, nameKey: 'gallery.cat.cards' },
  { id: 'empty', icon: G.empty, nameKey: 'gallery.cat.empty' },
  { id: 'documents', icon: G.docs, nameKey: 'gallery.cat.documents' },
  { id: 'palette', icon: G.palette, nameKey: 'gallery.cat.palette' },
]

function GalleryView(props: { t: Translate; onOpenStorybook: () => void; storybookAvailable: boolean }): React.ReactElement {
  // t available via props

  const { t } = props
  const [openCat, setOpenCat] = useState<string | null>(null)
  const all = buildSamples(t)
  if (openCat !== null) {
    const meta = CATEGORY_ORDER.find((c) => c.id === openCat)
    if (openCat === 'palette') {
      return (
        <>
          <div className="pmwb-breadcrumb"><a onClick={() => setOpenCat(null)}>{t('gallery.all')}</a> / <b>{t('gallery.cat.palette')}</b></div>
          <PaletteGroups />
        </>
      )
    }
    const samples = all[openCat] ?? []
    return (
      <>
        <div className="pmwb-breadcrumb"><a onClick={() => setOpenCat(null)}>{t('gallery.all')}</a> / <b>{meta !== undefined ? t(meta.nameKey) : openCat}</b></div>
        <div className="pmwb-gallery">
          {samples.map((s, i) => <SampleFrame key={i} name={s.name}>{s.node}</SampleFrame>)}
        </div>
      </>
    )
  }
  return (
    <div className="pmwb-gallery">
      {CATEGORY_ORDER.map((c) => (
        <div key={c.id} className="pmwb-tile" onClick={() => setOpenCat(c.id)}>
          <div className="pmwb-tile-icon">{c.icon}</div>
          <div className="pmwb-tile-name">{t(c.nameKey)}</div>
        </div>
      ))}
      <div className="pmwb-tile" onClick={props.onOpenStorybook} role="button">
        <div className="pmwb-tile-icon">{G.storybook}</div>
        <div className="pmwb-tile-name">Reference Storybook</div>
        <div className="pmwb-tile-count">{props.storybookAvailable ? props.t('cmp.available') : props.t('cmp.offlineShort')}</div>
      </div>
    </div>
  )
}

function PaletteGroups(): React.ReactElement {
  const theme = usePageData<ThemePayload>(() => getJSON('/api/pomaster/theme'), [])
  const swatches = Object.entries(theme.data?.tokens ?? {}).filter(([k]) => k.startsWith('color.'))
  const groups: Record<string, Array<[string, string]>> = {}
  for (const [k, v] of swatches) {
    const g = k.split('.')[1] ?? 'other'
    ;(groups[g] ??= []).push([k, v])
  }
  return (
    <>
      {Object.entries(groups).map(([group, list]) => (
        <Card key={group} title={`${group} · ${list.length}`}>
          <div className="pmwb-swatch">
            {list.map(([k, v]) => (
              <div key={k} style={{ cursor: 'pointer' }} title={'click: copy ' + v} onClick={() => { void navigator.clipboard?.writeText(v) }}>
                <div className="sw-color" style={{ background: v }} />
                <div className="sw-name">{k}<br />{v}</div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </>
  )
}

/** Full storybook workbench (v4) — tree + docs/story preview + palette. */
function StorybookWorkbench(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const studio = usePageData<StudioPayload>(() => getJSON('/api/pomaster/studio-status'), [])
  const [filter, setFilter] = useState('')
  const [storyId, setStoryId] = useState<string | null>(null)
  if (studio.data === null) return <div className="pmwb-empty">{t('common.loading')}</div>
  const available = studio.data.react.available === true
  const base = studio.data.react.base
  const stories = studio.data.stories
  const tree = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const filtered = q === '' ? stories : stories.filter((s) => `${s.title} ${s.name}`.toLowerCase().includes(q))
    const byTitle = new Map<string, StoryEntry[]>()
    for (const s of filtered) {
      const arr = byTitle.get(s.title) ?? []
      arr.push(s)
      byTitle.set(s.title, arr)
    }
    return Array.from(byTitle.entries()).map(([title, list]) => ({
      title,
      docs: list.filter((s) => s.type === 'docs'),
      stories: list.filter((s) => s.type !== 'docs'),
    })).filter((g) => g.docs.length > 0 || g.stories.length > 0)
  }, [stories, filter])
  const selected = stories.find((s) => s.id === storyId) ?? null
  const isDocs = selected?.id.endsWith('--docs') === true

  if (!available) {
    return (
      <Card title={t('cmp.offline')}>
        <div className="pmwb-mono pmwb-muted" style={{ marginBottom: 8 }}>{studio.data.startCommand}</div>
        <button className="pmwb-btn" onClick={studio.reload}>{t('components.recheck')}</button>
      </Card>
    )
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0,1fr)', gap: 12, alignItems: 'start' }}>
      <div className="pmwb-tree-panel">
        <div style={{ position: 'relative', marginBottom: 6 }}>
          <span style={{ position: 'absolute', left: 8, top: 8, color: '#9ca3af' }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" /><path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </span>
          <input className="pmwb-input" style={{ width: '100%', minWidth: 0, paddingLeft: 26 }} placeholder={t('cmp.searchStories')} value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        {tree.map((g) => (
          <div key={g.title}>
            <div className="pmwb-tree-group">{g.title}</div>
            {g.docs.map((d) => (
              <div key={d.id} className="pmwb-tree-item" data-active={String(storyId === d.id)} onClick={() => setStoryId(d.id)}>📄 {d.name === 'Docs' ? t('cmp.docs') : d.name}</div>
            ))}
            {g.stories.map((s) => (
              <div key={s.id} className="pmwb-tree-item" data-active={String(storyId === s.id)} onClick={() => setStoryId(s.id)}>{s.name}</div>
            ))}
          </div>
        ))}
      </div>
      <Card title={selected !== null ? `${selected.title} · ${selected.name}` : t('cmp.previewTitle')}>
        {selected === null ? <EmptyState line1={t('cmp.pickStory')} /> : (
          <iframe
            src={`${base}/iframe.html?id=${encodeURIComponent(selected.id)}&viewMode=${isDocs ? 'docs' : 'story'}`}
            title={selected.id}
            style={{ width: '100%', height: 620, border: '1px solid #e5e7eb', borderRadius: 8, display: 'block', background: '#fff' }}
          />
        )}
      </Card>
    </div>
  )
}

/* ============================================================ page */

export function ComponentsPage2(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const studio = usePageData<StudioPayload>(() => getJSON('/api/pomaster/studio-status'), [])
  const [showStorybook, setShowStorybook] = useState(false)
  const available = studio.data?.react.available === true
  const stories = studio.data?.stories ?? []
  const componentCount = new Set(stories.filter((s) => s.type !== 'docs').map((s) => s.title)).size
  return (
    <div>
      <DocTitle summary={t('cmp.title')} sub={t('cmp.metaFull', { components: String(componentCount), docs: String(studio.data?.stories.filter((s) => s.type === 'docs').length ?? 0), stories: String(stories.length) })} />
      <SectionTitle>{t('gallery.title')}</SectionTitle>
      <GalleryView
        t={t}
        storybookAvailable={available}
        onOpenStorybook={() => setShowStorybook(true)}
      />
      {(showStorybook || available) && (
        <>
          <SectionTitle>{t('cmp.refTitle')}</SectionTitle>
          {showStorybook ? (
            <StorybookWorkbench t={t} />
          ) : (
            <Card>
              <div className="pmwb-actions" style={{ justifyContent: 'space-between' }}>
                <span className="pmwb-muted">{t('cmp.storybookTeaser')}</span>
                <button className="pmwb-btn" onClick={() => setShowStorybook(true)}>{t('cmp.openWorkbench')}</button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
