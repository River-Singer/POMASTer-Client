/** Components (PR-IA-4, v4 taste pass): full Storybook tree, stats, docs/story preview,
 * grouped design-token palette. White-dominant clean modern; single accent; no emoji
 * in markup (inline SVG glyphs only, strokeWidth 1.5 — no icon library in this bundle). */
import React, { useMemo, useState } from 'react'
import { getJSON } from '../api.ts'
import { Badge, Card, DocTitle, EmptyState, SectionTitle, str, usePageData, type AnyRecord } from '../ui.tsx'
import type { Translate } from '../i18n.ts'

interface StoryEntry { id: string; title: string; name: string; type: string }
interface StudioPayload {
  react: { available: boolean; base: string }
  stories: StoryEntry[]
  startCommand: string
}
interface ThemePayload { tokens: Record<string, string> }

/* --- inline glyphs (primitive-composed; one visual family, stroke 1.5) --- */
const GlyphDoc = (): React.ReactElement => (
  <svg className="ti-icon" viewBox="0 0 16 16" fill="none"><path d="M4 1.5h5.5L12.5 4v10.5h-8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M9 1.5V4h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
)
const GlyphStory = (): React.ReactElement => (
  <svg className="ti-icon" viewBox="0 0 16 16" fill="none"><rect x="2" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><path d="M2 6h12" stroke="currentColor" strokeWidth="1.5" /></svg>
)
const GlyphSearch = (): React.ReactElement => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" /><path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
)

const CAT_GLYPHS: Record<string, React.ReactNode> = {
  typography: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 6h14M5 6v-2h14v2M12 6v14M9 20h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  badges: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="3" y="8" width="18" height="8" rx="4" stroke="currentColor" strokeWidth="1.5" /><circle cx="8" cy="12" r="1.6" fill="currentColor" /></svg>,
  buttons: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="3" y="8" width="18" height="8" rx="3" stroke="currentColor" strokeWidth="1.5" /><path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  progress: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="3" y="10" width="18" height="4" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M3 12h9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>,
  tables: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M3 9h18M3 14h18M9 4v16" stroke="currentColor" strokeWidth="1.5" /></svg>,
  layout: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M3 9h18M12 9v12" stroke="currentColor" strokeWidth="1.5" /></svg>,
  icons: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" /><rect x="13" y="3" width="8" height="8" rx="4" stroke="currentColor" strokeWidth="1.5" /><rect x="3" y="13" width="8" height="8" rx="4" stroke="currentColor" strokeWidth="1.5" /><rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" /></svg>,
  cards: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" /><path d="M4 10h16" stroke="currentColor" strokeWidth="1.5" /></svg>,
  empty: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" /></svg>,
  palette: <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" opacity=".85" /><rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" fill="currentColor" opacity=".4" /></svg>,
}

