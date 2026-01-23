import { Link, useNavigate } from "react-router-dom";
import { Plus, Settings as SettingsIcon } from "lucide-react";
import { useTopoStore } from "@/stores/useTopoStore";

export default function SessionsList() {
  const navigate = useNavigate();
  const sessionOrder = useTopoStore((s) => s.sessionOrder);
  const sessions = useTopoStore((s) => s.sessions);
  const createSession = useTopoStore((s) => s.createSession);
  const deleteSession = useTopoStore((s) => s.deleteSession);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-800" />
            <div>
              <div className="text-sm font-semibold">topo-thinker</div>
              <div className="text-xs text-zinc-400">阅读流 ≠ 上下文；只喂显式装配</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            >
              <SettingsIcon className="h-4 w-4" />
              设置
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">会话</h1>
            <p className="mt-1 text-sm text-zinc-400">创建一个会话，然后在图里 fork 分支并显式装配上下文。</p>
          </div>
          <button
            type="button"
            onClick={() => {
              const id = createSession();
              navigate(`/sessions/${id}`);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            新建会话
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessionOrder.map((id) => {
            const sess = sessions[id];
            if (!sess) return null;
            const nodesCount = Object.keys(sess.nodes).length;
            return (
              <div key={id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{sess.title}</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {new Date(sess.createdAt).toLocaleString()} · {nodesCount} nodes
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteSession(id)}
                    className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  >
                    删除
                  </button>
                </div>
                <div className="mt-4">
                  <Link
                    to={`/sessions/${id}`}
                    className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                  >
                    打开
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
