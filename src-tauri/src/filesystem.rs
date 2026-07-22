//! Filesystem commands exposed to the renderer.
//!
//! The wire format mirrors `src/services/filesystem/tauri/TauriFileSystemService.ts`
//! — keep the two in sync when adding fields.

use std::collections::HashMap;
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

/// Runs blocking work off the main thread.
///
/// Tauri executes a synchronous command **on the main thread**, so filesystem
/// I/O there freezes the window: reading C:\Windows\System32 means one
/// `metadata()` call per 5,000 entries. Every command that touches the disk is
/// therefore async and delegates to `spawn_blocking`.
async fn off_thread<T, F>(work: F) -> Result<T, String>
where
    F: FnOnce() -> T + Send + 'static,
    T: Send + 'static,
{
    tauri::async_runtime::spawn_blocking(work)
        .await
        .map_err(|e| format!("Filesystem task failed: {e}"))
}

#[tauri::command]
pub async fn list_directory(path: String) -> Result<Vec<Entry>, String> {
    off_thread(move || read_directory(path)).await?
}

/// Reads one directory level. Unreadable children are skipped rather than
/// failing the whole listing — system folders routinely deny access.
fn read_directory(path: String) -> Result<Vec<Entry>, String> {
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
pub async fn list_drives() -> Vec<Drive> {
    off_thread(read_drives).await.unwrap_or_default()
}

fn read_drives() -> Vec<Drive> {
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
                GetDiskFreeSpaceExW(wide.as_ptr(), std::ptr::null_mut(), &mut total, &mut free)
            } != 0;

            let label = volume_label(&root)
                .map(|name| format!("{name} ({letter}:)"))
                .unwrap_or_else(|| format!("Local Disk ({letter}:)"));

            Drive {
                label,
                path: root,
                total_bytes: ok.then_some(total),
                free_bytes: ok.then_some(free),
            }
        })
        .collect()
}

#[derive(Serialize)]
pub struct SearchResult {
    pub entries: Vec<Entry>,
    /// True when a limit stopped the walk before the whole tree was seen.
    pub truncated: bool,
    /// Directories actually descended into — useful for a "searched N folders" hint.
    pub examined: u32,
}

/// Upper bounds so a search rooted high in the tree cannot hang the app.
const MAX_RESULTS: usize = 500;
const MAX_NODES: u32 = 60_000;
const MAX_DEPTH: u32 = 24;

#[tauri::command]
pub async fn search_directory(root: String, query: String) -> Result<SearchResult, String> {
    off_thread(move || search_tree(&root, &query)).await?
}

