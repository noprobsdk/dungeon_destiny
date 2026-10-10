// FR-00004: waits until a local server answers, so studio-web starts after
// studio-api has registered. Usage: node wait-for.mjs <url> [seconds]
const [url, seconds = "90"] = process.argv.slice(2);
const deadline = Date.now() + Number(seconds) * 1000;
for (;;) {
  try {
    await fetch(url);
    process.exit(0);
  } catch {
    if (Date.now() > deadline) {
      console.error(`FR-00004: ${url} did not answer`);
      process.exit(1);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
