/** Components (PR-IA-4): Reference / Project / Compare — live Storybook consumption. */
import React, { useState } from 'react'
import { getJSON } from '../api.ts'
import { Badge, Card, DocTitle, EmptyState, SectionTitle, str, usePageData, type AnyRecord } from '../ui.tsx'
import type { Translate } from '../i18n.ts'

interface StudioPayload {
  react: { available: boolean; base: string }
  stories: Array<{ id: string; title: string; name: string }>
  startCommand: string
}

function StoryPreview(props: { base: string; storyId: string | null; height?: number; t: Translate }): React.ReactElement {
  const { base, storyId } = props
  if (storyId === null) return <div className="pmwb-empty">{props.t('cmp.pickStory')}</div>
  return (
    <iframe
      src={`${base}/iframe.html?id=${encodeURIComponent(storyId)}&viewMode=story`}
      title={storyId}
      style={{ width: '100%', height: props.height ?? 380, border: '1px solid var(--tk-color-border-default,#d9d9d9)', borderRadius: 8, display: 'block', background: '#fff' }}
    />
  )
}

export function ComponentsPage2(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const studio = usePageData<StudioPayload>(() => getJSON('/api/pomaster/studio-status'), [])
  const [view, setView] = useState<'reference' | 'project' | 'compare'>('reference')
  const [storyId, setStoryId] = useState<string | null>(null)
  const available = studio.data?.react.available === true
  const stories = studio.data?.stories ?? []
  const families = ['Button', 'Table', 'Input', 'Form', 'Switch']
  const matched = families.map((f) => ({
    family: f,
    stories: stories.filter((s) => s.title.toLowerCase().includes(f.toLowerCase())),
  }))

  return (
    <div>
      <DocTitle summary={t('cmp.title')} sub={t('cmp.meta')} />
      <div className="pmwb-tabs" style={{ marginBottom: 12 }}>
        {(['reference', 'project', 'compare'] as const).map((v) => (
          <button key={v} className="pmwb-tab" data-active={view === v} onClick={() => setView(v)}>
            {t(`cmp.view.${v}`)}
          </button>
        ))}
      </div>

      {studio.data === null && <div className="pmwb-empty">{t('common.loading')}</div>}

      {studio.data !== null && !available && (
        <Card title={t('cmp.offline')}>
          <div className="pmwb-mono pmwb-muted" style={{ marginBottom: 8 }}>{studio.data.startCommand}</div>
          <button className="pmwb-btn" onClick={studio.reload}>{t('components.recheck')}</button>
        </Card>
      )}

      {studio.data !== null && available && (
        <>
          {view === 'reference' && (
            <>
              <SectionTitle>{t('cmp.refTitle')}</SectionTitle>
              <div className="pmwb-grid2">
                <Card title={t('cmp.stories', { n: stories.length })}>
                  <div style={{ maxHeight: 420, overflow: 'auto' }}>
                    {matched.map((fam) => (
                      <div key={fam.family} style={{ marginBottom: 10 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, margin: '6px 0' }}>{fam.family}</div>
                        {fam.stories.length === 0 ? <div className="pmwb-muted" style={{ fontSize: 12 }}>—</div> : fam.stories.map((s) => (
                          <div
                            key={s.id}
                            className="pmwb-tile"
                            style={{ padding: '5px 10px', textAlign: 'left', marginBottom: 3, fontSize: 12.5, borderColor: storyId === s.id ? 'var(--tk-color-brand-primary,#1677ff)' : undefined }}
                            onClick={() => setStoryId(s.id)}
                          >
                            {s.title} · {s.name}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </Card>
                <Card title={t('cmp.livePreview')}>
                  <StoryPreview base={studio.data.react.base} storyId={storyId} t={t} />
                  {storyId !== null && <div className="pmwb-actions" style={{ marginTop: 6 }}><AskRefButton refId={`storybook:${storyId}`} t={t} /></div>}
                </Card>
              </div>
            </>
          )}

          {view === 'project' && (
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

          {view === 'compare' && (
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
        </>
      )}
    </div>
  )
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

// re-export for type reuse in shell
export { str as _str, type AnyRecord as _AnyRecord }
