import { Link } from "react-router-dom";
import { ArrowLeft, Save, Trash2, Upload } from "lucide-react";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useState, useEffect, useRef } from "react";
import { saveFont, deleteFont, loadFontToDocument } from "@/utils/fontManager";

export default function Settings() {
  const { apiConfig, uiConfig, customFonts, setApiConfig, setUiConfig, addCustomFont, removeCustomFont } = useSettingsStore();
  
  // Local state for form to avoid excessive writes/renders, 
  // though for simple settings direct store update is also fine.
  // We'll sync with store on blur or save.
  const [baseUrl, setBaseUrl] = useState(apiConfig.baseUrl);
  const [apiKey, setApiKey] = useState(apiConfig.apiKey);
  const [model, setModel] = useState(apiConfig.model);

  // UI Settings local state
  const [fontSize, setFontSize] = useState(uiConfig.fontSize);
  const [lineHeight, setLineHeight] = useState(uiConfig.lineHeight);
  const [fontFamily, setFontFamily] = useState(uiConfig.fontFamily);
  const [layoutMode, setLayoutMode] = useState<'top' | 'side' | 'zen'>(uiConfig.layoutMode || 'top');

  const [isDirty, setIsDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBaseUrl(apiConfig.baseUrl);
    setApiKey(apiConfig.apiKey);
    setModel(apiConfig.model);
  }, [apiConfig]);

  useEffect(() => {
    setFontSize(uiConfig.fontSize);
    setLineHeight(uiConfig.lineHeight);
    setFontFamily(uiConfig.fontFamily);
    setLayoutMode(uiConfig.layoutMode || 'top');
  }, [uiConfig]);

  const handleSave = () => {
    setApiConfig({ baseUrl, apiKey, model });
    setUiConfig({ fontSize, lineHeight, fontFamily, layoutMode });
    setIsDirty(false);
  };

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic sanitization: only allow alphanumeric, space, hyphen, underscore
    const rawName = file.name.replace(/\.[^/.]+$/, "");
    const fontName = rawName.replace(/[^a-zA-Z0-9\s\-_]/g, "");

    if (!fontName) {
        alert("文件名包含非法字符，请重命名后重试。");
        return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const fontData = {
        name: fontName,
        buffer,
        type: file.type
      };

      await saveFont(fontData);
      await loadFontToDocument(fontData);
      addCustomFont(fontName);
      alert(`字体 "${fontName}" 导入成功！`);
    } catch (err) {
      console.error("Font upload failed", err);
      alert("字体上传失败，请检查文件格式是否受支持。");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFont = async (name: string) => {
      if (!confirm(`确定要删除字体 "${name}" 吗？`)) return;
      try {
          await deleteFont(name);
          removeCustomFont(name);
      } catch (err) {
          console.error("Failed to delete font", err);
      }
  }

  const hasChanges = 
    baseUrl !== apiConfig.baseUrl || 
    apiKey !== apiConfig.apiKey || 
    model !== apiConfig.model ||
    fontSize !== uiConfig.fontSize ||
    lineHeight !== uiConfig.lineHeight ||
    fontFamily !== uiConfig.fontFamily ||
    layoutMode !== (uiConfig.layoutMode || 'top');

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
          </div>
        </section>

        {/* UI Configuration */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-zinc-100">外观设置</h2>
          <p className="mt-1 text-sm text-zinc-400 mb-6">
            调整应用内的字体大小、行间距等显示效果。
          </p>

          <div className="space-y-6 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                界面布局
              </label>
              <div className="flex items-center gap-4 rounded-lg border border-zinc-700 bg-zinc-950 p-2">
                <label className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md p-2 text-sm transition-colors ${layoutMode === 'top' ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-400 hover:text-zinc-200'}`}>
                  <input
                    type="radio"
                    name="layoutMode"
                    value="top"
                    checked={layoutMode === 'top'}
                    onChange={() => setLayoutMode('top')}
                    className="hidden"
                  />
                  <span>顶部标题 (默认)</span>
                </label>
                <label className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md p-2 text-sm transition-colors ${layoutMode === 'side' ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-400 hover:text-zinc-200'}`}>
                  <input
                    type="radio"
                    name="layoutMode"
                    value="side"
                    checked={layoutMode === 'side'}
                    onChange={() => setLayoutMode('side')}
                    className="hidden"
                  />
                  <span>侧边信息 (最大化画布)</span>
                </label>
                <label className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md p-2 text-sm transition-colors ${layoutMode === 'zen' ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-400 hover:text-zinc-200'}`}>
                  <input
                    type="radio"
                    name="layoutMode"
                    value="zen"
                    checked={layoutMode === 'zen'}
                    onChange={() => setLayoutMode('zen')}
                    className="hidden"
                  />
                  <span>专注模式 (仅聊天)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                字体大小 (px): {fontSize}
              </label>
              <input
                type="range"
                min="12"
                max="24"
                step="1"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                行间距 (em): {lineHeight}
              </label>
              <input
                type="range"
                min="1.0"
                max="2.5"
                step="0.1"
                value={lineHeight}
                onChange={(e) => setLineHeight(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                字体族
              </label>
              <div className="space-y-3">
                <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                >
                    <option value="sans-serif">系统默认 (Sans Serif)</option>
                    <option value="serif">衬线体 (Serif)</option>
                    <option value="monospace">等宽字体 (Monospace)</option>
                    <option value="'Inter', sans-serif">Inter</option>
                    <option value="'Roboto', sans-serif">Roboto</option>
                    <option value="'Fira Code', monospace">Fira Code</option>
                    {customFonts.map(font => (
                        <option key={font} value={font}>{font} (Custom)</option>
                    ))}
                </select>

                <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                   <div className="text-xs font-medium text-zinc-400 mb-1">管理自定义字体</div>
                   {customFonts.length === 0 && (
                       <div className="text-xs text-zinc-500 italic">暂无导入的字体</div>
                   )}
                   <ul className="space-y-2">
                       {customFonts.map(font => (
                           <li key={font} className="flex items-center justify-between text-xs text-zinc-300 bg-zinc-900 px-2 py-1 rounded">
                               <span>{font}</span>
                               <button 
                                   onClick={() => handleDeleteFont(font)}
                                   className="text-zinc-500 hover:text-red-400 transition-colors"
                                   title="删除字体"
                               >
                                   <Trash2 className="h-3 w-3" />
                               </button>
                           </li>
                       ))}
                   </ul>
                   <div className="mt-2 pt-2 border-t border-zinc-800">
                       <input 
                           type="file" 
                           accept=".ttf,.otf,.woff,.woff2" 
                           ref={fileInputRef} 
                           onChange={handleFontUpload}
                           className="hidden" 
                       />
                       <button 
                           onClick={() => fileInputRef.current?.click()}
                           className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                       >
                           <Upload className="h-3 w-3" />
                           导入字体文件 (.ttf, .otf, .woff)
                       </button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Save Button */}
        {hasChanges && (
          <div className="fixed bottom-6 right-6 z-50">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all active:scale-95"
            >
              <Save className="h-5 w-5" />
              保存更改
            </button>
          </div>
        )}

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
