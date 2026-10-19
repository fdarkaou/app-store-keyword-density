# App Store Keyword Density

See which words and phrases an App Store listing's description repeats, how dense they are, and which app-name words it reuses. Works for any public iOS app, using Apple's public [iTunes Search/Lookup API](https://performance-partners.apple.com/search-api). No API key, no dependencies.

**Web demo:** https://fdarkaou.github.io/app-store-keyword-density/

## CLI

Requires Node 18+.

```sh
git clone https://github.com/fdarkaou/app-store-keyword-density
cd app-store-keyword-density
node cli.js 389801252                              # app id
node cli.js https://apps.apple.com/us/app/instagram/id389801252
node cli.js --search "habit tracker" --country gb  # top search result
node cli.js --file draft-description.txt --name "My App"   # your own draft, offline
node cli.js 389801252 --json > report.json
```

Options: `--country <cc>` (default `us`), `--ngrams <1-4>` (default 3), `--top <n>` (default 15), `--json`.

Example output (trimmed):

```
Habit Tracker (id 1438388363, gb, v2.25.4) by Inner Grow Limited
Description: 396 words, 240 unique

Single words
  term        count  density  in name
  habits      8      2.02%
  habit       7      1.77%    yes
```

## How it's calculated

- Text is lower-cased, NFKC-normalised and split on letters and digits.
- 1- to 4-word phrases are counted; phrases starting or ending with a common English stopword are skipped.
- Density = (occurrences × words in the phrase) ÷ total description words.
- "in name" means every word of the term also appears in the app name.

App Store search is generally understood to rely on the app name, subtitle and keyword field rather than the description, so read this as a messaging and readability check, not a ranking score.

`density.js` is a plain ES module shared by the CLI and the web demo, so you can import it in your own scripts.

## Going further

To see the searches an app actually appears in over time, [PeekPanda](https://peekpanda.com) keeps dated App Store search evidence for iOS apps. Its [keyword explorer docs](https://peekpanda.com/docs/keyword-explorer) explain how to read that evidence.

## Tests

```sh
npm test
```

## License

MIT
