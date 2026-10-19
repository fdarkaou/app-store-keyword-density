#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { densityReport, lookupApp, parseAppId, searchApps } from "./density.js";

const HELP = `app-store-keyword-density: keyword density report for an App Store listing

Usage:
  app-store-keyword-density <app id | App Store URL> [options]
  app-store-keyword-density --search "habit tracker" [options]
  app-store-keyword-density --file description.txt [--name "My App"] [options]

Options:
  --country <cc>   Storefront, default us
  --search <term>  Analyse the top search result for <term>
  --file <path>    Analyse a local text file ("-" for stdin) instead of a live listing
  --name <text>    App name to compare against (with --file)
  --ngrams <n>     Longest phrase length, 1-4, default 3
  --top <n>        Rows per table, default 15
  --json           Print JSON instead of tables
  -h, --help       Show this help

Data comes from Apple's public iTunes Search/Lookup API. No API key needed.`;

function parseArgs(argv) {
  const o = { country: "us", ngrams: 3, top: 15, json: false, positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => argv[++i];
    if (a === "-h" || a === "--help") o.help = true;
    else if (a === "--json") o.json = true;
    else if (a === "--country") o.country = next();
    else if (a === "--search") o.search = next();
    else if (a === "--file") o.file = next();
    else if (a === "--name") o.name = next();
    else if (a === "--ngrams") o.ngrams = Math.min(4, Math.max(1, parseInt(next(), 10) || 3));
    else if (a === "--top") o.top = Math.max(1, parseInt(next(), 10) || 15);
    else o.positional.push(a);
  }
  return o;
}

const pad = (s, n) => String(s).padEnd(n);
function printTable(title, rows) {
  if (!rows.length) return;
  console.log(`\n${title}`);
  const w = Math.max(10, ...rows.map((r) => r.term.length)) + 2;
  console.log(`  ${pad("term", w)}${pad("count", 7)}${pad("density", 9)}in name`);
  for (const r of rows) console.log(`  ${pad(r.term, w)}${pad(r.count, 7)}${pad(r.density.toFixed(2) + "%", 9)}${r.inName ? "yes" : ""}`);
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help || (!o.positional.length && !o.search && !o.file)) { console.log(HELP); process.exit(o.help ? 0 : 1); }

  let fields, meta;
  if (o.file) {
    const text = readFileSync(o.file === "-" ? 0 : o.file, "utf8");
    fields = { name: o.name || "", description: text };
    meta = { source: o.file };
  } else {
    let id = o.positional.length ? parseAppId(o.positional[0]) : null;
    if (o.search) {
      const results = await searchApps(o.search, o.country);
      if (!results.length) throw new Error(`No App Store results for "${o.search}" in ${o.country}`);
      id = String(results[0].trackId);
    }
    if (!id) throw new Error(`Could not read an App Store id from "${o.positional[0]}"`);
    const app = await lookupApp(id, o.country);
    if (!app) throw new Error(`App ${id} not found in the ${o.country} storefront`);
    fields = { name: app.trackName, description: app.description };
    meta = { id: app.trackId, name: app.trackName, seller: app.sellerName, country: o.country, url: (app.trackViewUrl || "").replace(/\?uo=\d+$/, ""), version: app.version };
  }

  const report = densityReport(fields, { maxN: o.ngrams, top: o.top });
  if (o.json) { console.log(JSON.stringify({ ...meta, ...report }, null, 2)); return; }

  if (meta.name) console.log(`${meta.name} (id ${meta.id}, ${meta.country}, v${meta.version}) by ${meta.seller}\n${meta.url}`);
  else console.log(`Source: ${meta.source}`);
  console.log(`Description: ${report.totalWords} words, ${report.uniqueWords} unique`);
  const labels = { 1: "Single words", 2: "Two-word phrases", 3: "Three-word phrases", 4: "Four-word phrases" };
  for (const n of Object.keys(report.ngrams)) printTable(labels[n], report.ngrams[n]);
  if (report.nameCoverage.length) {
    console.log("\nApp name words used in the description");
    for (const c of report.nameCoverage) console.log(`  ${pad(c.term, 20)}${c.inDescription}x`);
  }
}

main().catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
