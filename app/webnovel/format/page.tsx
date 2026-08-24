'use client';

/**
 * /webnovel/format —— 作品格式、组织算法与 AI 提示词（公开文档，真 SSR）。
 *
 * **提示词、体检规则、示例作品三样全部由后端 `/api/spec` 供给**，这里一个字都不抄：
 * 站内 AI 创作用的就是同一份提示词，导入时跑的就是同一套体检。抄第二份必然漂移，
 * 而作者是照着这页喂自己的模型的 —— 文档错一个字段名，他那边就白生成一次。
 *
 * 本文件里唯一「自己写」的知识是「引擎怎么跑一部作品」那一节，它描述的是
 * `src/lib/webnovel/engine/runtime.ts` + `useNovelRuntime.ts` 的实际行为
 * （出口判定、多 choice 合并、计时闸门、条件求值时机）。改引擎语义时同步这一节。
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';

export interface WebnovelSpecView {
  schema_version: number;
  max_pages: number;
  prompt: string;
  refine_prompt: string;
  audit_rules: { code: string; level: 'error' | 'warn'; what: string }[];
  example: { title: string; description: string; tags: string[]; source: unknown };
}

/**
 * 复制按钮：纯锦上添花。禁用 JS 时它不工作，但正文就在下面的 `<pre>` 里，
 * 手动全选一样能拿走 —— 不要把提示词藏进只有 JS 才能展开的地方。
 */
function CopyButton({ text, label = '复制' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="outline"
      size="xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          // 不支持剪贴板（http 或旧浏览器）：让用户手动选，不弹错
        }
      }}
    >
      <Icon icon={done ? 'mdi:check' : 'mdi:content-copy'} className="size-3.5" />
      {done ? '已复制' : label}
    </Button>
  );
}

/** 代码块：横向滚动关在自己身上，不让页面横向溢出 */
function Code({ children }: { children: string }) {
  return (
    <div className="overflow-x-auto border border-border bg-muted/30">
      <pre className="p-3 text-xs leading-relaxed font-mono whitespace-pre">{children}</pre>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
  right,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-6">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          {hint && <p className="text-sm text-muted-foreground mt-0.5">{hint}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
      {children}
    </section>
  );
}

/** 字段速查表。权威定义在提示词里，这张表只是给人看的索引 */
const ACTION_ROWS: { type: string; fields: string; what: string }[] = [
  { type: 'say', fields: 'text（必填）、align?: left/center/right', what: '一段正文。用 \\n\\n 分段' },
  { type: 'image', fields: 'image（图片地址）', what: '插图。没有现成图片地址就别用这个动作' },
  {
    type: 'timer',
    fields: 'duration: {mode:"specific",seconds} 或 {mode:"range",min,max}、style: normal/secret/hidden、autoAdvance?',
    what: '等待闸门。挡住的是出口，正文立刻就能看',
  },
  {
    type: 'choice',
    fields: 'options[]: {id,label,goto?,actions?,visible?,locked?,lockLabel?}',
    what: '分支选项。一页可以放多个 choice，引擎会合并成一组',
  },
  { type: 'goto', fields: 'target（目标页面 id）', what: '无条件跳转' },
  { type: 'set', fields: 'variable、op: set/add、value', what: '改状态。op=add 用于数值增减（可为负）' },
  { type: 'end', fields: '（无）', what: '结局，故事到此结束' },
];

const CONDITION_ROWS: { op: string; shape: string; what: string }[] = [
  {
    op: 'var',
    shape: '{"op":"var","variable":"hasKey","compare":"==","value":true}',
    what: '比较变量。compare 可用 == != > >= < <=',
  },
  { op: 'visited', shape: '{"op":"visited","page":"kitchen"}', what: '是否到过某页' },
  { op: 'and / or', shape: '{"op":"and","items":[条件, 条件]}', what: '全部满足 / 任一满足' },
  { op: 'not', shape: '{"op":"not","item":条件}', what: '取反' },
  { op: 'true', shape: '{"op":"true"}', what: '恒真（占位用）' },
];

