# Rule Generator

A toolkit for generating proxy rulesets for Surge, Sing-Box, and Mihomo (Clash Meta).

## Tools

| Tool | Output Path | Description |
| :--- | :--- | :--- |
| `adguard-mihomo` | `dist/mihomo` | Converts AdGuard Tracking Protection filter to Mihomo `.txt` / `.mrs` |
| `adguard-singbox` | `dist/sing-box` | Converts AdGuard filters to Sing-Box `.srs` |
| `adguard-surge` | `dist/surge` | Converts AdGuard filters to Surge `.txt` |
| `adobe-mihomo` | `dist/mihomo` | Adobe blocklist to Mihomo `.txt` / `.mrs` |
| `adobe-surge` | `dist/surge` | Adobe blocklist to Surge `.txt` |
| `gfwlist-surge` | `dist/surge` | GFWList to Surge DOMAIN-SET `.txt` |
| `hagezi-mihomo` | `dist/mihomo` | Hagezi filters to Mihomo `.txt` / `.mrs` |
| `hagezi-surge` | `dist/surge` | Hagezi filters to Surge `.txt` |
| `urlhaus-mihomo` | `dist/mihomo` | URLhaus malicious URL blocklist to Mihomo `.txt` / `.mrs` |
| `urlhaus-singbox` | `dist/sing-box` | URLhaus malicious URL blocklist to Sing-Box `.srs` |
| `urlhaus-surge` | `dist/surge` | URLhaus malicious URL blocklist to Surge `.txt` |

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

This project is configured to run automatically via GitHub Actions:
- **Schedule**: Every 2 days at 00:00 UTC.
- **Triggers**: Also runs on push to `main` branch (when relevant files are changed) or manual dispatch.

## Acknowledgements

**[hagezi/dns-blocklists](https://github.com/hagezi/dns-blocklists)** is the greatest project I have ever seen. Long live Hagezi! This project relies heavily on Hagezi.

**[malware-filter/urlhaus-filter](https://gitlab.com/malware-filter/urlhaus-filter)** provides the malicious URL blocklist based on Abuse.ch [URLhaus](https://urlhaus.abuse.ch/), licensed under CC0 & MIT.
