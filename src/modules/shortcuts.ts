import { config } from "../../package.json";
import { appendStoredAttachments, getSelectedAttachments } from "../utils/file";
import { getPref } from "../utils/prefs";

export function registerShortcuts() {
  // Register an event key for Alt+L
  // ztoolkit.Shortcut.register("event", {
  //   id: `${config.addonRef}-key-preview`,
  //   key: "x",
  //   modifiers: "", // shift work on macOS
  //   callback: (keyOptions) => {
  //     addon.hooks.onShortcuts("quicklook");
  //   },
  // });

  window.addEventListener("keypress", (event) => {
    const cmdOrCtrlOnly = Zotero.isMac
      ? event.metaKey && !event.shiftKey && !event.ctrlKey && !event.altKey
      : event.ctrlKey && !event.shiftKey && !event.altKey;

    if (cmdOrCtrlOnly && event.key === "y") {
      addon.hooks.onShortcuts("quicklook");
    }
  });
}

export function quicklook() {
  const ids = getSelectedAttachments();
  const items: string[] = [];
  appendStoredAttachments(items, ids);
  items.length && _sendQuicklook({ items: items });
}

function _sendQuicklook(data: any) {
  Zotero.HTTP.doPost(
    `${getPref("apiUrl")}/ql`,
    JSON.stringify(data),
    (response: any) => {
      // just show error message
      if (response.status != 200) {
        ztoolkit.log("Error", response);
        new ztoolkit.ProgressWindow(config.addonName).createLine({
          text: response.message,
          type: "error",
        });
        return;
      }
    },
    { "Content-Type": "application/json" },
  );
}
