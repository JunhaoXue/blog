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
        <h1>友链</h1>
      </div>
      <div className="links-grid">
        {links.map((link) => (
          <a
            className="link-card surface-card"
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <h2>{link.name} ↗</h2>
          </a>
        ))}
      </div>
      {!links.length && <div className="empty-state"></div>}
    </div>
  );
}
