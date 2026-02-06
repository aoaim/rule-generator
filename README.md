# Rule Generator

A toolkit for generating proxy rulesets for Surge, Sing-Box, and Mihomo (Clash Meta).

## Tools

| Tool | Output Path | Description |
| :--- | :--- | :--- |
| `adguard-singbox` | `dist/sing-box` | Converts AdGuard filters to Sing-Box `.srs` |
| `adguard-surge` | `dist/surge` | Converts AdGuard filters to Surge `.txt` |
| `adobe-mihomo` | `dist/mihomo` | Adobe blocklist to Mihomo `.mrs` |
| `adobe-surge` | `dist/surge` | Adobe blocklist to Surge `.txt` (adobe-verification.txt) |
| `hagezi-mihomo` | `dist/mihomo` | Hagezi filters to Mihomo `.mrs` |
| `hagezi-surge` | `dist/surge` | Hagezi filters to Surge `.txt` |

## Usage

Scripts are located in the `tools/` directory.

### Prerequisite

```bash
npm install
```

### Running a script

```bash
node tools/adguard-singbox/index.js
```

The output files will be generated in the `dist/` directory.

## GitHub Actions

This project is configured to run automatically via GitHub Actions.

## Acknowledgements

**[hagezi/dns-blocklists](https://github.com/hagezi/dns-blocklists)** is the greatest project I have ever seen. Long live Hagezi! This project relies heavily on Hagezi.
