/** Workbench copy dictionaries — registered into the DSH locale runtime so the
 * whole panel follows the harness language switch (Settings → General), with
 * en fallback per the locale contract. */

export interface WorkbenchDict { [key: string]: string }

export const ZH: WorkbenchDict = {
  'panel': 'POMaster 工作台',
  // tabs
  'tab.overview': '概览', 'tab.tasks': '任务', 'tab.attention': '注意力', 'tab.knowledge': '知识',
  'tab.routing': '路由', 'tab.topology': '拓扑', 'tab.verification': '验证', 'tab.evidence': '证据',
  'tab.components': '组件', 'tab.actions': '操作',
  // common
  'common.refresh': '刷新', 'common.search': '搜索', 'common.run': '执行', 'common.query': '查询',
  'common.loading': '加载中…', 'common.empty': '暂无', 'common.none': '—', 'common.clean': '干净——当前不需要人工介入',
  'common.polls': '每 10 秒轮询', 'common.authority': '权限要求', 'common.result': '结果',
  'common.kernelRejudge': '每个按钮都映射到既有 pomaster 命令；每次调用由 kernel 重新判卷（PRD §57）。按钮展示所需权限——红色失败即 CLI 自身裁决，绝无绕过（PRD §41）。',
  'common.rejected': '被拒/失败（kernel 裁决）', 'common.ok': '成功',
  // overview
  'overview.project': '项目', 'overview.name': '名称', 'overview.governedBy': '治理方', 'overview.pomaster': 'POMaster（Headless 权威）',
  'overview.cli': 'POMaster CLI', 'overview.baseline': '基线', 'overview.activeTask': '活跃任务',
  'overview.activeCount': '{n} 个进行中', 'overview.none': '无', 'overview.permits': '许可', 'overview.objects': '对象',
  'overview.attention': '注意力', 'overview.tools': '工具 / 环境', 'overview.readiness': '就绪度',
  'overview.capabilities': '能力数', 'overview.bindings': '就绪绑定', 'overview.gaps': '缺口', 'overview.tip': '提示',
  'overview.nextAction': '下一步动作', 'overview.route': '路由', 'overview.beat': '拍',
  // tasks
  'tasks.view': '视图', 'tasks.writeSurface': '写入面', 'tasks.noView': '暂无任务视图',
  // attention
  'attention.envelope': '告警信封（{n}）', 'attention.code': '代码', 'attention.message': '消息', 'attention.hint': '提示',
  'attention.phase1': 'Phase-1 只读（查看 / 定位 / 解释——PRD §26）',
  // knowledge
  'knowledge.searchPlaceholder': '知识检索…', 'knowledge.catalog': '工程目录', 'knowledge.entries': '条目',
  'knowledge.profile': '档案', 'knowledge.lock': '锁定', 'knowledge.hits': '“{q}”的检索命中',
  'knowledge.humanVsAgent': '人类知识库 ≠ Agent 上下文（PRD §13）——Agent 经 spec routing 取最小充分内容，不经本页。',
  // routing
  'routing.budget': '当前任务上下文预算（PRD §13）', 'routing.available': '可用规格', 'routing.selected': '已选（must）',
  'routing.injected': '已注入', 'routing.advisory': '顾问性', 'routing.zeroWrite': '零写入（--check）',
  'routing.whySelected': '为何入选——must（spec routing，M3）', 'routing.whyAdvisory': '顾问知识（永不进 gate 判卷，§83.2）',
  'routing.ref': '引用', 'routing.why': '入选原因（why）', 'routing.noManifest': '无路由清单（零写 check）——原始输出见下方',
  // topology
  'topology.query': '拓扑', 'topology.impact': '影响闭包', 'topology.forward': '前向依赖（边类型 → 目标）',
  'topology.reverse': '反向依赖（谁依赖此对象）', 'topology.projection': '关系投影——不是 Topology Truth Store（PRD §14）',
  'topology.noDownstream': '深度 {d} 内无下游受影响对象',
  // verification
  'verification.dod': 'DoD 判卷（closeout）', 'verification.matrix': '验收 → gate → 人工 ACCEPT 回执（PRD §27 压缩矩阵）',
  'verification.green': '全部 gate 绿——等待/持有人工验收回执', 'verification.failclosed': 'fail-closed：warning / not_run 都不算绿；最新判卷取代旧判。',
  'verification.bindings': 'Gate 绑定（ToolBinding）', 'verification.registryAbsent': '注册面缺席——plan run 显式 not_run（M1 backlog）',
  'verification.finalize': 'Finalize 状态',
  // evidence
  'evidence.lineage': '对象与证据谱系（inspect TASK.DSH_WORKBENCH）',
  'evidence.lineageMeta': '谁产生 · 何时 · 观察什么 · 哪版源码 · 现在还有效吗（PRD §28）',
  'evidence.attached': 'inspect 输出附于下方——claims（CLM-*）与 gate runs（GRN-*）承载谱系。',
  'evidence.ledger': '例外 / 假设台账', 'evidence.ledgerEmpty': '台账为空',
  // components
  'components.model': 'Reference → Adopted → Customized（PRD §20）',
  'components.meta': 'POMaster studio 画廊为生成的参考件（不可导入）；工作台自建表面，画廊仅作 design-token / archetype 参考。',
  'components.archetypes': 'Archetype 卡片', 'components.explainPlaceholder': 'catalog explain <ref>',
  'components.storybook': 'Reference Storybook（studio-react 实时嵌入）',
  'components.storybookOffline': '本地 Storybook（studio-react，端口 6007）未启动——启动后点「重新检测」即可内嵌浏览：',
  'components.recheck': '重新检测',
  // actions
  'actions.title': '变更操作',
  // footer
  'footer.note': 'POMaster Workbench · 只读投影面 · 与 pomaster CLI 同源契约 · @pomaster/dsh-bundle',
}

