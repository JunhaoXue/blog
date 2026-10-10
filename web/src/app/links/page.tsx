import { database } from "@/lib/database";
export const metadata = { title: "友链" };
export default function Links() {
  const links = database.prepare("SELECT * FROM links ORDER BY name").all() as {
    id: string;
    name: string;
    url: string;
    description: string;
  }[];
  return (
    <div className="page-shell">
      <div className="page-heading">
        <span className="eyebrow">GOOD PLACES TO VISIT</span>
        <h1>
          朋友与链接<span className="accent">.</span>
        </h1>
        <p>互联网很大，也有一些值得常去的地方。</p>
      </div>
      <div className="links-grid">
        {links.map((link) => (
          <a
            className="link-card"
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <h2>{link.name} ↗</h2>
            <p>{link.description}</p>
          </a>
        ))}
      </div>
      {!links.length && (
        <div className="empty-state">
          <p>友链正在整理，稍后再来看看。</p>
        </div>
      )}
    </div>
  );
}
