import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FileText, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useState, useMemo } from 'react';
import 'katex/dist/katex.min.css';
import { useSettingsStore } from '@/stores/useSettingsStore';

interface MarkdownRendererProps {
  content: string;
}

function FileAttachment({ fileName, content }: { fileName: string; content: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-3">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="flex items-center gap-3 p-3 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 transition-colors group w-full text-left"
      >
        <div className="p-2 rounded-md bg-primary-500/20 text-primary-300 group-hover:text-primary-200 group-hover:bg-primary-500/30 transition-colors">
          <FileText size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-zinc-200 truncate">{fileName}</div>
          <div className="text-xs text-zinc-500">点击查看文件内容</div>
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-10" onClick={() => setIsOpen(false)}>
          <div 
            className="w-full max-w-4xl max-h-[85vh] bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-primary-400" />
                <span className="font-medium text-zinc-200">{fileName}</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-0 bg-[#1e1e1e]">
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={(() => {
                  const ext = fileName.split('.').pop()?.toLowerCase() || 'text';
                  return ext === 'md' ? 'markdown' : ext;
                })()}
                PreTag="div"
                customStyle={{ margin: 0, padding: '1.5rem', minHeight: '100%', fontSize: '0.9em' }}
                showLineNumbers={true}
              >
                {content}
              </SyntaxHighlighter>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const { uiConfig } = useSettingsStore();

  const components = useMemo(() => ({
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(.+)/.exec(className || '');
      
      if (!inline && match && match[1].startsWith('file-attachment:')) {
        const fileName = match[1].replace('file-attachment:', '');
        const fileContent = String(children).replace(/\n$/, '');
        return <FileAttachment fileName={fileName} content={fileContent} />;
      }

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
      <code className={`${className} bg-zinc-800 rounded px-1.5 py-0.5 text-[0.9em] text-zinc-200 font-mono`} {...props}>
        {children}
      </code>
    );
  },
  table({ children }: any) {
    return (
      <div className="overflow-x-auto my-4 rounded-lg border border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-800 bg-zinc-900/50">
          {children}
        </table>
      </div>
    );
  },
  thead({ children }: any) {
    return <thead className="bg-zinc-800/80">{children}</thead>;
  },
  th({ children }: any) {
    return (
      <th className="px-4 py-3 text-left text-[0.9em] font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-700">
        {children}
      </th>
    );
  },
  tbody({ children }: any) {
      return <tbody className="divide-y divide-zinc-800/50">{children}</tbody>;
  },
  tr({ children }: any) {
      return <tr className="hover:bg-zinc-800/30 transition-colors">{children}</tr>
  },
  td({ children }: any) {
    return (
      <td className="px-4 py-3 whitespace-nowrap text-[0.9em] text-zinc-300">
        {children}
      </td>
    );
  },
  p({ children }: any) {
      return <p className="mb-3 last:mb-0 text-zinc-200">{children}</p>
  },
  ul({ children }: any) {
      return <ul className="list-disc pl-5 mb-3 space-y-1 text-zinc-300">{children}</ul>
  },
  ol({ children }: any) {
      return <ol className="list-decimal pl-5 mb-3 space-y-1 text-zinc-300">{children}</ol>
  },
  li({ children }: any) {
      return <li className="pl-1">{children}</li>
  },
  blockquote({ children }: any) {
      return <blockquote className="border-l-4 border-primary-500/50 pl-4 py-1 bg-zinc-800/20 rounded-r italic text-zinc-400 my-4">{children}</blockquote>
  },
  a({ href, children }: any) {
      return <a href={href} className="text-primary-400 hover:text-primary-300 hover:underline transition-colors" target="_blank" rel="noopener noreferrer">{children}</a>
  },
  h1({ children }: any) { return <h1 className="text-2xl font-bold mt-8 mb-4 pb-2 border-b border-zinc-800 text-zinc-100">{children}</h1> },
  h2({ children }: any) { return <h2 className="text-xl font-bold mt-6 mb-3 text-zinc-100">{children}</h2> },
  h3({ children }: any) { return <h3 className="text-lg font-bold mt-5 mb-2 text-zinc-100">{children}</h3> },
  h4({ children }: any) { return <h4 className="font-bold mt-4 mb-2 text-zinc-100">{children}</h4> },
  hr({ children }: any) { return <hr className="my-6 border-zinc-800" /> },
}), []);

  return (
    <div 
      className="prose-none max-w-none"
      style={{
        fontSize: `${uiConfig.fontSize}px`,
        lineHeight: uiConfig.lineHeight,
        fontFamily: uiConfig.fontFamily
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
