import type { GuideSection } from "./content";

// Inline renderer: `code spans` in prose become styled <code> elements.
export function inline(text: string) {
  const parts = text.split("`");
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <code key={i} className="rounded bg-surface-2 px-1 font-mono text-[0.9em] text-bright">
        {part}
      </code>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function GuideSections({ sections }: { sections: GuideSection[] }) {
  return (
    <div className="mt-6">
      {sections.map((s, i) => {
        switch (s.kind) {
          case "h2":
            return (
              <h2
                key={i}
                id={s.id}
                className="mt-8 font-mono text-[13px] tracking-[0.08em] text-bright"
              >
                {s.text}
              </h2>
            );
          case "p":
            return (
              <p key={i} className="mt-3 max-w-2xl text-sm leading-relaxed text-mid">
                {inline(s.text)}
              </p>
            );
          case "code":
            return (
              <div key={i} className="mt-3 max-w-2xl rounded border border-line bg-surface-2 p-3 font-mono text-xs">
                {s.label && <p className="mb-2 text-dim"># {s.label}</p>}
                <pre className="overflow-x-auto">
                  {s.lines.map((line, j) => (
                    <code
                      key={j}
                      className={`block ${line.trimStart().startsWith("#") ? "text-dim" : "text-bright"}`}
                    >
                      {line || " "}
                    </code>
                  ))}
                </pre>
              </div>
            );
          case "list":
            return s.ordered ? (
              <ol key={i} className="mt-3 max-w-2xl list-decimal space-y-1.5 pl-5 text-sm text-mid">
                {s.items.map((item, j) => (
                  <li key={j}>{inline(item)}</li>
                ))}
              </ol>
            ) : (
              <ul key={i} className="mt-3 max-w-2xl space-y-1.5 text-sm text-mid">
                {s.items.map((item, j) => (
                  <li key={j} className="flex gap-2">
                    <span className="text-dim">·</span>
                    <span>{inline(item)}</span>
                  </li>
                ))}
              </ul>
            );
          case "callout":
            return (
              <div
                key={i}
                className={`mt-3 max-w-2xl rounded border p-3 text-sm ${
                  s.tone === "warn"
                    ? "border-warn/40 bg-warn/5 text-warn"
                    : "border-signal/30 bg-signal/5 text-mid"
                }`}
              >
                {inline(s.text)}
              </div>
            );
          case "table":
            return (
              <div key={i} className="mt-3 overflow-x-auto rounded border border-line">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-line bg-surface">
                      {s.headers.map((h, j) => (
                        <th key={j} className="px-3 py-2 font-mono text-[10px] tracking-wider text-dim">
                          {h.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {s.rows.map((row, j) => (
                      <tr key={j} className="bg-surface">
                        {row.map((cell, k) => (
                          <td key={k} className={`px-3 py-2 align-top ${k === 0 ? "font-mono text-bright" : "text-mid"}`}>
                            {inline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
