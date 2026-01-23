import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose-none max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <div className="rounded-md overflow-hidden my-2 border border-zinc-700">
                <div className="bg-zinc-800 px-3 py-1 text-xs text-zinc-400 flex justify-between items-center border-b border-zinc-700">
                    <span>{match[1]}</span>
                </div>
                <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.9em' }}
                {...props}
                >
                {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
            </div>
          ) : (
            <code className={`${className} bg-zinc-800 rounded px-1.5 py-0.5 text-sm text-zinc-200 font-mono`} {...props}>
              {children}
            </code>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-4 rounded-lg border border-zinc-800">
              <table className="min-w-full divide-y divide-zinc-800 bg-zinc-900/50">
                {children}
              </table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-zinc-800/80">{children}</thead>;
        },
        th({ children }) {
          return (
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-700">
              {children}
            </th>
          );
        },
        tbody({ children }) {
            return <tbody className="divide-y divide-zinc-800/50">{children}</tbody>;
        },
        tr({ children }) {
            return <tr className="hover:bg-zinc-800/30 transition-colors">{children}</tr>
        },
        td({ children }) {
          return (
            <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-300">
              {children}
            </td>
          );
        },
        p({ children }) {
            return <p className="mb-3 last:mb-0 leading-relaxed text-zinc-200">{children}</p>
        },
        ul({ children }) {
            return <ul className="list-disc pl-5 mb-3 space-y-1 text-zinc-300">{children}</ul>
        },
        ol({ children }) {
            return <ol className="list-decimal pl-5 mb-3 space-y-1 text-zinc-300">{children}</ol>
        },
        li({ children }) {
            return <li className="pl-1">{children}</li>
        },
        blockquote({ children }) {
            return <blockquote className="border-l-4 border-indigo-500/50 pl-4 py-1 bg-zinc-800/20 rounded-r italic text-zinc-400 my-4">{children}</blockquote>
        },
        a({ href, children }) {
            return <a href={href} className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors" target="_blank" rel="noopener noreferrer">{children}</a>
        },
        h1({ children }) { return <h1 className="text-2xl font-bold mt-8 mb-4 pb-2 border-b border-zinc-800 text-zinc-100">{children}</h1> },
        h2({ children }) { return <h2 className="text-xl font-bold mt-6 mb-3 text-zinc-100">{children}</h2> },
        h3({ children }) { return <h3 className="text-lg font-bold mt-5 mb-2 text-zinc-100">{children}</h3> },
        h4({ children }) { return <h4 className="font-bold mt-4 mb-2 text-zinc-100">{children}</h4> },
        hr({ children }) { return <hr className="my-6 border-zinc-800" /> },
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
