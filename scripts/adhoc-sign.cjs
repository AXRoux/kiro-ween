/**
 * afterPack hook: apply a full ad-hoc codesign on macOS.
 *
 * electron-builder assembles the .app before calling this hook.  We sign the
 * whole bundle with `codesign --force --deep --sign -` so that every nested
 * binary (helper processes, Frameworks, dylibs) carries a proper ad-hoc
 * signature and the bundle's resource seal is set correctly.
 *
 * Without this, only the main Electron binary gets the linker's ad-hoc mark
 * (`flags=adhoc,linker-signed`), which leaves Info.plist unbound and the
 * resource envelope missing.  macOS then rejects the bundle with "code has
 * no resources but signature indicates they must be present".
 *
 * This hook is a no-op on Windows and Linux where codesign does not exist.
 */

"use strict";

const { execFileSync } = require("child_process");
const path = require("path");

/** @param {{ appOutDir: string, packager: { appInfo: { productFilename: string } } }} context */
exports.default = async function afterPack(context) {
  if (process.platform !== "darwin") {
    return;
  }

  const appName = `${context.packager.appInfo.productFilename}.app`;
  const appPath = path.join(context.appOutDir, appName);

  console.log(`\n• ad-hoc signing  app=${appPath}\n`);

  execFileSync(
    "codesign",
    [
      "--force",
      "--deep",
      "--sign", "-",
      "--identifier", "dev.trickorread.app",
      appPath,
    ],
    { stdio: "inherit" },
  );
};
