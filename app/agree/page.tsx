import { Link } from 'react-router';

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 mb-4 border-b border-border pb-2 text-xl font-bold">{children}</h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 mb-3 text-base font-bold">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-relaxed">{children}</p>;
}

function Ol({ start, children }: { start?: number; children: React.ReactNode }) {
  return (
    <ol start={start} className="mt-3 list-decimal space-y-1.5 pl-6 text-sm leading-relaxed">
      {children}
    </ol>
  );
}

export default function AgreePage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 font-mono text-sm text-muted-foreground transition-colors hover:text-foreground">
        ← 返回首页
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">用户协议</h1>
      <p className="mt-2 font-mono text-sm text-muted-foreground">
        最后更新：<time dateTime="2026-05-27">2026-05-27</time>
      </p>

      <H2>运营者信息</H2>
      <P>
        本网站（以下简称“本站”）由个人运营。联系邮箱：{' '}
        <a href="mailto:e.r.x399@gmail.com" className="font-mono underline">e.r.x399@gmail.com</a>
      </P>
      <P>
        本站服务器位于美国，无中国 ICP
        备案。本站无意针对中国大陆用户提供服务，但由于互联网的开放性，中国大陆用户可能通过合法渠道访问本站。你理解并同意，本站运营者未主动向中国大陆市场提供服务，也不以中国大陆为目标市场。
      </P>

      <H2>免责声明</H2>
      <P>
        本站是一个个人项目，按「现状」及「可用」基础提供。在法律允许的最大范围内，本站明确声明不承担任何明示或暗示的担保责任，包括但不限于适销性、特定用途适用性及不侵权的担保。本站不保证服务的连续性、及时性、安全性及准确性，你使用本站服务所产生的全部风险由你自行承担。
      </P>
      <P>
        你明确理解并同意，本站运营者不对因使用或无法使用本站服务所导致的任何直接、间接、偶然、特殊及后续的损害承担责任，包括但不限于利润损失、数据丢失、业务中断、声誉损害及其他商业损失。
      </P>
      <P>
        本站所有生成内容由人工智能自动生成，不代表本站运营者的观点、立场或意见。生成内容的准确性、完整性、合法性及实用性本站不作任何保证。你应对你生成、发布及传播的内容承担全部责任。
      </P>

      <H2>论坛使用规则（/forum）</H2>
      <Ol>
        <li>禁止发布任何违反中华人民共和国法律法规的内容，包括但不限于危害国家安全、煽动民族仇恨、破坏国家统一、宣扬恐怖主义、传播淫秽色情、赌博、暴力、凶杀、恐怖或者教唆犯罪的信息。</li>
        <li>禁止发布任何侵犯他人合法权益的内容，包括但不限于侵犯他人名誉权、肖像权、知识产权、隐私权及商业秘密。</li>
        <li>禁止恶意攻击、辱骂、骚扰、威胁、歧视其他用户。论坛讨论应保持基本网络礼仪，理性表达观点。</li>
        <li>禁止发布垃圾广告、恶意推广、刷屏、灌水及一切形式的垃圾信息。</li>
        <li>禁止利用论坛进行任何形式的网络诈骗、钓鱼、传播恶意软件或链接。</li>
        <li>禁止绕越或试图绕越论坛的审核、封禁等管理措施。</li>
        <li>论坛管理员有权在不另行通知的情况下删除违规内容、限制或封禁违规账号。</li>
      </Ol>

      <H2>未成年人条款</H2>
      <P>
        本站不向未成年人（未满 18 周岁）提供服务。若你未满 18
        周岁，请立即停止使用本站。若你隐瞒真实年龄、伪造身份信息或以其他方式欺骗使用本站，你将被视为完全民事行为能力人，自愿承担因使用本站所产生的全部法律责任及后果，本站运营者不承担任何责任。
      </P>

      <H2>其他条款</H2>
      <Ol>
        <li>本站保留随时修改本协议的权利，修改后的协议自发布之日起生效。你继续使用本站服务即视为接受修改后的协议。</li>
        <li>本协议适用中华人民共和国法律，并按其解释。因本协议引起的或与本协议有关的争议，双方应友好协商解决；协商不成的，提交本站运营者所在地有管辖权的人民法院诉讼解决。</li>
        <li>如本协议的任何条款被认定为无效或不可执行，其余条款仍应保持完全效力。</li>
        <li>若你对本协议有任何疑问，可通过本站提供的联系方式与运营者取得联系。</li>
      </Ol>
    </main>
  );
}
