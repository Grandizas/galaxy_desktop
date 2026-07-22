//! Guard rails for destructive filesystem operations.
//!
//! Every mutating command validates through this module first. The rules are
//! deliberately stricter than Windows itself: refusing an unusual-but-legal name
//! costs the user one retry, while allowing a malformed path can destroy data or
//! silently create a file nothing can open or delete.

use std::fs;
use std::path::{Component, Path, PathBuf};

/// Characters Windows forbids in a file name.
const ILLEGAL_CHARS: [char; 9] = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];

/// Device names that remain reserved regardless of extension.
const RESERVED_NAMES: [&str; 22] = [
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
    "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

const MAX_NAME_LEN: usize = 255;

/// Rejects any name that is not a plain, creatable file name.
///
/// Path separators are the important case: `..\\..\\Windows` as a "name" would
/// let a rename escape its directory entirely.
pub fn validate_file_name(name: &str) -> Result<(), String> {
    let trimmed = name.trim();

    if trimmed.is_empty() {
        return Err("Name cannot be empty".into());
    }
    if trimmed.len() > MAX_NAME_LEN {
        return Err(format!("Name cannot exceed {MAX_NAME_LEN} characters"));
    }
    if trimmed == "." || trimmed == ".." {
        return Err("Name cannot be \".\" or \"..\"".into());
    }
    if let Some(bad) = trimmed.chars().find(|c| ILLEGAL_CHARS.contains(c)) {
        return Err(format!("Name cannot contain {bad}"));
    }
    if trimmed.chars().any(|c| (c as u32) < 0x20) {
        return Err("Name cannot contain control characters".into());
    }
    // Windows silently strips these, so the created file would not match the
    // name the user typed — and may then be impossible to delete.
    if name.ends_with('.') || name.ends_with(' ') {
        return Err("Name cannot end with a space or a period".into());
    }

    let stem = trimmed.split('.').next().unwrap_or(trimmed).to_uppercase();
    if RESERVED_NAMES.contains(&stem.as_str()) {
        return Err(format!("\"{stem}\" is a reserved Windows device name"));
    }

    Ok(())
}

/// Refuses paths whose loss would be catastrophic or unrecoverable.
///
/// A file explorer should never be the reason someone's drive root, user
/// profile or Windows directory ends up in the Recycle Bin.
pub fn validate_deletable(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Err(format!("{} no longer exists", path.display()));
    }

    // `C:\` yields Prefix + RootDir — two components, not one — so count the
    // *named* segments instead. A root has none.
    let has_named_segment = path
        .components()
        .any(|c| !matches!(c, Component::Prefix(_) | Component::RootDir));
    if !has_named_segment {
        return Err("Refusing to delete a drive root".into());
    }

    if let Some(home) = dirs::home_dir() {
        if path == home {
            return Err("Refusing to delete your user profile".into());
        }
        // Direct children of home are the well-known folders (Desktop,
        // Documents…) — losing one to a stray double-click is too costly.
        if path.parent() == Some(home.as_path()) && path.is_dir() && is_well_known(path) {
            return Err(format!(
                "Refusing to delete the {} folder",
                path.file_name().unwrap_or_default().to_string_lossy()
            ));
        }
    }

    if is_system_path(path) {
        return Err("Refusing to delete a Windows system folder".into());
    }

    Ok(())
}

fn is_well_known(path: &Path) -> bool {
    const WELL_KNOWN: [&str; 8] = [
        "Desktop",
        "Documents",
        "Downloads",
        "Pictures",
        "Videos",
        "Music",
        "OneDrive",
        "AppData",
    ];
    path.file_name()
        .map(|name| WELL_KNOWN.iter().any(|w| name.eq_ignore_ascii_case(w)))
        .unwrap_or(false)
}

