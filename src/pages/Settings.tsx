import { Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useState, useEffect } from "react";

export default function Settings() {
  const { apiConfig, setApiConfig } = useSettingsStore();
  
  // Local state for form to avoid excessive writes/renders, 
  // though for simple settings direct store update is also fine.
  // We'll sync with store on blur or save.
  const [baseUrl, setBaseUrl] = useState(apiConfig.baseUrl);
  const [apiKey, setApiKey] = useState(apiConfig.apiKey);
  const [model, setModel] = useState(apiConfig.model);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setBaseUrl(apiConfig.baseUrl);
    setApiKey(apiConfig.apiKey);
    setModel(apiConfig.model);
  }, [apiConfig]);

  const handleSave = () => {
    setApiConfig({ baseUrl, apiKey, model });
    setIsDirty(false);
  };

  const hasChanges = 
    baseUrl !== apiConfig.baseUrl || 
    apiKey !== apiConfig.apiKey || 
    model !== apiConfig.model;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
          <Link
            to="/sessions"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Link>
          <div>
            <div className="text-sm font-semibold">设置</div>
            <div className="text-xs text-zinc-400">配置 AI 模型接口与参数</div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-6 space-y-6">
        
        {/* API Configuration */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-zinc-100">AI 模型配置</h2>
          <p className="mt-1 text-sm text-zinc-400 mb-6">
            配置 OpenAI 兼容的 API 接口。Key 仅保存在浏览器本地。
          </p>

          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Base URL
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-zinc-500">
                如果是本地模型（如 Ollama），可尝试 http://localhost:11434/v1
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Model Name
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-3.5-turbo"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasChanges}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  hasChanges
                    ? "bg-indigo-600 text-white hover:bg-indigo-500"
                    : "bg-zinc-800 text-zinc-400 cursor-not-allowed"
                }`}
              >
                <Save className="h-4 w-4" />
                {hasChanges ? "保存配置" : "已保存"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="text-sm font-medium">快捷键提示</div>
          <div className="mt-4 space-y-2 text-sm text-zinc-300">
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span>Fork 节点</span>
              <span className="font-mono text-xs bg-zinc-800 px-2 py-1 rounded">节点右上角菜单</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span>装配/卸载上下文</span>
              <span className="font-mono text-xs bg-zinc-800 px-2 py-1 rounded">Cmd/Ctrl + Click Node</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span>打开上下文预览</span>
              <span className="font-mono text-xs bg-zinc-800 px-2 py-1 rounded">界面右侧预览按钮</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
