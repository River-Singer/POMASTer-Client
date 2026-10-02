/** Knowledge (PR-IA-3): three-pane browser — Navigation | Document | Metadata. */
import React, { useState } from 'react'
import { getJSON } from '../api.ts'
import { Badge, AskAgent, Card, SectionTitle, isRec, str, usePageData, type AnyRecord } from '../ui.tsx'
import type { Translate } from '../i18n.ts'

interface DocEntry { name: string; group: string }
interface DocsPayload { docs: DocEntry[]; specTree: Array<{ name: string; group: string }>; note?: string }
interface RoutingPayload { check?: { result?: { manifest?: { must_entries?: Array<{ ref?: string }> } } } }

/** Minimal markdown renderer: headings, lists, code fences, inline code, bold. */
function renderMarkdown(src: string): React.ReactNode {
  const lines = src.split(/\r?\n/)
  const out: React.ReactNode[] = []
  let inCode = false
  let codeBuf: string[] = []
  let listBuf: string[] = []
  const flushList = (key: string): void => {
    if (listBuf.length > 0) {
      out.push(<ul key={key} className="pmwb-list">{listBuf.map((li, i) => <li key={i}>{inline(li)}</li>)}</ul>)
      listBuf = []
    }
  }
  const inline = (text: string): React.ReactNode => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean)
    return parts.map((p, i) =>
      p.startsWith('`') ? <code key={i} className="pmwb-mono">{p.slice(1, -1)}</code>
        : p.startsWith('**') ? <b key={i}>{p.slice(2, -2)}</b>
          : p,
    )
  }
  lines.forEach((raw, idx) => {
    if (raw.startsWith('```')) {
      if (inCode) {
        out.push(<pre key={`c${idx}`} className="pmwb-pre">{codeBuf.join('\n')}</pre>)
        codeBuf = []
        inCode = false
      } else { inCode = true; flushList(`l${idx}`) }
      return
    }
    if (inCode) { codeBuf.push(raw); return }
    if (raw.startsWith('#')) {
      flushList(`l${idx}`)
      const level = raw.match(/^#+/)?.[0].length ?? 1
      out.push(level <= 2
        ? <div key={idx} className="pmwb-sec-title">{inline(raw.replace(/^#+\s*/, ''))}</div>
        : <div key={idx} style={{ fontWeight: 600, margin: '10px 0 4px' }}>{inline(raw.replace(/^#+\s*/, ''))}</div>)
      return
    }
    if (raw.startsWith('- ') || raw.startsWith('* ')) { listBuf.push(raw.slice(2)); return }
    flushList(`l${idx}`)
    if (raw.trim() !== '') out.push(<p key={idx} className="pmwb-para">{inline(raw)}</p>)
  })
  flushList('l-end')
  return <div>{out}</div>
}

export function KnowledgePage2(props: { t: Translate; routingManifestRefs: string[] }): React.ReactElement {
  const { t } = props
  const { data } = usePageData<DocsPayload>(() => getJSON('/api/pomaster/knowledge-docs'), [])
  const routing = usePageData<RoutingPayload>(() => getJSON('/api/pomaster/routing'), [])
  const [selected, setSelected] = useState<{ name: string; group: string } | null>(null)
  const doc = usePageData<{ name: string; body: string } | null>(
    () => (selected !== null ? getJSON(`/api/pomaster/knowledge-docs?path=${encodeURIComponent(selected.name)}`) : Promise.resolve(null)),
    [selected],
  )
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>

  const mustRefs = new Set<string>(
    (isRec(routing.data) && isRec(routing.data['check'])
      ? ((((routing.data['check'] as AnyRecord)['result'] as AnyRecord | undefined)?.manifest as AnyRecord | undefined)?.must_entries as Array<{ ref?: string }> | undefined) ?? []
      : []
    ).map((m) => str(m['ref'])),
  )

  const nav: Array<{ group: string; items: Array<{ name: string; group: string }> }> = [
    { group: t('kn.groupDocs'), items: data.docs },
    { group: t('kn.groupSpecs'), items: data.specTree },
  ]

  const selectedIsSelected = selected !== null && [...mustRefs].some((r) => r.includes(selected.name.replace(/\.md$/, '')))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '230px minmax(0,1fr) 260px', gap: 12, minHeight: 560 }}>
      {/* Navigation */}
      <div>
        {nav.map((g) => (
          <div key={g.group} style={{ marginBottom: 10 }}>
            <div className="pmwb-sec-title" style={{ margin: '6px 0 4px' }}>{g.group}</div>
            {g.items.map((item) => (
              <div
                key={item.name}
                className="pmwb-tile"
                style={{ padding: '6px 10px', textAlign: 'left', fontSize: 12.5, marginBottom: 3, borderColor: selected?.name === item.name ? 'var(--tk-color-brand-primary,#1677ff)' : undefined }}
                onClick={() => { if (item.name.endsWith('.md')) setSelected(item) }}
              >
                {item.name}
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* Document */}
      <div>
        {selected === null ? (
          <Card><EmptyState line1={t('kn.pickDoc')} line2={t('kn.pickDocHint')} /></Card>
        ) : doc.error !== null ? (
          <div className="pmwb-err">{doc.error}</div>
        ) : doc.data === null ? (
          <div className="pmwb-empty">{t('common.loading')}</div>
        ) : (
          <Card title={selected.name}>
            {renderMarkdown(doc.data.body)}
          </Card>
        )}
      </div>
      {/* Metadata */}
      <div>
        <Card title={t('kn.metadata')}>
          {selected === null ? <div className="pmwb-empty">{t('common.empty')}</div> : (
            <>
              <div className="pmwb-muted" style={{ marginBottom: 6 }}>Type: {selected.group === t('kn.groupDocs') ? 'Project Document' : 'Spec'}</div>
              <KVRows rows={[
                ['Source', `doc/${selected.name}`],
                ['Authority', 'baseline-governed'],
                ['Freshness', 'current'],
                ['Revision', '—'],
              ]} />
              <div style={{ margin: '8px 0' }}>
                {selectedIsSelected ? <Badge tone="ok">{t('kn.selectedByTask')}</Badge> : <Badge tone="neutral">{t('kn.notSelected')}</Badge>}
              </div>
              <AskAgent refId={`knowledge:${selected.name}`} t={t} />
              <div className="pmwb-muted" style={{ marginTop: 6 }}>{t('kn.askHint')}</div>
              <SectionTitle>{t('routing.whySelected')}</SectionTitle>
              <ul className="pmwb-check">
                {[...mustRefs].slice(0, 8).map((r) => (
                  <li key={r}><span className="pmwb-check-mark" data-ok="true">✓</span><div className="pmwb-mono" style={{ fontSize: 11.5 }}>{r}</div></li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

function KVRows(props: { rows: Array<[string, string]> }): React.ReactElement {
  return (
    <dl className="pmwb-kv">
      {props.rows.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}
    </dl>
  )
}

function EmptyState(props: { line1: string; line2?: string }): React.ReactElement {
  return <div className="pmwb-empty">{props.line1}{props.line2 !== undefined && <div>{props.line2}</div>}</div>
}