fn is_system_path(path: &Path) -> bool {
    let lower = path.to_string_lossy().to_lowercase();
    let roots = [
        "c:\\windows",
        "c:\\program files",
        "c:\\program files (x86)",
        "c:\\programdata",
        "c:\\$recycle.bin",
        "c:\\system volume information",
    ];
    roots
        .iter()
        .any(|root| lower == *root || lower.starts_with(&format!("{root}\\")))
}

/// Resolves a sibling path for a rename, guaranteeing it stays in the same
/// directory and does not clobber an existing entry.
pub fn resolve_rename_target(path: &Path, new_name: &str) -> Result<PathBuf, String> {
    validate_file_name(new_name)?;

    let parent = path
        .parent()
        .ok_or_else(|| "Cannot rename a drive root".to_string())?;
    let target = parent.join(new_name.trim());

    if target != path && target.exists() {
        return Err(format!("\"{}\" already exists here", new_name.trim()));
    }
    Ok(target)
}

/// Normalised path key for comparison: lowercased (Windows is case-insensitive)
/// with both separator styles folded to `\` (Windows accepts `/` too, so a
/// `\`-only test could be tricked by a `/`-delimited path).
fn path_key(path: &Path) -> String {
    path.to_string_lossy().to_lowercase().replace('/', "\\")
}

/// True when `path` is `ancestor` itself or lives inside it. The trailing
/// separator stops `C:\ab` from looking like a child of `C:\a`.
pub fn is_within(path: &Path, ancestor: &Path) -> bool {
    let p = path_key(path);
    let a = path_key(ancestor);
    p == a || p.starts_with(&format!("{a}\\"))
}

