const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

module.exports = async function (context, req) {
  try {
    const config = req.body;
    const tempConfigPath = path.join(os.tmpdir(), `chart_${Date.now()}.json`);
    fs.writeFileSync(tempConfigPath, JSON.stringify(config));

    const scriptPath = path.join(__dirname, "fusionexport-csharp-win_x64-v2.0.0", "run.bat");

    const output = await new Promise((resolve, reject) => {
      execFile(scriptPath, [tempConfigPath], { windowsHide: true }, (error, stdout, stderr) => {
        if (error) return reject(stderr || error.message);
        resolve(stdout);
      });
    });

    const match = output.match(/OUTPUT_FILE=(.*\.pdf)/);
    if (!match) throw new Error("PDF path not found in output");

    const pdfPath = match[1].trim();
    const pdfBuffer = fs.readFileSync(pdfPath);

    // Kill FusionExport service
    execFile("taskkill", ["/im", "fusionexport-service.exe", "/f"]);

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/pdf" },
      body: pdfBuffer,
      isRaw: true
    };
  } catch (err) {
    context.res = {
      status: 500,
      body: `Error: ${err}`
    };
  }
};
