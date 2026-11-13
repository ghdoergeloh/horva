fn main() {
    // The app commands get permissions of their own, so a capability file
    // decides which window may call them (capabilities/default.json).
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&["backend_connect", "backend_send"]),
    ))
    .expect("failed to run the Tauri build script");
}
