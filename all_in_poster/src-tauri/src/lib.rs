use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn create_external_window(
    app: tauri::AppHandle,
    label: String,
    url: String,
    title: String,
    width: f64,
    height: f64
) -> Result<(), String> {
    // Создаем WebviewUrl из строки
    let url_parsed = url.parse::<url::Url>()
        .map_err(|e| format!("Invalid URL: {}", e))?;
    let parsed_url = WebviewUrl::External(url_parsed);
    
    // Создаем окно без установки родителя
    WebviewWindowBuilder::new(&app, &label, parsed_url)
        .title(&title)
        .inner_size(width, height)
        .resizable(true)
        .decorations(true)
        .transparent(false)
        .center()
        .build()
        .map_err(|e| format!("Failed to create window: {}", e))?;
    
    Ok(())
}

#[tauri::command]
async fn close_window(app: tauri::AppHandle, label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| format!("Failed to close window: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
async fn focus_window(app: tauri::AppHandle, label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        window.set_focus().map_err(|e| format!("Failed to focus window: {}", e))?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            create_external_window,
            close_window,
            focus_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}