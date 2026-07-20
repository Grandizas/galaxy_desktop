//! Filesystem commands exposed to the renderer.
//!
//! The wire format mirrors `src/services/filesystem/tauri/TauriFileSystemService.ts`
//! — keep the two in sync when adding fields.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

use serde::Serialize;

#[derive(Serialize)]
pub struct Entry {
    pub path: String,
    pub name: String,
    pub is_directory: bool,
    pub size: Option<u64>,
    /// Milliseconds since the Unix epoch.
    pub modified_at: Option<u64>,
    pub created_at: Option<u64>,
}

#[derive(Serialize)]
pub struct Drive {
    pub path: String,
    pub label: String,
    pub total_bytes: Option<u64>,
    pub free_bytes: Option<u64>,
}

fn millis(time: Option<std::time::SystemTime>) -> Option<u64> {
    time.and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
}

fn to_entry(path: &Path) -> Option<Entry> {
    let metadata = fs::metadata(path).ok()?;
    let is_directory = metadata.is_dir();

    Some(Entry {
        path: path.to_string_lossy().to_string(),
        name: path.file_name()?.to_string_lossy().to_string(),
        is_directory,
        size: if is_directory {
            None
        } else {
            Some(metadata.len())
        },
        modified_at: millis(metadata.modified().ok()),
        created_at: millis(metadata.created().ok()),
    })
}

#[tauri::command]
pub fn get_home_dir() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not determine the home directory".to_string())
}

/// Reads one directory level. Unreadable children are skipped rather than
/// failing the whole listing — system folders routinely deny access.
#[tauri::command]
pub fn list_directory(path: String) -> Result<Vec<Entry>, String> {
    let dir = PathBuf::from(&path);
    let read = fs::read_dir(&dir).map_err(|e| format!("{path}: {e}"))?;

    let mut entries: Vec<Entry> = read
        .filter_map(|item| item.ok())
        .filter_map(|item| to_entry(&item.path()))
        .collect();

    // Folders first, then case-insensitive by name.
    entries.sort_by(|a, b| {
        b.is_directory
            .cmp(&a.is_directory)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(entries)
}

#[tauri::command]
pub fn list_drives() -> Vec<Drive> {
    #[cfg(windows)]
    {
        windows_drives()
    }

    #[cfg(not(windows))]
    {
        vec![Drive {
            path: "/".to_string(),
            label: "Root".to_string(),
            total_bytes: None,
            free_bytes: None,
        }]
    }
}

#[cfg(windows)]
fn windows_drives() -> Vec<Drive> {
    use windows_sys::Win32::Storage::FileSystem::{GetDiskFreeSpaceExW, GetLogicalDrives};

    let mask = unsafe { GetLogicalDrives() };

    (0..26u32)
        .filter(|i| mask & (1 << i) != 0)
        .map(|i| {
            let letter = (b'A' + i as u8) as char;
            let root = format!("{letter}:\\");

            let mut free: u64 = 0;
            let mut total: u64 = 0;
            let wide: Vec<u16> = root.encode_utf16().chain(std::iter::once(0)).collect();
            let ok = unsafe {
                GetDiskFreeSpaceExW(
                    wide.as_ptr(),
                    std::ptr::null_mut(),
                    &mut total,
                    &mut free,
                )
            } != 0;

            Drive {
                label: format!("Local Disk ({letter}:)"),
                path: root,
                total_bytes: ok.then_some(total),
                free_bytes: ok.then_some(free),
            }
        })
        .collect()
}

/// Opens Windows Explorer with the entry pre-selected.
#[tauri::command]
pub fn reveal_in_explorer(path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        std::process::Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    #[cfg(not(windows))]
    {
        let _ = path;
        Err("Revealing entries is only supported on Windows".to_string())
    }
}
