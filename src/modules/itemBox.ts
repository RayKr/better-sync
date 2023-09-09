import ToolkitGlobal from "zotero-plugin-toolkit/dist/managers/toolkitGlobal";
import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";

export async function registerItemBoxExtraRows() {
  ztoolkit.log("===>", document);

  // await ztoolkit.ItemBox.register(
  //   "titleTranslationsssTest",
  //   "test",
  //   // getField shook is registered in itemTree.ts
  //   undefined,
  //   {
  //     editable: true,
  //     setFieldHook: (field, value, loadIn, item, original) => {
  //       ztoolkit.log(
  //         "setFdiessssdssssssdfsss代sssaadsdfsssldHoosk",
  //         field,
  //         value,
  //         loadIn,
  //         item,
  //         original,
  //       );
  //       ztoolkit.ExtraField.setExtraField(item, field, value);
  //       return true;
  //     },
  //     index: 2,
  //     multiline: true,
  //   },
  // );

  // await ztoolkit.ItemBox.register(
  //   "abstractTranslation",
  //   " absss",
  //   (field, unformatted, includeBaseMapped, item, original) => {
  //     return ztoolkit.ExtraField.getExtraField(item, field) || "";
  //   },
  //   {
  //     editable: false,
  //     setFieldHook: (field, value, loadIn, item, original) => {
  //       ztoolkit.ExtraField.setExtraField(item, field, value);
  //       return true;
  //     },
  //     index: 3,
  //     multiline: true,
  //     collapsible: true,
  //   },
  // );
}
