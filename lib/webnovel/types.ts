/**
 * WebNovel 共享类型。与后端 af_webnovel-backend 的 src/types/index.ts 对齐。
 * 前端编辑器 / 阅读器 / 详情共用这一份，避免两端漂移。
 *
 * 阶段 1 数据模型：作品 = 页面(pages)列表，每页 = 一串 Action（image/say/timer/
 * choice/goto/set/end），页面间靠 choice.goto / goto 引用连接（milovana EOS 形态）。
 */

export type NovelStatus = 'draft' | 'published' | 'takedown';

/**
 * 状态声明。分两类，区别只在**玩家看不看得见**：
 *
 * - `item`（道具）：玩家可见。获得时弹提示、背包里能查看名称与用途。
 *   用于钥匙、手电筒这类"卡进度的东西" —— 玩家必须知道自己有没有、拿它干嘛。
 * - `flag`（变量，缺省）：仅编辑器可见。用于剧情暗线、隐藏结局的开关。
 *
 * 踩过的坑：全做成不可见变量时，玩家拿到钥匙、通了关，却完全不知道自己做对了什么。
 */
export interface NovelVariable {
  /** 内部标识（英文），条件和 set 动作引用它 */
  name: string;
  type: 'bool' | 'number' | 'string';
  initial?: string | number | boolean;
  /** item=道具（玩家可见）/ flag=变量（仅编辑器可见）。缺省按 flag 处理 */
  kind?: 'item' | 'flag';
  /** 道具显示名（中文），如「档案室的钥匙」 */
  label?: string;
  /** 道具用途说明，背包里展示 */
  description?: string;
}

/** 计时器样式：normal=进度条+剩余秒；secret=进度条无剩余；hidden=无 UI（不可见等待）。 */
export type TimerStyle = 'normal' | 'secret' | 'hidden';
export type TimerMode = 'specific' | 'range';

export interface TimerDuration {
  mode: TimerMode;
  /** specific：固定秒数 */
  seconds?: number;
  /** range：随机区间 */
  min?: number;
  max?: number;
}

/** 条件表达式（结构化，阅读器解释、编辑器可视化构造）。 */
export type Condition =
  | { op: 'true' }
  | { op: 'visited'; page: string }
  | {
      op: 'var';
      variable: string;
      compare: '==' | '!=' | '>' | '>=' | '<' | '<=';
      value: string | number | boolean;
    }
  | { op: 'and'; items: Condition[] }
  | { op: 'or'; items: Condition[] }
  | { op: 'not'; item: Condition };

export interface ChoiceOption {
  id: string;
  label: string;
  /** 选中后跳转的目标页面（缺省则停在当前页） */
  goto?: string;
  /** 选中后额外执行的赋值动作（暂只支持 set） */
  actions?: Action[];
  /** 可见条件：不满足则整个选项隐藏 */
  visible?: Condition;
  /** 锁定条件：不满足则选项置灰显示 lockLabel */
  locked?: Condition;
  lockLabel?: string;
}

/** 所有 Action 共有的字段 */
interface ActionBase {
  id: string;
  /** 禁用即跳过（milovana 的 disable/enable 语义），阅读器忽略 */
  disabled?: boolean;
}

export type Action = ActionBase & (
  | { type: 'image'; image: string }
  | { type: 'say'; text: string; align?: 'left' | 'center' | 'right' }
  /**
   * timer：计时闸门。autoAdvance=true 时倒计时结束**自动执行出口**
   * （goto 直接跳页 / end 直接进结局），不显示「继续」按钮；
   * 出口是 choice 时不自动（要等玩家选），只解锁选项。
   */
  | { type: 'timer'; duration: TimerDuration; style: TimerStyle; autoAdvance?: boolean }
  | { type: 'choice'; options: ChoiceOption[] }
  | { type: 'goto'; target: string }
  | { type: 'set'; variable: string; op: 'set' | 'add'; value: string | number | boolean }
  | { type: 'end' }
);

export interface NovelPage {
  id: string;
  title?: string;
  actions: Action[];
}

/** 作品源码：起始页 + 变量声明 + 页面列表。 */
export interface NovelSource {
  startPage: string;
  variables: NovelVariable[];
  pages: NovelPage[];
}

export interface Novel {
  id: number;
  slug: string;
  title: string;
  description: string;
  cover: string;
  tags: string[];
  authorId: number;
  authorName: string;
  /** 匿名发布：读者端不显示署名（作者本人视角仍能看到真实设置） */
  anonymous?: boolean;
  /** AI 撰写声明（读者端可见） */
  aiGenerated?: boolean;
  /** 声明由系统钉住（站内 AI 生成或改写过），作者取消不了 */
  aiLocked?: boolean;
  status: NovelStatus;
  source: NovelSource | null;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  likeCount: number;
}

export interface NovelListResult {
  total: number;
  page: number;
  pageSize: number;
  novels: Novel[];
}
