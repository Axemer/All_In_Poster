import { useState, DragEvent, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
//import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";

type Theme = "light" | "dark";
type PageStatus = "loading" | "ready" | "error" | "external";
type OpenMode = "iframe" | "external";

type Page = {
  id: string;
  title: string;
  url: string;
  status: PageStatus;
  mode: OpenMode;
  error?: string;
};

function App() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const [pages, setPages] = useState<Page[]>([
    {
      id: "x",
      title: "X (Twitter)",
      url: "https://x.com",
      status: "ready",
      mode: "external",
    },
    {
      id: "telegram",
      title: "Telegram",
      url: "https://web.telegram.org",
      status: "ready",
      mode: "external",
    },
    {
      id: "example",
      title: "Example",
      url: "https://example.com",
      status: "loading",
      mode: "iframe",
    },
    {
      id: "google",
      title: "Google",
      url: "https://google.com",
      status: "loading",
      mode: "iframe",
    },
  ]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
  };

  const updatePage = (id: string, data: Partial<Page>) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data } : p))
    );
  };

  // Создание внешнего окна через Rust
  const createExternalWindow = async (page: Page) => {
    try {
      updatePage(page.id, { status: "loading", error: undefined });
      
      await invoke("create_external_window", {
        label: `external-${page.id}`,
        url: page.url,
        title: page.title,
        width: 1000,
        height: 700,
      });
      
      updatePage(page.id, { status: "external" });
    } catch (error: any) {
      console.error("Failed to create window:", error);
      updatePage(page.id, {
        status: "error",
        error: typeof error === 'string' ? error : "Не удалось создать окно",
      });
    }
  };

  // Закрытие окна
  const closeExternalWindow = async (pageId: string) => {
    try {
      await invoke("close_window", {
        label: `external-${pageId}`,
      });
      updatePage(pageId, { status: "ready" });
    } catch (error: any) {
      console.error("Failed to close window:", error);
      updatePage(pageId, { 
        status: "error",
        error: "Не удалось закрыть окно"
      });
    }
  };

  // Фокусировка окна
  const focusExternalWindow = async (pageId: string) => {
    try {
      await invoke("focus_window", {
        label: `external-${pageId}`,
      });
    } catch (error: any) {
      console.error("Failed to focus window:", error);
    }
  };

  // Проверка существующих окон
  useEffect(() => {
    // Здесь можно добавить проверку существующих окон если нужно
  }, []);

  const statusTooltip = (page: Page) => {
    if (page.mode === "external") {
      if (page.status === "loading") return "Загрузка...";
      if (page.status === "external") return "Открыто в отдельном окне";
      if (page.status === "ready") return "Готов к открытию";
      if (page.status === "error") return page.error || "Ошибка";
    }
    if (page.status === "loading") return "Загрузка iframe...";
    if (page.status === "ready") return "Готово";
    return page.error || "Ошибка";
  };

  const statusColor = (page: Page) => {
    switch (page.status) {
      case "loading": return "#ff9800";
      case "ready": return "#4caf50";
      case "error": return "#f44336";
      case "external": return "#2196f3";
      default: return "#9e9e9e";
    }
  };

  return (
    <div className={`app theme-${theme}`}>
      <header className="topbar">
        <div className="tool-group">
          <button>Новый</button>
          <button>История</button>
        </div>
        <div className="tool-group">
          <button onClick={toggleTheme}>
            {theme === "dark" ? "☀ Light" : "🌙 Dark"}
          </button>
        </div>
      </header>

      <div className="content">
        <section
          className="left-panel"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <textarea
            placeholder="Введите текст..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="left-actions">
            <label className="file-btn">
              📎 Прикрепить
              <input
                type="file"
                hidden
                multiple
                onChange={(e) =>
                  e.target.files &&
                  setFiles((prev) => [
                    ...prev,
                    ...Array.from(e.target.files ?? []),
                  ])
                }
              />
            </label>

            <button>⚙ Настройки</button>
            <button className="send-btn">Отправить</button>
          </div>

          {files.length > 0 && (
            <div className="file-list">
              {files.map((f, i) => (
                <div key={i} className="file-item">
                  {f.name}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="right-panel">
          {pages.map((page) => (
            <div className="island" key={page.id}>
              <div className="island-header">
                <span className="island-title">{page.title}</span>
                <div className="island-controls">
                  {page.mode === "external" && page.status === "external" && (
                    <button 
                      className="control-btn"
                      onClick={() => closeExternalWindow(page.id)}
                      title="Закрыть окно"
                    >
                      ✖
                    </button>
                  )}
                  <span
                    className="status-indicator"
                    style={{ 
                      backgroundColor: statusColor(page),
                      cursor: "help"
                    }}
                    title={statusTooltip(page)}
                  />
                </div>
              </div>

              <div className="island-content">
                {page.mode === "iframe" ? (
                  <iframe
                    src={page.url}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    onLoad={() =>
                      updatePage(page.id, { status: "ready", error: undefined })
                    }
                    onError={() =>
                      updatePage(page.id, {
                        status: "error",
                        error: "Не удалось загрузить iframe",
                      })
                    }
                  />
                ) : (
                  <div className="external-content">
                    {page.status === "loading" && (
                      <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Подготовка к открытию...</p>
                      </div>
                    )}
                    
                    {page.status === "ready" && (
                      <div className="ready-state">
                        <p>Этот сайт требует отдельное окно</p>
                        <button 
                          onClick={() => createExternalWindow(page)}
                          className="open-window-btn"
                        >
                          📂 Открыть в новом окне
                        </button>
                      </div>
                    )}
                    
                    {page.status === "external" && (
                      <div className="external-state">
                        <div className="external-icon">🔗</div>
                        <p>Открыто в отдельном окне</p>
                        <div className="external-actions">
                          <button 
                            onClick={() => focusExternalWindow(page.id)}
                            className="focus-btn"
                          >
                            📌 Перейти к окну
                          </button>
                          <button 
                            onClick={() => closeExternalWindow(page.id)}
                            className="close-btn"
                          >
                            ❌ Закрыть окно
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {page.status === "error" && (
                      <div className="error-state">
                        <p>⚠️ {page.error || "Произошла ошибка"}</p>
                        <button 
                          onClick={() => {
                            updatePage(page.id, { status: "loading" });
                            setTimeout(() => createExternalWindow(page), 100);
                          }}
                        >
                          🔄 Повторить
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

export default App;