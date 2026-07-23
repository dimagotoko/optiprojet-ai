import { readFileSync } from "fs";
import { join } from "path";
import ReactMarkdown from "react-markdown";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — KamGo",
};

export default function CguPage() {
  const content = readFileSync(
    join(process.cwd(), "src/content/cgu.md"),
    "utf8",
  );

  return (
    <div className="container max-w-3xl mx-auto py-12 px-4 md:px-6">
      <article className="prose prose-slate dark:prose-invert max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </article>
    </div>
  );
}