/// Resolves the destination for moving `source` into `target_dir`.
///
/// Rejects the moves that lose data or corrupt the tree: into itself, into one
/// of its own descendants (which would orphan the moved subtree), a no-op move
/// back to the current parent, and a name collision at the destination.
pub fn resolve_move_target(source: &Path, target_dir: &Path) -> Result<PathBuf, String> {
    if !source.exists() {
        return Err(format!("{} no longer exists", source.display()));
    }

    let metadata =
        fs::metadata(target_dir).map_err(|e| format!("{}: {e}", target_dir.display()))?;
    if !metadata.is_dir() {
        return Err("The drop target is not a folder".into());
    }

    let name = source
        .file_name()
        .ok_or_else(|| "Cannot move a drive root".to_string())?;

    if source.parent() == Some(target_dir) {
        return Err(format!("\"{}\" is already here", name.to_string_lossy()));
    }

    if is_within(target_dir, source) {
        return Err("Cannot move a folder into itself".into());
    }

    let dest = target_dir.join(name);
    if dest.exists() {
        return Err(format!("\"{}\" already exists here", name.to_string_lossy()));
    }
    Ok(dest)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_ordinary_names() {
        for name in ["notes.md", "My Folder", "report-2026.final.pdf", "café"] {
            assert!(validate_file_name(name).is_ok(), "should accept {name}");
        }
    }

    #[test]
    fn rejects_path_traversal() {
        // The critical case: a rename must not be able to escape its directory.
        for name in ["..", ".", "../etc", "..\\..\\Windows", "sub/dir", "C:\\abs"] {
            assert!(validate_file_name(name).is_err(), "should reject {name}");
        }
    }

    #[test]
    fn rejects_illegal_characters_and_reserved_names() {
        for name in ["a<b", "a>b", "a:b", "a\"b", "a|b", "a?b", "a*b"] {
            assert!(validate_file_name(name).is_err(), "should reject {name}");
        }
        for name in ["CON", "con", "nul.txt", "COM1", "LPT9.log"] {
            assert!(validate_file_name(name).is_err(), "should reject {name}");
        }
    }

    #[test]
    fn rejects_names_windows_would_silently_alter() {
        assert!(validate_file_name("trailing.").is_err());
        assert!(validate_file_name("trailing ").is_err());
        assert!(validate_file_name("").is_err());
        assert!(validate_file_name("   ").is_err());
        assert!(validate_file_name(&"x".repeat(256)).is_err());
    }

    #[test]
    fn refuses_to_delete_drive_roots_and_system_paths() {
        // `C:\` parses as Prefix + RootDir, so a naive component count passes it.
        assert!(validate_deletable(Path::new("C:\\")).is_err());
        assert!(validate_deletable(Path::new("C:")).is_err());
        assert!(validate_deletable(Path::new("D:\\")).is_err());
        assert!(validate_deletable(Path::new("C:\\Windows")).is_err());
        assert!(validate_deletable(Path::new("C:\\Windows\\System32")).is_err());
        assert!(validate_deletable(Path::new("C:\\Program Files")).is_err());
    }

    #[test]
    fn refuses_to_delete_the_user_profile_and_well_known_folders() {
        let home = dirs::home_dir().unwrap();
        assert!(validate_deletable(&home).is_err());

        let desktop = home.join("Desktop");
        if desktop.exists() {
            assert!(validate_deletable(&desktop).is_err());
        }
    }

    #[test]
    fn move_rejects_dropping_a_folder_into_its_own_descendant() {
        // The critical guard: moving C:\a into C:\a\b\c would orphan the tree.
        let scratch = std::env::temp_dir().join("galaxy-move-guard");
        let _ = fs::remove_dir_all(&scratch);
        let source = scratch.join("source");
        let descendant = source.join("deep").join("nested");
        fs::create_dir_all(&descendant).unwrap();

        assert!(resolve_move_target(&source, &descendant).is_err());
        // ...and into itself.
        assert!(resolve_move_target(&source, &source).is_err());

        let _ = fs::remove_dir_all(&scratch);
    }

    #[test]
    fn is_within_is_case_and_separator_independent() {
        // Windows accepts both separators; a \-only check would miss the second.
        assert!(is_within(Path::new(r"C:\a\b\c"), Path::new(r"C:\A\B")));
        assert!(is_within(Path::new("C:/a/b/c"), Path::new(r"C:\a\b")));
        assert!(is_within(Path::new(r"C:\a\b"), Path::new("c:/a/b")));
        // A shared prefix that is not a real ancestor.
        assert!(!is_within(Path::new(r"C:\ab"), Path::new(r"C:\a")));
    }

    #[test]
    fn move_rejects_a_no_op_and_a_collision() {
        let scratch = std::env::temp_dir().join("galaxy-move-noop");
        let _ = fs::remove_dir_all(&scratch);
        let dest_dir = scratch.join("dest");
        fs::create_dir_all(&dest_dir).unwrap();
        let source = scratch.join("item.txt");
        fs::write(&source, b"x").unwrap();

        // No-op: source's parent is already the target.
        assert!(resolve_move_target(&source, &scratch).is_err());

        // Collision: something with the same name already lives at the target.
        fs::write(dest_dir.join("item.txt"), b"y").unwrap();
        assert!(resolve_move_target(&source, &dest_dir).is_err());

        let _ = fs::remove_dir_all(&scratch);
    }

    #[test]
    fn move_accepts_a_valid_relocation() {
        let scratch = std::env::temp_dir().join("galaxy-move-ok");
        let _ = fs::remove_dir_all(&scratch);
        let dest_dir = scratch.join("dest");
        fs::create_dir_all(&dest_dir).unwrap();
        let source = scratch.join("item.txt");
        fs::write(&source, b"x").unwrap();

        let target = resolve_move_target(&source, &dest_dir).unwrap();
        assert_eq!(target, dest_dir.join("item.txt"));

        let _ = fs::remove_dir_all(&scratch);
    }

    #[test]
    fn rename_target_stays_in_the_same_directory() {
        let path = Path::new("C:\\Users\\Nova\\notes.md");

        let target = resolve_rename_target(path, "renamed.md").unwrap();
        assert_eq!(target, Path::new("C:\\Users\\Nova\\renamed.md"));

        assert!(resolve_rename_target(path, "..\\escaped.md").is_err());
        assert!(resolve_rename_target(path, "sub/nested.md").is_err());
    }
}
