const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

module.exports = async function (context, req) {
  const lockFile = path.join(os.tmpdir(), "fusionexport.lock");
  let lockAcquired = false;

  try {
    console.log("🔐 Checking for FusionExport lock...");
    if (fs.existsSync(lockFile)) {
      console.log("🚫 Lock file exists. FusionExport is busy.");
      throw new Error("FusionExport is busy. Try again shortly.");
    }

    console.log("✅ Lock acquired.");
    fs.writeFileSync(lockFile, "locked");
    lockAcquired = true;

    const lockTimeout = setTimeout(() => {
      if (fs.existsSync(lockFile)) {
        console.log("⏱️ Fallback timeout reached. Releasing lock.");
        fs.unlinkSync(lockFile);
      }
    }, 2 * 60 * 1000);

    const config = req.body;
    const tempConfigPath = path.join(os.tmpdir(), `chart_${Date.now()}.json`);
    console.log("📝 Writing chart config to temp file:", tempConfigPath);
    fs.writeFileSync(tempConfigPath, JSON.stringify(config));
    console.log("📄 Chart config written to:", tempConfigPath);

    const scriptPath = path.resolve(__dirname, "..", "fusionexport-csharp-win_x64-v2.0.0", "run.bat");
    console.log("🚀 Running batch script:", scriptPath);

    const output = await new Promise((resolve, reject) => {
      execFile(scriptPath, [tempConfigPath], { windowsHide: true }, (error, stdout, stderr) => {
        if (error) {
          console.error("❌ Batch script error:", stderr || error.message);
          return reject(stderr || error.message);
        }
        console.log("📤 Batch script output:\n", stdout);
        resolve(stdout);
      });
    });

    const match = output.match(/OUTPUT_FILE=(.*\.pdf)/);
    if (!match) {
      console.error("❌ PDF path not found in output.");
      throw new Error("PDF path not found in output");
    }

    const pdfPath = match[1].trim();
    console.log("📁 PDF generated at:", pdfPath);

    const pdfBuffer = fs.readFileSync(pdfPath);

    console.log("🧹 Killing FusionExport service...");
    execFile("taskkill", ["/im", "fusionexport-service.exe", "/f"]);

    clearTimeout(lockTimeout);
    if (lockAcquired && fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
      console.log("🔓 Lock released.");
    }

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/pdf" },
      body: pdfBuffer,
      isRaw: true
    };
  } catch (err) {
    if (lockAcquired && fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
      console.log("🔓 Lock released after error.");
    }

    console.error("❌ Error during export:", err);
    context.res = {
      status: 500,
      body: `Error: ${err}`
    };
  }
};
