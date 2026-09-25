use std::path::Path;

/// The `res://` path of `dir` when it lies inside a Godot project (a folder above it holds `project.godot`).
///
/// A command because the webview's fs scope only covers folders the user picked, not their parents.
#[tauri::command]
fn godot_res_path(dir: String) -> Option<String> {
    let dir = Path::new(&dir);
    let root = dir
        .ancestors()
        .find(|a| a.join("project.godot").is_file())?;
    let rel = dir
        .strip_prefix(root)
        .ok()?
        .to_string_lossy()
        .replace('\\', "/");
    Some(if rel.is_empty() {
        "res://".to_string()
    } else {
        format!("res://{rel}/")
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        // after fs: restores the file/folder grants from dialogs and drops, so saved folders keep working
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![godot_res_path])
        .run(tauri::generate_context!())
        .expect("error while running Autotiler");
}

#[cfg(test)]
mod tests {
    use super::godot_res_path;
    use std::fs;

    #[test]
    fn finds_the_res_path_of_a_folder_inside_a_godot_project() {
        let root = std::env::temp_dir().join(format!("autotiler-res-{}", std::process::id()));
        let tiles = root.join("assets").join("tiles");
        fs::create_dir_all(&tiles).unwrap();
        fs::write(root.join("project.godot"), "config_version=5\n").unwrap();
        assert_eq!(
            godot_res_path(tiles.to_string_lossy().into()),
            Some("res://assets/tiles/".into())
        );
        assert_eq!(
            godot_res_path(root.to_string_lossy().into()),
            Some("res://".into())
        );
        fs::remove_dir_all(&root).unwrap();
        assert_eq!(
            godot_res_path(std::env::temp_dir().to_string_lossy().into()),
            None
        );
    }
}
