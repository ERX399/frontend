import { Link } from 'react-router';
import { Icon } from '@/components/ui/icon';

interface Tool {
  label: string;
  icon: string;
  href: string;
  category: string;
  desc: string;
}

const TOOLS: Tool[] = [
  {
    label: '视频封面制作',
    icon: 'mdi:image-edit',
    href: '/cover',
    category: '图片工具',
    desc: '自定义文字、字体与布局，快速生成 B 站等平台风格的视频封面图',
  },
  {
    label: '图片水印',
    icon: 'mdi:water',
    href: '/watermark',
    category: '图片工具',
    desc: '批量为图片添加文字水印，自定义内容、透明度与平铺方式',
  },
  {
    label: '图片格式转换',
    icon: 'mdi:swap-horizontal-bold',
    href: '/convert',
    category: '图片工具',
    desc: 'JPG、PNG、WebP、AVIF 等格式互转，浏览器本地处理不上传',
  },
  {
    label: '从夯到拉',
    icon: 'mdi:podium-gold',
    href: '/tier',
    category: '排名工具',
    desc: '上传图片后拖放排名，生成一张可保存的层级榜单',
  },
  {
    label: '技术栈',
    icon: 'mdi:layers-triple',
    href: '/stack',
    category: '关于本站',
    desc: '本站的前后端框架、依赖清单与数据流',
  },
];

export default function ToolsPage() {
  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent mb-4 transition-colors"
      >
        <Icon icon="mdi:arrow-left" className="size-4" />
        返回首页
      </Link>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">工具集</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          本站内置的在线工具，全部在浏览器本地处理，不上传服务器
        </p>
      </header>

      <div className="tools-grid">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            to={tool.href}
            className="group flex h-full flex-col border border-border bg-card p-4 transition-colors duration-200 ease-out hover:bg-muted/30"
          >
            <div className="flex size-8 items-center justify-center border border-border bg-muted text-foreground">
              <Icon icon={tool.icon} className="size-4" />
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">{tool.category}</p>
              <h2 className="text-base font-medium tracking-tight">{tool.label}</h2>
              <p className="text-xs leading-relaxed text-muted-foreground">{tool.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
