// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
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
    // Получаем главное окно
    let main_window = app.get_webview_window("main").ok_or("Main window not found")?;
    
    // Создаем WebviewUrl из строки (используем parse для строки, затем конвертируем в WebviewUrl)
    let url_parsed = url.parse::<url::Url>()
        .map_err(|e| format!("Invalid URL: {}", e))?;
    let parsed_url = WebviewUrl::External(url_parsed);
    
    // Создаем новое окно (WebviewWindowBuilder::new возвращает Result, поэтому используем ?)
    let builder = WebviewWindowBuilder::new(&app, &label, parsed_url)
        .map_err(|e| format!("Failed to create window builder: {}", e))?;
    
    builder
        .title(&title)
        .inner_size(width, height)
        .resizable(true)
        .decorations(true)
        .transparent(false)
        .center()
        .parent(&main_window)
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