const VARIABLE_ROWS: { field: string; what: string }[] = [
  { field: 'name', what: '内部标识（英文），条件与 set 动作引用它' },
  { field: 'type', what: 'bool / number / string' },
  { field: 'initial', what: '初值。缺省 false / 0 / 空串' },
  {
    field: 'kind',
    what: 'item = 道具，玩家可见、进背包、获得时有提示；flag = 变量，仅作者可见（缺省）。凡是卡进度的东西一律用 item',
  },
  { field: 'label', what: '道具中文名（kind 为 item 时必填），背包里显示的就是它' },
  { field: 'description', what: '道具用途说明，背包里给玩家看' },
];

export default function WebnovelFormatPage({ spec }: { spec: WebnovelSpecView | null }) {
  const exampleJson = spec ? JSON.stringify(spec.example, null, 2) : '';
  const errors = spec?.audit_rules.filter((r) => r.level === 'error') || [];
  const warns = spec?.audit_rules.filter((r) => r.level === 'warn') || [];

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <header className="mb-2">
        <Link
          to="/webnovel"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <Icon icon="mdi:arrow-left" className="size-4" />
          返回交互小说
        </Link>
        <h1 className="text-xl font-bold">作品格式与 AI 提示词</h1>
        <p className="text-sm text-muted-foreground mt-1">
          一部交互小说就是一份 JSON。下面是它的完整结构、引擎的运行规则，
          以及站内 AI 创作<strong>正在使用的那份原版提示词</strong> —— 你可以整段拿走，
          喂给任意大模型（ChatGPT / Claude / Gemini / 本地模型都行），
          再把它输出的 JSON 导入进来，效果与站内创作一致，且不消耗创作点。
        </p>
      </header>

      {/* 三步走 */}
      <div className="border-y border-border py-5 sm:border sm:p-5 my-5 -mx-4 px-4 sm:mx-0 bg-muted/20">
        <h2 className="text-sm font-semibold mb-2">三步走</h2>
        <ol className="text-sm space-y-1.5 list-decimal list-inside text-muted-foreground">
          <li>
            复制下面的<a href="#prompt" className="underline hover:text-foreground">完整提示词</a>
          </li>
          <li>连同你的需求（题材、篇幅、想要几个结局）一起发给你的 AI，让它只输出 JSON</li>
          <li>
            把 JSON 贴进
            <Link to="/webnovel/editor" className="underline hover:text-foreground mx-1">
              创作页
            </Link>
            的「导入 JSON」框，导入成草稿后可继续在编辑器里改、预览、发布
          </li>
        </ol>
        <p className="text-xs text-muted-foreground mt-2">
          导入时会自动补齐缺失的 id、把悬空跳转收成结局，并跑一遍
          <a href="#audit" className="underline hover:text-foreground mx-1">可玩性体检</a>
          把问题列给你 —— 体检不拦导入，你可以先存下来再慢慢改。
        </p>
      </div>

      {!spec && (
        <div className="mb-5 border-y border-destructive py-3 text-sm text-destructive" role="alert">
          规范内容暂时取不到（后端未就绪）。提示词与示例都存在后端，稍后刷新即可；
          下面的结构说明与引擎规则不受影响。
        </div>
      )}

      {/* 顶层结构 */}
      <Section title="顶层结构" hint="导入接受的就是这个对象；导出给你的也是它">
        <Code>{`{
  "title": "作品标题",
  "description": "一句话简介",
  "tags": ["悬疑", "冒险"],
  "source": {
    "startPage": "start",        // 必须是 pages 里某一页的 id
    "variables": [ /* 状态声明，见下 */ ],
    "pages": [ /* 页面列表，见下 */ ]
  }
}`}</Code>
        <p className="text-sm text-muted-foreground mt-2">
          页面数上限 {spec?.max_pages ?? 80} 页。每页 <code className="font-mono">id</code> 用英文小写 + 数字
          （如 <code className="font-mono">start</code> / <code className="font-mono">end_good</code>），
          <code className="font-mono">title</code> 用中文（编辑器里显示的是它）。
          动作 id、选项 id 在整部作品内唯一。
        </p>
      </Section>

      {/* 动作类型 */}
      <Section title="页面与动作" hint="一页 = 若干动作按顺序排布">
        <Code>{`{
  "id": "start",
  "title": "门厅",
  "actions": [
    {"id": "a1", "type": "say", "text": "门在你身后合上了。"},
    {"id": "a2", "type": "choice", "options": [
      {"id": "o1", "label": "去厨房看看", "goto": "kitchen"}
    ]}
  ]
}`}</Code>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm border-t border-border">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 whitespace-nowrap">type</th>
                <th className="py-2 pr-3">字段</th>
                <th className="py-2">说明</th>
              </tr>
            </thead>
            <tbody>
              {ACTION_ROWS.map((r) => (
                <tr key={r.type} className="border-b border-border align-top">
                  <td className="py-2 pr-3 font-mono whitespace-nowrap">{r.type}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{r.fields}</td>
                  <td className="py-2 text-muted-foreground">{r.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          所有动作都支持 <code className="font-mono">disabled: true</code>（临时停用，不删）。
        </p>
      </Section>

      {/* 变量与道具 */}
      <Section title="状态：道具与变量" hint="两者机制相同，区别只在玩家看不看得见">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-t border-border">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 whitespace-nowrap">字段</th>
                <th className="py-2">说明</th>
              </tr>
            </thead>
            <tbody>
              {VARIABLE_ROWS.map((r) => (
                <tr key={r.field} className="border-b border-border align-top">
                  <td className="py-2 pr-3 font-mono whitespace-nowrap">{r.field}</td>
                  <td className="py-2 text-muted-foreground">{r.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          <strong>血的教训</strong>：把钥匙、手电筒这类卡进度的东西做成隐藏变量时，
          玩家通了关却完全不知道自己做对了什么 ——「点着点着就结束了」。
          所以凡是被 <code className="font-mono">visible</code> / <code className="font-mono">locked</code>
          条件引用的状态，体检会强制要求它是道具。
        </p>
      </Section>

      {/* 条件 */}
      <Section title="条件表达式" hint="用在选项的 visible / locked 上">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-t border-border">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 whitespace-nowrap">op</th>
                <th className="py-2 pr-3">形状</th>
                <th className="py-2">说明</th>
              </tr>
            </thead>
            <tbody>
              {CONDITION_ROWS.map((r) => (
                <tr key={r.op} className="border-b border-border align-top">
                  <td className="py-2 pr-3 font-mono whitespace-nowrap">{r.op}</td>
                  <td className="py-2 pr-3 font-mono text-xs break-all">{r.shape}</td>
                  <td className="py-2 text-muted-foreground">{r.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          <code className="font-mono">visible</code> 不满足 → 选项<strong>彻底消失</strong>；
          <code className="font-mono">locked</code> 不满足 → 选项<strong>置灰</strong>并显示
          <code className="font-mono">lockLabel</code>（如「需要：铜钥匙」）。
          卡进度的门槛一律用 locked —— 用 visible 的话玩家看不到门、也不知道自己缺什么，
          只会在几页之间反复打转。只有真正的隐藏内容才用 visible。
        </p>
      </Section>

      {/* 组织算法 */}
      <Section title="引擎怎么跑一部作品" hint="页面之间靠 goto / choice.goto 隐式连成图，没有单独的连线数据">
        <ol className="text-sm space-y-2 list-decimal list-inside">
          <li>
            从 <code className="font-mono">startPage</code> 进入。变量按 <code className="font-mono">initial</code> 初始化。
          </li>
          <li>
            <strong>进入一页时立刻执行本页所有 set 动作</strong>，并把该页记入{' '}
            <code className="font-mono">visited</code>。所以「进这一页就等于拿到某物」可以直接在页面开头放 set。
          </li>
          <li>
            本页所有 <code className="font-mono">image</code> / <code className="font-mono">say</code>{' '}
            按出现顺序渲染成内容，<strong>立即可见</strong>。
          </li>
          <li>
            若本页有 <code className="font-mono">timer</code>：<strong>它挡住的是出口，不是正文</strong>。
            倒计时结束后出口才出现（<code className="font-mono">normal</code> 显示剩余秒、
            <code className="font-mono">secret</code> 只给进度条、<code className="font-mono">hidden</code> 什么都不显示）。
            <code className="font-mono">autoAdvance: true</code> 时倒计时一到自动走 goto/end 出口，不用点「继续」。
            <code className="font-mono">range</code> 模式每次进入随机取一个秒数。
          </li>
          <li>
            <strong>出口 = 本页第一个 choice / goto / end</strong>。同一页上的<strong>多个 choice 会合并</strong>成一组选项
            （作者常把不同分支拆成几块，各带条件）；<code className="font-mono">goto</code> /{' '}
            <code className="font-mono">end</code> 只有出现在所有 choice 之前才作为出口。
          </li>
          <li>
            选项先判 <code className="font-mono">visible</code>（不满足则不渲染）、再判{' '}
            <code className="font-mono">locked</code>（不满足则置灰不可点）。点选后<strong>先执行该选项自带的 actions</strong>
            （通常是 set），再跳到 <code className="font-mono">goto</code>；没有 goto 就留在本页。
          </li>
          <li>
            <code className="font-mono">end</code> 即结局。<strong>默认不可回退</strong>（选择即后果），
            进度存在读者自己的浏览器里（localStorage），换设备不同步、也不占账号。
          </li>
        </ol>
        <p className="text-sm text-muted-foreground mt-3">
          内置状态：<code className="font-mono">visited</code>（到过哪些页）与{' '}
          <code className="font-mono">chosen</code>（选过哪些选项 id）由引擎自动维护，
          条件里用 <code className="font-mono">{'{"op":"visited","page":"…"}'}</code> 读取。
        </p>
      </Section>

      {/* 提示词 */}
      <Section
        title="完整提示词"
        hint="站内 AI 创作用的原版，逐字一致。整段发给你的模型，再补一句你的需求即可"
        right={spec ? <CopyButton text={spec.prompt} label="复制提示词" /> : null}
      >
        <div id="prompt" className="scroll-mt-16" />
        {spec ? (
          <>
            <Code>{spec.prompt}</Code>
            <p className="text-xs text-muted-foreground mt-2">
              {spec.prompt.length} 字符 · 规范版本 v{spec.schema_version}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">暂时取不到，稍后刷新。</p>
        )}
      </Section>

      {/* 改写提示词 */}
      {spec && (
        <Section
          title="改写已有作品的提示词"
          hint="把作品导出的 JSON 和一条修改要求一起给模型，它输出改好的完整 JSON"
          right={<CopyButton text={spec.refine_prompt} label="复制" />}
        >
          <Code>{spec.refine_prompt}</Code>
        </Section>
      )}

      {/* 体检规则 */}
      <Section
        title="导入前的体检"
        hint="导入不会被拦下，但这些问题会原样列给你 —— 它们几乎都会让玩家卡住"
      >
        <div id="audit" className="scroll-mt-16" />
        {spec ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-t border-border">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 whitespace-nowrap">代码</th>
                  <th className="py-2">问题</th>
                </tr>
              </thead>
              <tbody>
                {[...errors, ...warns].map((r) => (
                  <tr key={r.code} className="border-b border-border align-top">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <span
                        className={
                          'font-mono text-xs ' +
                          (r.level === 'error' ? 'text-destructive' : 'text-muted-foreground')
                        }
                      >
                        {r.code}
                      </span>
                    </td>
                    <td className="py-2 text-muted-foreground">{r.what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-2">
              红色为 error（玩家会被卡住），灰色为 warn（可玩但有瑕疵）。共 {spec.audit_rules.length} 项。
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂时取不到，稍后刷新。</p>
        )}
      </Section>

      {/* 示例 */}
      {spec && (
        <Section
          title="最小可用示例"
          hint="3 条路径 · 2 个结局 · 1 个道具门槛。体检零问题，可直接导入试跑"
          right={<CopyButton text={exampleJson} label="复制示例" />}
        >
          <Code>{exampleJson}</Code>
        </Section>
      )}

      <Section title="导入 / 导出" hint="都在创作页">
        <ul className="text-sm space-y-1.5 text-muted-foreground list-disc list-inside">
          <li>
            <strong>导入</strong>：创作页顶部「导入 JSON」，粘贴文本或上传 .json 文件。
            允许带 markdown 代码块和模型的客套话，会自动抠出 JSON；
            <code className="font-mono">pages</code> 放在顶层、外面裹了一层{' '}
            <code className="font-mono">novel</code> 之类的常见变形也能识别。导入后是草稿，不会自动公开。
          </li>
          <li>
            <strong>导出</strong>：我的作品每行的「导出」按钮，下载的就是上面那个顶层结构。
            拿它配合改写提示词，可以让 AI 在你已有的成果上继续改。
          </li>
        </ul>
        <div className="mt-3">
          <Link to="/webnovel/editor">
            <Button size="sm" variant="outline">
              <Icon icon="mdi:pencil-outline" className="size-4" />
              去创作页
            </Button>
          </Link>
        </div>
      </Section>
    </div>
  );
}
