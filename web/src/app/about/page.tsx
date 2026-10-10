import Link from "next/link";
export const metadata = { title: "关于" };
export default function About() {
  return (
    <div className="reading-shell">
      <div className="page-heading">
        <span className="eyebrow">A LITTLE ABOUT ME</span>
        <h1>
          你好，我是
          <br />
          Junhao Xue<span className="accent">.</span>
        </h1>
        <p>欢迎来到我的个人博客。</p>
      </div>
      <div className="prose">
        <h2>关于这个地方</h2>
        <p>
          这里用来保存关于技术、产品与日常的文字。你可以按主题阅读，也可以沿着归档，看看不同时间留下的记录。
        </p>
        <p>记录想法，保持好奇。</p>
        <h2>保持联系</h2>
        <p>
          你可以在{" "}
          <a
            href="https://github.com/JunhaoXue"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>{" "}
          找到我，也可以通过 <Link href="/feed.xml">RSS</Link> 订阅新的文章。
        </p>
        <h2>一起聊聊</h2>
        <p>
          如果一篇文章让你想到什么，欢迎登录后留下评论，或者去
          <Link href="/discussions">讨论区</Link>开启一个话题。
        </p>
      </div>
    </div>
  );
}