/// Case-insensitive substring search over a subtree.
///
/// Iterative rather than recursive so the node/result caps apply globally, not
/// per branch: a directory with a million files must not be able to blow the
/// budget by living inside a shallow tree. Unreadable directories are skipped,
/// matching `read_directory` — a denied folder narrows the search, it does not
/// fail it.
fn search_tree(root: &str, query: &str) -> Result<SearchResult, String> {
    let needle = query.trim().to_lowercase();
    if needle.is_empty() {
        return Ok(SearchResult {
            entries: Vec::new(),
            truncated: false,
            examined: 0,
        });
    }

    let root_path = PathBuf::from(root);
    if !root_path.is_dir() {
        return Err(format!("{root} is not a directory"));
    }

    let mut entries = Vec::new();
    let mut queue: Vec<(PathBuf, u32)> = vec![(root_path, 0)];
    let mut nodes = 0u32;
    let mut examined = 0u32;
    let mut truncated = false;

    while let Some((dir, depth)) = queue.pop() {
        let read = match fs::read_dir(&dir) {
            Ok(read) => read,
            Err(_) => continue, // permission denied, or vanished mid-walk
        };
        examined += 1;

        for item in read.filter_map(Result::ok) {
            nodes += 1;
            if nodes > MAX_NODES || entries.len() >= MAX_RESULTS {
                truncated = true;
                break;
            }

            let path = item.path();
            let name = item.file_name().to_string_lossy().to_lowercase();
            if name.contains(&needle) {
                if let Some(entry) = to_entry(&path) {
                    entries.push(entry);
                }
            }

            // Descend after matching, so a matching directory still appears.
            if depth < MAX_DEPTH && item.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                queue.push((path, depth + 1));
            }
        }

        if truncated {
            break;
        }
    }

    // Directories first, then case-insensitive by name — same order as a listing.
    entries.sort_by(|a, b| {
        b.is_directory
            .cmp(&a.is_directory)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(SearchResult {
        entries,
        truncated,
        examined,
    })
}

/// Number of direct children per directory, for the satellites orbiting a
/// folder-planet.
///
/// Deliberately a separate command: this is one `read_dir` per directory, so
/// folding it into `list_directory` would make a large folder pay N+1 reads
/// before anything could be drawn. The renderer paints first, then enriches.
/// Unreadable directories are omitted rather than reported as zero.
#[tauri::command]
pub async fn count_children(paths: Vec<String>) -> HashMap<String, u32> {
    off_thread(move || read_child_counts(paths))
        .await
        .unwrap_or_default()
}

fn read_child_counts(paths: Vec<String>) -> HashMap<String, u32> {
    paths
        .into_iter()
        .filter_map(|path| {
            let count = fs::read_dir(&path).ok()?.count() as u32;
            Some((path, count))
        })
        .collect()
}

/// Volume label from the OS, falling back to a generic name.
#[cfg(windows)]
fn volume_label(root: &str) -> Option<String> {
    use windows_sys::Win32::Storage::FileSystem::GetVolumeInformationW;

    let wide: Vec<u16> = root.encode_utf16().chain(std::iter::once(0)).collect();
    let mut name = [0u16; 261];

    let ok = unsafe {
        GetVolumeInformationW(
            wide.as_ptr(),
            name.as_mut_ptr(),
            name.len() as u32,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            0,
        )
    } != 0;

    if !ok {
        return None;
    }

    let end = name.iter().position(|&c| c == 0).unwrap_or(name.len());
    let label = String::from_utf16_lossy(&name[..end]);
    (!label.trim().is_empty()).then_some(label)
}

/// Creates a directory, returning the entry so the UI can select it.
#[tauri::command]
pub async fn create_directory(parent: String, name: String) -> Result<Entry, String> {
    off_thread(move || make_directory(&parent, &name)).await?
}

fn make_directory(parent: &str, name: &str) -> Result<Entry, String> {
    crate::safety::validate_file_name(name)?;

    let target = PathBuf::from(parent).join(name.trim());
    if target.exists() {
        return Err(format!("\"{}\" already exists here", name.trim()));
    }

    fs::create_dir(&target).map_err(|e| format!("Could not create the folder: {e}"))?;
    to_entry(&target).ok_or_else(|| "Folder created but could not be read".to_string())
}

#[tauri::command]
pub async fn rename_entry(path: String, new_name: String) -> Result<Entry, String> {
    off_thread(move || rename_path(&path, &new_name)).await?
}

fn rename_path(path: &str, new_name: &str) -> Result<Entry, String> {
    let source = PathBuf::from(path);
    let target = crate::safety::resolve_rename_target(&source, new_name)?;

    if target == source {
        return to_entry(&source).ok_or_else(|| "Entry could not be read".to_string());
    }

    fs::rename(&source, &target).map_err(|e| format!("Could not rename: {e}"))?;
    to_entry(&target).ok_or_else(|| "Renamed but could not be read".to_string())
}

/// Moves entries to the Recycle Bin.
///
/// Never a permanent delete: `trash` hands the operation to the shell, so
/// anything removed here can be restored by the user. Each path is validated
/// first — see `safety::validate_deletable`.
#[tauri::command]
pub async fn delete_entries(paths: Vec<String>) -> Result<Vec<String>, String> {
    off_thread(move || trash_paths(paths)).await?
}

fn trash_paths(paths: Vec<String>) -> Result<Vec<String>, String> {
    let targets: Vec<PathBuf> = paths.iter().map(PathBuf::from).collect();

    // Validate everything before touching anything, so a rejected path in the
    // middle of a multi-select cannot leave the operation half-applied.
    for target in &targets {
        crate::safety::validate_deletable(target)?;
    }

    trash::delete_all(&targets).map_err(|e| format!("Could not move to the Recycle Bin: {e}"))?;
    Ok(paths)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn home_dir_resolves_to_an_existing_directory() {
        let home = get_home_dir().expect("home directory should resolve");
        assert!(
            PathBuf::from(&home).is_dir(),
            "home directory does not exist: {home}"
        );
    }

    #[test]
    fn lists_at_least_one_drive_with_a_plausible_size() {
        let drives = read_drives();
        assert!(!drives.is_empty(), "expected at least one drive");

        let system = drives
            .iter()
            .find(|d| d.path.starts_with('C') || d.path == "/")
            .expect("expected a system drive");

        // Proves the FFI wrote through the out-pointers rather than silently failing.
        let total = system.total_bytes.expect("total size should be readable");
        let free = system.free_bytes.expect("free size should be readable");
        assert!(total > 0, "total size must be positive");
        assert!(free <= total, "free ({free}) cannot exceed total ({total})");
    }

    #[test]
    fn lists_the_home_directory_with_folders_sorted_first() {
        let home = get_home_dir().unwrap();
        let entries = read_directory(home.clone()).expect("home should be readable");

        let first_file = entries.iter().position(|e| !e.is_directory);
        let last_dir = entries.iter().rposition(|e| e.is_directory);
        if let (Some(file), Some(dir)) = (first_file, last_dir) {
            assert!(file > dir, "directories must sort before files");
        }

        for entry in &entries {
            assert!(entry.path.ends_with(&entry.name), "path must end with name");
            if entry.is_directory {
                assert!(entry.size.is_none(), "directories report no size");
            }
        }
    }

    #[test]
    fn counts_children_and_skips_unreadable_paths() {
        let home = get_home_dir().unwrap();
        let bogus = r"C:\definitely-not-a-real-path-9f2a".to_string();

        let counts = read_child_counts(vec![home.clone(), bogus.clone()]);

        assert!(
            counts.contains_key(&home),
            "readable directory must be counted"
        );
        assert!(
            !counts.contains_key(&bogus),
            "unreadable paths are omitted, not zeroed"
        );

        let listed = read_directory(home.clone()).unwrap().len() as u32;
        assert_eq!(counts[&home], listed, "count must match the listing");
    }

    #[test]
    fn missing_directory_returns_an_error_rather_than_panicking() {
        let result = read_directory(r"C:\definitely-not-a-real-path-9f2a".to_string());
        assert!(result.is_err());
    }

    /// Scratch directory under the OS temp dir, removed on drop.
    struct Scratch(PathBuf);

    impl Scratch {
        fn new(tag: &str) -> Self {
            let dir = std::env::temp_dir().join(format!("galaxy-test-{tag}"));
            let _ = fs::remove_dir_all(&dir);
            fs::create_dir_all(&dir).expect("scratch dir");
            Self(dir)
        }
        fn path(&self) -> &str {
            self.0.to_str().unwrap()
        }
    }

    impl Drop for Scratch {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn creates_a_directory_and_reports_it() {
        let scratch = Scratch::new("create");

        let entry = make_directory(scratch.path(), "New World").expect("should create");
        assert!(entry.is_directory);
        assert_eq!(entry.name, "New World");
        assert!(PathBuf::from(&entry.path).is_dir());

        // Creating the same name twice must fail rather than silently succeed.
        assert!(make_directory(scratch.path(), "New World").is_err());
    }

    #[test]
    fn refuses_to_create_outside_the_parent_directory() {
        let scratch = Scratch::new("escape");

        assert!(make_directory(scratch.path(), "..\\escaped").is_err());
        assert!(make_directory(scratch.path(), "nested/dir").is_err());
        assert!(!scratch.0.parent().unwrap().join("escaped").exists());
    }

    #[test]
    fn renames_within_the_same_directory() {
        let scratch = Scratch::new("rename");
        let created = make_directory(scratch.path(), "before").unwrap();

        let renamed = rename_path(&created.path, "after").expect("should rename");
        assert_eq!(renamed.name, "after");
        assert!(!PathBuf::from(&created.path).exists());
        assert!(PathBuf::from(&renamed.path).is_dir());
    }

    #[test]
    fn refuses_a_rename_that_would_clobber_an_existing_entry() {
        let scratch = Scratch::new("clobber");
        let a = make_directory(scratch.path(), "alpha").unwrap();
        make_directory(scratch.path(), "beta").unwrap();

        assert!(rename_path(&a.path, "beta").is_err());
        assert!(PathBuf::from(&a.path).is_dir(), "original must survive");
    }

    #[test]
    fn delete_validates_every_path_before_removing_any() {
        let scratch = Scratch::new("atomic-delete");
        let doomed = make_directory(scratch.path(), "doomed").unwrap();

        // One protected path in the batch must abort the whole operation.
        let result = trash_paths(vec![doomed.path.clone(), "C:\\Windows".to_string()]);

        assert!(result.is_err());
        assert!(
            PathBuf::from(&doomed.path).is_dir(),
            "nothing may be deleted when validation fails"
        );
    }

    #[test]
    fn search_finds_matches_recursively() {
        let scratch = Scratch::new("search");
        let nested = make_directory(scratch.path(), "nested").unwrap();
        fs::write(PathBuf::from(&nested.path).join("report-final.txt"), b"x").unwrap();
        fs::write(PathBuf::from(scratch.path()).join("report-draft.txt"), b"x").unwrap();
        fs::write(PathBuf::from(scratch.path()).join("unrelated.md"), b"x").unwrap();

        let result = search_tree(scratch.path(), "report").unwrap();
        let names: Vec<&str> = result.entries.iter().map(|e| e.name.as_str()).collect();

        assert!(names.contains(&"report-draft.txt"), "top-level match");
        assert!(names.contains(&"report-final.txt"), "nested match");
        assert!(!names.contains(&"unrelated.md"), "non-match excluded");
        assert!(!result.truncated);
    }

    #[test]
    fn search_is_case_insensitive_and_matches_directories() {
        let scratch = Scratch::new("search-case");
        make_directory(scratch.path(), "MyReports").unwrap();

        let result = search_tree(scratch.path(), "myreports").unwrap();
        assert_eq!(result.entries.len(), 1);
        assert!(result.entries[0].is_directory);
    }

    #[test]
    fn empty_query_returns_nothing_rather_than_everything() {
        let scratch = Scratch::new("search-empty");
        fs::write(PathBuf::from(scratch.path()).join("a.txt"), b"x").unwrap();

        for query in ["", "   "] {
            let result = search_tree(scratch.path(), query).unwrap();
            assert!(result.entries.is_empty(), "query {query:?} must match nothing");
        }
    }

    #[test]
    fn search_stops_at_the_result_cap() {
        let scratch = Scratch::new("search-cap");
        for i in 0..(MAX_RESULTS + 50) {
            fs::write(PathBuf::from(scratch.path()).join(format!("match-{i}.txt")), b"x").unwrap();
        }

        let result = search_tree(scratch.path(), "match").unwrap();
        assert_eq!(result.entries.len(), MAX_RESULTS);
        assert!(result.truncated, "hitting the cap must be reported");
    }
}
