export default async function diagnose(page) {
  const pageErrors = [];
  const consoleMessages = [];
  const failedRequests = [];
  page.on("pageerror", (error) =>
    pageErrors.push(error.stack || error.message),
  );
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleMessages.push({ type: message.type(), text: message.text() });
    }
  });
  page.on("requestfailed", (request) =>
    failedRequests.push({
      url: request.url(),
      error: request.failure()?.errorText,
    }),
  );
  await page.reload({ waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  return {
    pageErrors,
    consoleMessages,
    failedRequests,
    page: await page.evaluate(() => ({
      root: document.querySelector("#root")?.innerHTML.slice(0, 1500),
      scripts: [...document.scripts].map((script) => ({
        src: script.src,
        type: script.type,
        readyState: script.readyState,
      })),
      moduleScripts: performance
        .getEntriesByType("resource")
        .filter(
          (entry) =>
            entry.name.includes("/src/") || entry.name.includes("/@vite/"),
        )
        .map((entry) => entry.name),
      url: location.href,
    })),
  };
}