export const EN: WorkbenchDict = {
  'panel': 'POMaster Workbench',
  'tab.overview': 'Overview', 'tab.tasks': 'Tasks', 'tab.attention': 'Attention', 'tab.knowledge': 'Knowledge',
  'tab.routing': 'Routing', 'tab.topology': 'Topology', 'tab.verification': 'Verification', 'tab.evidence': 'Evidence',
  'tab.components': 'Components', 'tab.actions': 'Actions',
  'common.refresh': 'Refresh', 'common.search': 'Search', 'common.run': 'Run', 'common.query': 'Query',
  'common.loading': 'loading…', 'common.empty': 'none yet', 'common.none': '—', 'common.clean': 'clean — nothing needs a human right now',
  'common.polls': 'polls every 10s', 'common.authority': 'authority', 'common.result': 'result',
  'common.kernelRejudge': 'Every button maps to an EXISTING pomaster command; the kernel re-judges authority on each invocation (PRD §57). Buttons show the required authority — a red failure is the CLI\'s own adjudication, never bypassed (PRD §41).',
  'common.rejected': 'rejected/failed (kernel adjudication)', 'common.ok': 'ok',
  'overview.project': 'Project', 'overview.name': 'Name', 'overview.governedBy': 'Governed by', 'overview.pomaster': 'POMaster (headless authority)',
  'overview.cli': 'POMaster CLI', 'overview.baseline': 'Baseline', 'overview.activeTask': 'Active task',
  'overview.activeCount': '{n} active', 'overview.none': 'none', 'overview.permits': 'Permits', 'overview.objects': 'Objects',
  'overview.attention': 'Attention', 'overview.tools': 'Tools / harness', 'overview.readiness': 'readiness',
  'overview.capabilities': 'capabilities', 'overview.bindings': 'ready bindings', 'overview.gaps': 'gaps', 'overview.tip': 'tip',
  'overview.nextAction': 'Next action', 'overview.route': 'route', 'overview.beat': 'beat',
  'tasks.view': 'view', 'tasks.writeSurface': 'write surface', 'tasks.noView': 'no task view available',
  'attention.envelope': 'Alert envelope ({n})', 'attention.code': 'code', 'attention.message': 'message', 'attention.hint': 'hint',
  'attention.phase1': 'Phase-1 read-only (view / locate / explain — PRD §26)',
  'knowledge.searchPlaceholder': 'knowledge search…', 'knowledge.catalog': 'Engineering catalog', 'knowledge.entries': 'entries',
  'knowledge.profile': 'profile', 'knowledge.lock': 'lock', 'knowledge.hits': 'Search hits for “{q}”',
  'knowledge.humanVsAgent': 'Human library ≠ agent context (PRD §13) — the agent reads via spec routing, not this page.',
  'routing.budget': 'Current task context budget (PRD §13)', 'routing.available': 'Available specs', 'routing.selected': 'Selected (must)',
  'routing.injected': 'Injected', 'routing.advisory': 'Advisory', 'routing.zeroWrite': 'zero-write (--check)',
  'routing.whySelected': 'Why selected — must (spec routing, M3)', 'routing.whyAdvisory': 'Advisory knowledge — never gate input (§83.2)',
  'routing.ref': 'ref', 'routing.why': 'why (reason)', 'routing.noManifest': 'no routing manifest (zero-write check) — see raw below',
  'topology.query': 'Topology', 'topology.impact': 'Impact closure', 'topology.forward': 'Forward dependencies (edge type → target)',
  'topology.reverse': 'Reverse dependents (who depends on this)', 'topology.projection': 'Relationship projection — not a truth store (PRD §14)',
  'topology.noDownstream': 'no downstream affected objects at depth {d}',
  'verification.dod': 'DoD judgment (closeout)', 'verification.matrix': 'Acceptance → gates → human ACCEPT receipt (PRD §27 compressed matrix)',
  'verification.green': 'all gates green — awaiting/holding human acceptance receipt', 'verification.failclosed': 'fail-closed: warning / not_run are not green; the latest judgment supersedes older ones.',
  'verification.bindings': 'Gate bindings (ToolBinding)', 'verification.registryAbsent': 'registry absent — plan run is explicitly not_run (M1 backlog)',
  'verification.finalize': 'Finalize status',
  'evidence.lineage': 'Object & evidence lineage (inspect TASK.DSH_WORKBENCH)',
  'evidence.lineageMeta': 'who produced · when · observing what · which source revision · still valid? (PRD §28)',
  'evidence.attached': 'inspect output is attached below — claims (CLM-*) and gate runs (GRN-*) carry the lineage.',
  'evidence.ledger': 'Exception / assumption ledger', 'evidence.ledgerEmpty': 'ledger empty',
  'components.model': 'Reference → Adopted → Customized (PRD §20)',
  'components.meta': 'POMaster studio galleries are generated references (not importable); the Workbench builds its own surface and treats galleries as design-token/archetype reference.',
  'components.archetypes': 'Archetype cards', 'components.explainPlaceholder': 'catalog explain <ref>',
  'components.storybook': 'Reference Storybook (studio-react, live embed)',
  'components.storybookOffline': 'Local Storybook (studio-react, port 6007) is not running — start it and hit Re-check to browse it inline:',
  'components.recheck': 'Re-check',
  'actions.title': 'Mutation actions',
  'footer.note': 'POMaster Workbench · read-only projection surface · same-source contract with the pomaster CLI · @pomaster/dsh-bundle',
}

export type Translate = (key: string, vars?: Record<string, string | number>) => string

export function makeTranslator(dict: WorkbenchDict): Translate {
  return (key, vars) => {
    let text = dict[key] ?? key
    if (vars !== undefined) {
      for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v))
    }
    return text
  }
}
