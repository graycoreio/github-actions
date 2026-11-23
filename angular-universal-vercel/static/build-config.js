// Builds the Vercel Build Output API config for a static deploy.
//
// Usage: node build-config.js <base-config.json> <static-dir> <output-config.json>
//
// Reads from the environment:
//   INPUT_STATIC_ROUTES         JSON array of routes inserted before the filesystem check.
//   INPUT_STATIC_NOT_FOUND_PAGE Page (relative to the static dir) served with a 404 status for unmatched routes.
const fs = require('node:fs');
const path = require('node:path');

const [baseConfigPath, staticDir, outputPath] = process.argv.slice(2);

const fail = (message) => {
  console.error(`Error: ${message}`);
  process.exit(1);
};

const config = JSON.parse(fs.readFileSync(baseConfigPath, 'utf8'));

let routes;
try {
  routes = JSON.parse(process.env.INPUT_STATIC_ROUTES || '[]');
} catch (e) {
  fail(`static_routes must be valid JSON: ${e.message}`);
}
if (!Array.isArray(routes) || routes.some((route) => typeof route !== 'object' || route === null || Array.isArray(route))) {
  fail('static_routes must be a JSON array of route objects');
}

const notFoundPage = (process.env.INPUT_STATIC_NOT_FOUND_PAGE || 'index.csr.html').replace(/^\/+/, '');
if (!fs.existsSync(path.join(staticDir, notFoundPage))) {
  fail(`static_not_found_page '${notFoundPage}' does not exist in the browser output`);
}

const filesystemIndex = config.routes.findIndex((route) => route.handle === 'filesystem');
config.routes.splice(filesystemIndex, 0, ...routes);

const fallback = config.routes[config.routes.length - 1];
fallback.dest = `/${notFoundPage}`;

fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
console.log(`Wrote ${outputPath} with ${routes.length} custom route(s), unmatched routes serve /${notFoundPage}`);
