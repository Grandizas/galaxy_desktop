mod filesystem;
mod safety;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            filesystem::get_home_dir,
            filesystem::list_directory,
            filesystem::list_drives,
            filesystem::count_children,
            filesystem::search_directory,
            filesystem::create_directory,
            filesystem::rename_entry,
            filesystem::delete_entries,
            filesystem::move_entries,
            filesystem::reveal_in_explorer,
        ])
        .run(tauri::generate_context!())
        .expect("error while running the Galaxy File Explorer");
}
