import { Github, ArrowUpRight } from "lucide-react";
import { describeGitHubRecord, type GitHubRecord } from "@/lib/github-records";
import { site } from "@/lib/site";

export function GitHubRecords({ records }: { records: GitHubRecord[] }) {
  return (
    <section className="github-records" aria-labelledby="github-records-title">
      <div className="github-records-heading">
        <h2 id="github-records-title" className="sr-only">
          GitHub 记录
        </h2>
        <a
          className="small-link"
          href={site.github}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Github size={16} aria-hidden="true" /> GitHub
        </a>
      </div>
      {records.length ? (
        <ul className="github-records-list">
          {records.map((record) => {
            const details = describeGitHubRecord(record.url);
            if (!details) return null;
            return (
              <li key={details.url} className="surface-card">
                <a href={details.url} target="_blank" rel="noopener noreferrer">
                  <span className="github-record-kind">{details.kind}</span>
                  <span className="github-record-details">
                    <strong>{record.title || details.repository}</strong>
                    <span>
                      {details.repository}
                      {details.reference && ` · ${details.reference}`}
                    </span>
                  </span>
                  <ArrowUpRight size={18} aria-hidden="true" />
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">这篇文章暂未关联仓库、提交或 PR。</p>
      )}
    </section>
  );
}