function AskRefButton(props: { refId: string; t: Translate }): React.ReactElement {
  const [copied, setCopied] = useState(false)
  return (
    <button className="pmwb-btn" style={{ fontSize: 12 }} onClick={() => {
      void navigator.clipboard?.writeText(props.refId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
    }}>
      {copied ? '✓ ref copied' : props.t('askAgent')}
    </button>
  )
}

export function ComponentsPage2(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const studio = usePageData<StudioPayload>(() => getJSON('/api/pomaster/studio-status'), [])
  const theme = usePageData<ThemePayload>(() => getJSON('/api/pomaster/theme'), [])
  const [view, setView] = useState<'reference' | 'project' | 'compare'>('reference')
  const [filter, setFilter] = useState('')
  const [storyId, setStoryId] = useState<string | null>(null)
  const available = studio.data?.react.available === true
  const base = studio.data?.react.base ?? ''

  const stories = studio.data?.stories ?? []
  const tree = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const filtered = q === '' ? stories : stories.filter((s) => `${s.title} ${s.name}`.toLowerCase().includes(q))
    const byTitle = new Map<string, StoryEntry[]>()
    for (const s of filtered) {
      const arr = byTitle.get(s.title) ?? []
      arr.push(s)
      byTitle.set(s.title, arr)
    }
    const groups: Array<{ title: string; docs: StoryEntry[]; stories: StoryEntry[] }> = []
    for (const [title, list] of byTitle) {
      const docs = list.filter((s) => s.type === 'docs')
      const storiesOnly = list.filter((s) => s.type !== 'docs')
      if (docs.length === 0 && storiesOnly.length === 0) continue
      groups.push({ title, docs, stories: storiesOnly })
    }
    return groups
  }, [stories, filter])

  const componentCount = new Set(stories.filter((s) => s.type !== 'docs').map((s) => s.title)).size
  const docsCount = stories.filter((s) => s.type === 'docs').length
  const selectedStory = stories.find((s) => s.id === storyId) ?? null
  const selectedIsDocs = selectedStory?.id.endsWith('--docs') === true
  const colorSwatches = Object.entries(theme.data?.tokens ?? {}).filter(([k]) => k.startsWith('color.'))
  const paletteGroups: Record<string, Array<[string, string]>> = {}
  for (const [k, v] of colorSwatches) {
    const g = k.split('.')[1] ?? 'other'
    ;(paletteGroups[g] ??= []).push([k, v])
  }

  return (
    <div>
      <DocTitle summary={t('cmp.title')} sub={t('cmp.metaFull', { components: String(componentCount), docs: String(docsCount), stories: String(stories.length) })} />
      <div className="pmwb-tabs" style={{ marginBottom: 14 }}>
        {(['reference', 'project', 'compare'] as const).map((v) => (
          <button key={v} className="pmwb-tab" data-active={view === v} onClick={() => setView(v)}>{t(`cmp.view.${v}`)}</button>
        ))}
      </div>

      {studio.data === null && (
        <div className="pmwb-grid2">
          <div className="pmwb-skel" style={{ height: 120 }} /><div className="pmwb-skel" style={{ height: 120 }} />
        </div>
      )}

      {studio.data !== null && !available && (
        <Card title={t('cmp.offline')}>
          <div className="pmwb-mono pmwb-muted" style={{ marginBottom: 8 }}>{studio.data.startCommand}</div>
          <button className="pmwb-btn" onClick={studio.reload}>{t('components.recheck')}</button>
        </Card>
      )}

      {studio.data !== null && available && view === 'reference' && (
        <>
          <div className="pmwb-cmp-head">
            <div className="pmwb-cmp-stat"><div className="n">{componentCount}</div><div className="l">{t('cmp.statComponents', { n: '' }).replace('  ', ' ').trim()}</div></div>
            <div className="pmwb-cmp-stat"><div className="n">{docsCount}</div><div className="l">{t('cmp.statDocs', { n: '' }).trim()}</div></div>
            <div className="pmwb-cmp-stat"><div className="n">{stories.length}</div><div className="l">{t('cmp.statStories', { n: '' }).trim()}</div></div>
            <div style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              {selectedStory !== null && <AskRefButton refId={`storybook:${selectedStory.id}`} t={t} />}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0,1fr)', gap: 12, alignItems: 'start' }}>
            <div className="pmwb-tree-panel">
              <div style={{ position: 'relative', marginBottom: 6 }}>
                <span style={{ position: 'absolute', left: 8, top: 8, color: '#9ca3af' }}><GlyphSearch /></span>
                <input
                  className="pmwb-input"
                  style={{ width: '100%', minWidth: 0, paddingLeft: 26 }}
                  placeholder={t('cmp.searchStories')}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
              {tree.map((g) => (
                <div key={g.title}>
                  <div className="pmwb-tree-group">{g.title}</div>
                  {g.docs.map((d) => (
                    <div key={d.id} className="pmwb-tree-item" data-active={String(storyId === d.id)} onClick={() => setStoryId(d.id)}>
                      <GlyphDoc /><span>{d.name === 'Docs' ? t('cmp.docs') : d.name}</span>
                    </div>
                  ))}
                  {g.stories.map((s) => (
                    <div key={s.id} className="pmwb-tree-item" data-active={String(storyId === s.id)} onClick={() => setStoryId(s.id)}>
                      <GlyphStory /><span>{s.name}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <Card title={selectedStory !== null ? `${selectedStory.title} · ${selectedStory.name}` : t('cmp.previewTitle')}>
              {storyId === null ? (
                <EmptyState line1={t('cmp.pickStory')} />
              ) : (
                <>
                  <div className="pmwb-toolbar">
                    <Badge tone={selectedIsDocs ? 'neutral' : 'ok'}>{selectedIsDocs ? t('cmp.docs') : 'story'}</Badge>
                    <span className="pmwb-mono pmwb-faint">{String(selectedStory?.id ?? '')}</span>
                  </div>
                  <PreviewFrame base={base} storyId={storyId} isDocs={selectedIsDocs} />
                </>
              )}
            </Card>
          </div>
          <SectionTitle>{t('components.paletteTitle')}</SectionTitle>
          {Object.entries(paletteGroups).map(([group, swatches]) => (
            <Card key={group} title={`${t('components.paletteGroup')} · ${group}`}>
              <div className="pmwb-swatch">
                {swatches.map(([k, v]) => (
                  <div key={k} style={{ cursor: 'pointer' }} title={'click: copy ' + v}
                    onClick={() => { void navigator.clipboard?.writeText(v) }}>
                    <div className="sw-color" style={{ background: v }} />
                    <div className="sw-name">{k.replace('color.', '')}<br />{v}</div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </>
      )}

      {studio.data !== null && available && view === 'project' && (
        <>
          <SectionTitle>{t('cmp.projTitle')}</SectionTitle>
          <Card meta={t('cmp.projectNote')}>
            <div className="pmwb-grid2">
              <div className="pmwb-sample-frame">
                <button className="pmwb-btn" style={{ background: 'var(--tk-color-brand-primary,#1677ff)', borderColor: 'var(--tk-color-brand-primary,#1677ff)', color: '#fff' }}>primary</button>
                <button className="pmwb-btn">default</button>
                <button className="pmwb-btn" disabled>disabled</button>
                <div className="pmwb-sample-name">pmwb-btn · primary/default/disabled</div>
              </div>
              <div className="pmwb-sample-frame">
                <table className="pmwb-table">
                  <thead><tr><th>gate</th><th>verdict</th></tr></thead>
                  <tbody>
                    <tr><td>BUILD</td><td><Badge tone="ok">passed</Badge></td></tr>
                    <tr><td>BROWSER</td><td><Badge tone="ok">passed</Badge></td></tr>
                  </tbody>
                </table>
                <div className="pmwb-sample-name">pmwb-table</div>
              </div>
              <div className="pmwb-sample-frame">
                <input className="pmwb-input" placeholder="input" readOnly />
                <input className="pmwb-input" placeholder="disabled" readOnly disabled />
                <div className="pmwb-sample-name">pmwb-input</div>
              </div>
            </div>
          </Card>
        </>
      )}

      {studio.data !== null && available && view === 'compare' && (
        <>
          <SectionTitle>{t('cmp.compareTitle')}</SectionTitle>
          <Card title="Button — Reference (AntD) vs Project (pmwb-btn)">
            <table className="pmwb-table">
              <thead><tr><th>aspect</th><th>Reference · AntD Button</th><th>Project · pmwb-btn</th></tr></thead>
              <tbody>
                <tr><td>variants</td><td>primary / default / dashed / link / text</td><td>primary / default / danger / link</td></tr>
                <tr><td>states</td><td>hover / focus / loading / disabled</td><td>hover / disabled</td></tr>
                <tr><td>tokens</td><td>colorPrimary</td><td>--tk-color-brand-primary</td></tr>
                <tr><td>lineage</td><td>Ant Design baseline</td><td>adopted (token-mapped)</td></tr>
              </tbody>
            </table>
          </Card>
          <Card title="Table — Reference (AntD) vs Project (pmwb-table)">
            <table className="pmwb-table">
              <thead><tr><th>aspect</th><th>Reference · AntD Table</th><th>Project · pmwb-table</th></tr></thead>
              <tbody>
                <tr><td>features</td><td>sorting / pagination / fixed cols</td><td>plain rows + badges</td></tr>
                <tr><td>tokens</td><td>colorBorderSecondary</td><td>--tk-color-border-subtle</td></tr>
                <tr><td>lineage</td><td>Ant Design baseline</td><td>adopted (subset)</td></tr>
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}

function PreviewFrame(props: { base: string; storyId: string; isDocs: boolean }): React.ReactElement {
  const [loaded, setLoaded] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      {!loaded && <div className="pmwb-skel" style={{ height: 620 }} />}
      <iframe
        src={`${props.base}/iframe.html?id=${encodeURIComponent(props.storyId)}&viewMode=${props.isDocs ? 'docs' : 'story'}`}
        title={props.storyId}
        onLoad={() => setLoaded(true)}
        style={{ width: '100%', height: 620, border: '1px solid #e5e7eb', borderRadius: 8, display: loaded ? 'block' : 'none', background: '#fff' }}
      />
    </div>
  )
}
