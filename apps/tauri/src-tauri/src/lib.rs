//! The native shell of Horva: one window with the webview and the backend
//! sidecar, a Node.js process that runs `@horva/core` (src/backend). The
//! shell passes lines between the two and reads none of them; the protocol
//! is in src/shared/protocol.ts.

use std::sync::Mutex;

use tauri::ipc::Channel;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

/// Lines of the sidecar for the webview. They wait in `pending` until the
/// webview connects, and go to the newest connection after a reload.
struct Relay<S> {
    sink: Option<S>,
    pending: Vec<String>,
}

impl<S: Fn(String)> Relay<S> {
    fn new() -> Self {
        Self {
            sink: None,
            pending: Vec::new(),
        }
    }

    fn connect(&mut self, sink: S) {
        for line in self.pending.drain(..) {
            sink(line);
        }
        self.sink = Some(sink);
    }

    fn push(&mut self, line: String) {
        match &self.sink {
            Some(sink) => sink(line),
            None => self.pending.push(line),
        }
    }
}

type Sink = Box<dyn Fn(String) + Send>;

struct Backend {
    child: Mutex<CommandChild>,
    relay: Mutex<Relay<Sink>>,
}

/// Opens the stream of sidecar lines to the webview.
#[tauri::command]
fn backend_connect(backend: State<'_, Backend>, on_message: Channel<String>) {
    let sink: Sink = Box::new(move |line| {
        if let Err(err) = on_message.send(line) {
            eprintln!("[shell] cannot pass a line to the webview: {err}");
        }
    });
    backend.relay.lock().unwrap().connect(sink);
}

/// Writes one line of the webview to the stdin of the sidecar.
#[tauri::command]
fn backend_send(backend: State<'_, Backend>, line: String) -> Result<(), String> {
    if line.contains('\n') {
        return Err("a message must fit on one line".into());
    }
    let mut bytes = line.into_bytes();
    bytes.push(b'\n');
    backend
        .child
        .lock()
        .unwrap()
        .write(&bytes)
        .map_err(|err| err.to_string())
}

/// Starts `node backend/index.mjs` from the bundled resources and forwards
/// its output: stdout to the webview, stderr to the log of the shell.
fn start_backend(app: &AppHandle) -> Result<Backend, Box<dyn std::error::Error>> {
    let script = app
        .path()
        .resolve("backend/index.mjs", BaseDirectory::Resource)?;
    let (mut events, child) = app.shell().sidecar("node")?.arg(script).spawn()?;

    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = events.recv().await {
            match event {
                CommandEvent::Stdout(bytes) => {
                    let line = String::from_utf8_lossy(&bytes).trim_end().to_string();
                    if line.is_empty() {
                        continue;
                    }
                    handle.state::<Backend>().relay.lock().unwrap().push(line);
                }
                CommandEvent::Stderr(bytes) => {
                    eprintln!("{}", String::from_utf8_lossy(&bytes).trim_end());
                }
                CommandEvent::Error(err) => eprintln!("[shell] backend: {err}"),
                CommandEvent::Terminated(status) => {
                    // Without the backend the app can do nothing.
                    eprintln!("[shell] the backend stopped: {status:?}");
                    handle.exit(1);
                }
                _ => {}
            }
        }
    });

    Ok(Backend {
        child: Mutex::new(child),
        relay: Mutex::new(Relay::new()),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let backend = start_backend(app.handle())?;
            app.manage(backend);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![backend_connect, backend_send])
        .run(tauri::generate_context!())
        .expect("error while running the Tauri application");
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;
    use std::rc::Rc;

    use super::Relay;

    fn recorder() -> (Rc<RefCell<Vec<String>>>, impl Fn(String)) {
        let lines = Rc::new(RefCell::new(Vec::new()));
        let sink_lines = Rc::clone(&lines);
        (lines, move |line| sink_lines.borrow_mut().push(line))
    }

    #[test]
    fn keeps_lines_until_the_webview_connects() {
        let mut relay = Relay::new();
        relay.push("one".into());
        relay.push("two".into());
        let (lines, sink) = recorder();
        relay.connect(sink);
        relay.push("three".into());
        assert_eq!(*lines.borrow(), ["one", "two", "three"]);
    }

    #[test]
    fn sends_to_the_newest_connection_after_a_reload() {
        let mut relay = Relay::new();
        let (old, old_sink) = recorder();
        relay.connect(Box::new(old_sink) as Box<dyn Fn(String)>);
        let (new, new_sink) = recorder();
        relay.connect(Box::new(new_sink));
        relay.push("line".into());
        assert!(old.borrow().is_empty());
        assert_eq!(*new.borrow(), ["line"]);
    }
}
