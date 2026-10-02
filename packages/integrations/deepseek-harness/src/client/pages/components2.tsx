/** Components (PR-IA-4, v3): full Storybook tree + docs/story dual preview + design-token palette. */
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
  // group by top-level title segment; then second segment (component); docs entries attach to their component
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
  const colorSwatches = Object.entries(theme.data?.tokens ?? {}).filter(([k]) => k.startsWith('color.'))

  const selectedStory = stories.find((s) => s.id === storyId) ?? null

  const StoryTree = (): React.ReactElement => (
    <div style={{ maxHeight: 560, overflow: 'auto', paddingRight: 4 }}>
      <input className="pmwb-input" style={{ width: '100%', minWidth: 0, marginBottom: 8 }} placeholder={t('cmp.searchStories')} value={filter} onChange={(e) => setFilter(e.target.value)} />
      {tree.map((g) => (
        <div key={g.title} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', margin: '6px 0 3px' }}>{g.title}</div>
          {g.docs.map((d) => (
            <div
              key={d.id}
              className="pmwb-tile"
              style={{ padding: '4px 10px', textAlign: 'left', fontSize: 12.5, marginBottom: 2, borderColor: storyId === d.id ? 'var(--tk-color-brand-primary,#1677ff)' : undefined }}
              onClick={() => setStoryId(d.id)}
            >
              📄 {d.name === 'Docs' ? t('cmp.docs') : d.name}
            </div>
          ))}
          {g.stories.map((s) => (
            <div
              key={s.id}
              className="pmwb-tile"
              style={{ padding: '4px 10px', textAlign: 'left', fontSize: 12.5, marginBottom: 2, borderColor: storyId === s.id ? 'var(--tk-color-brand-primary,#1677ff)' : undefined }}
              onClick={() => setStoryId(s.id)}
            >
              {s.name}
            </div>
          ))}
        </div>
      ))}
      {tree.length === 0 && <div className="pmwb-empty">{t('common.empty')}</div>}
    </div>
  )

  const Preview = (): React.ReactElement => {
    if (storyId === null) return <EmptyState line1={t('cmp.pickStory')} />
    const isDocs = storyId.endsWith('--docs')
    return (
      <iframe
        src={`${base}/iframe.html?id=${encodeURIComponent(storyId)}&viewMode=${isDocs ? 'docs' : 'story'}`}
        title={storyId}
        style={{ width: '100%', height: 640, border: '1px solid #e5e7eb', borderRadius: 8, display: 'block', background: '#fff' }}
      />
    )
  }

  return (
    <div>
      <DocTitle summary={t('cmp.title')} sub={t('cmp.metaFull', { components: String(componentCount), docs: String(docsCount), stories: String(stories.length) })} />
      <div className="pmwb-tabs" style={{ marginBottom: 12 }}>
        {(['reference', 'project', 'compare'] as const).map((v) => (
          <button key={v} className="pmwb-tab" data-active={view === v} onClick={() => setView(v)}>{t(`cmp.view.${v}`)}</button>
        ))}
      </div>

      {studio.data === null && <div className="pmwb-empty">{t('common.loading')}</div>}

      {studio.data !== null && !available && (
        <Card title={t('cmp.offline')}>
          <div className="pmwb-mono pmwb-muted" style={{ marginBottom: 8 }}>{studio.data.startCommand}</div>
          <button className="pmwb-btn" onClick={studio.reload}>{t('components.recheck')}</button>
        </Card>
      )}

      {studio.data !== null && available && view === 'reference' && (
        <>
          <div className="pmwb-actions" style={{ flexWrap: 'wrap' }}>
            <Badge tone="neutral">{t('cmp.statComponents', { n: componentCount })}</Badge>
            <Badge tone="neutral">{t('cmp.statDocs', { n: docsCount })}</Badge>
            <Badge tone="neutral">{t('cmp.statStories', { n: stories.length })}</Badge>
            {selectedStory !== null && <AskRefButtonCustom refId={`storybook:${selectedStory.id}`} t={t} />}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0,1fr)', gap: 12 }}>
            <Card title={t('cmp.storyTree')}><StoryTree /></Card>
            <div>
              <Card title={selectedStory !== null ? `${selectedStory.title} · ${selectedStory.name}` : t('cmp.previewTitle')}>
                <Preview />
              </Card>
            </div>
          </div>
          <SectionTitle>{t('components.paletteTitle')}</SectionTitle>
          <Card>
            {colorSwatches.length === 0 ? <div className="pmwb-empty">{t('common.loading')}</div> : (
              <div className="pmwb-swatch">
                {colorSwatches.map(([k, v]) => (
                  <div key={k}><div className="sw-color" style={{ background: v }} /><div className="sw-name">{k}<br />{v}</div></div>
                ))}
              </div>
            )}
          </Card>
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

function AskRefButtonCustom(props: { refId: string; t: Translate }): React.ReactElement {
  const [copied, setCopied] = useState(false)
  return (
    <button className="pmwb-btn" style={{ fontSize: 12 }} onClick={() => {
      void navigator.clipboard?.writeText(props.refId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
    }}>
      {copied ? '✓ ref copied' : props.t('askAgent')}
    </button>
  )
}
