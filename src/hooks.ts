import { BetterSync } from "./modules/sync";
import { config } from "../package.json";
import { getString, initLocale } from "./utils/locale";
import { registerPrefsScripts } from "./modules/preferenceScript";
import { createZToolkit } from "./utils/ztoolkit";
import { getPref } from "./utils/prefs";
import { registerItemBoxExtraRows } from "./modules/itemBox";
import { quicklook, registerShortcuts } from "./modules/shortcuts";
import { registerMenu } from "./modules/menu";
import { registerNotify } from "./modules/notify";
import { setDefaultPrefSetting } from "./modules/defaultPrefs";
import { registerExtraColumns } from "./modules/itemTree";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  initLocale();
  setDefaultPrefSetting();
  registerNotify(["item"]);

  await onMainWindowLoad(window);
}

async function onMainWindowLoad(win: Window): Promise<void> {
  await new Promise((resolve) => {
    if (win.document.readyState !== "complete") {
      win.document.addEventListener("readystatechange", () => {
        if (win.document.readyState === "complete") {
          resolve(void 0);
        }
      });
    }
    resolve(void 0);
  });

  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();

  registerMenu();
  registerShortcuts();

  // await registerItemBoxExtraRows();
  // await registerExtraColumns();
}

async function onMainWindowUnload(win: Window): Promise<void> {
  ztoolkit.unregisterAll();
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  // Remove addon object
  addon.data.alive = false;
  delete Zotero[config.addonInstance];
}

/**
 * This function is just an example of dispatcher for Notify events.
 * Any operations should be placed in a function to keep this funcion clear.
 */
async function onNotify(
  event: string,
  type: string,
  ids: number[] | string[],
  extraData: { [key: string]: any },
) {
  // You can add your code to the corresponding notify type
  if (getPref("enableAutoSync")) {
    BetterSync.autoSync(event, type, ids, extraData);
  }
}

/**
 * This function is just an example of dispatcher for Preference UI events.
 * Any operations should be placed in a function to keep this funcion clear.
 * @param type event type
 * @param data event data
 */
async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  switch (type) {
    case "load":
      registerPrefsScripts(data.window);
      break;
    default:
      return;
  }
}

function onMenuClickEvents(type: string) {
  switch (type) {
    case "manualSync":
      BetterSync.manualSync();
      break;
    default:
      break;
  }
}

async function onShortcuts(type: string) {
  switch (type) {
    case "quicklook":
      quicklook();
      break;
    default:
      break;
  }
}

// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintian.

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
  onPrefsEvent,
  onMenuClickEvents,
  onShortcuts,
};
