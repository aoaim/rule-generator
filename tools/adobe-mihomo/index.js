"use strict";

const { resolve, join } = require("path");
const fs = require("fs-extra");
const { execSync } = require("child_process");
const axios = require("axios");

// Output directory: ../../dist/mihomo
const distDir = resolve(__dirname, "..", "..", "dist", "mihomo");

const sources = [
    'https://raw.githubusercontent.com/Ruddernation-Designs/Adobe-URL-Block-List/master/hosts',
    'https://raw.githubusercontent.com/ignaciocastro/a-dove-is-dumb/main/list.txt',
];

// Helper to download text content
async function downloadList(url) {
    try {
        console.log(`Downloading ${url}...`);
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error(`Error downloading ${url}:`, error.message);
        return "";
    }
}

async function processHosts() {
    const allDomains = new Set();
    
    for (const url of sources) {
        const content = await downloadList(url);
        if (!content) continue;

        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            // Typical hosts format: 
            // 127.0.0.1 domain.com
            // 0.0.0.0 domain.com
            // ::1 domain.com
            
            // Remove inline comments
            const cleanLine = trimmed.split('#')[0].trim();
            if (!cleanLine) continue;

            const parts = cleanLine.split(/\s+/);
            
            // We expect at least an IP and a domain, or just a domain if it's a list
            // The reference implementation handles "0.0.0.0 domain" or just "domain"
            // Let's grab the last part as the domain, typical for hosts file format
            if (parts.length >= 1) {
                const domainCandidate = parts[parts.length - 1];
                
                // Basic validation
                if (domainCandidate === 'localhost' || domainCandidate === 'broadcasthost' || domainCandidate === '::1') continue;
                if (/^\d+\.\d+\.\d+\.\d+$/.test(domainCandidate)) continue; // Skip IPs

                // Normalize: remove trailing dot if present
                let domain = domainCandidate.replace(/\.$/, '').toLowerCase();
                
                // Add to set with "+." prefix for Tree wildcard matching
                if (domain) {
                    allDomains.add('+.' + domain);
                }
            }
        }
    }
    
    return Array.from(allDomains).sort();
}

async function outputRules(domains) {
    const baseName = "adobe-filter"; // Output: adobe-filter.txt
    
    const txtFileName = `${baseName}.txt`;
    const mrsFileName = `${baseName}.mrs`;
  
    const txtPath = join(distDir, txtFileName);
    const mrsPath = join(distDir, mrsFileName);

    console.log(`Writing ${txtFileName} (${domains.length} rules)...`);
    const writeStream = fs.createWriteStream(txtPath);
    
    for (const domain of domains) {
        writeStream.write(domain + "\n");
    }

    writeStream.end();
  
    await new Promise((resolve) => writeStream.on('finish', resolve));
    console.log(`Generated ${txtFileName}`);

    // Generate MRS using mihomo
    const mihomoBin = resolve(__dirname, "..", "..", "mihomo");
    try {
        console.log(`Converting to MRS: ${mrsFileName}...`);
        execSync(`"${mihomoBin}" convert-ruleset domain text "${txtPath}" "${mrsPath}"`, { stdio: 'inherit' });
        console.log(`Successfully generated ${mrsFileName}`);
    } catch (error) {
        console.error(`Failed to generate MRS:`, error.message);
    }
}

async function main() {
  await fs.ensureDir(distDir);
  
  // We don't wipe the directory here because hagezi-mihomo also writes to it.
  // We only overwrite our specific files if they accept overwrite by stream.
  
  try {
      const domains = await processHosts();
      await outputRules(domains);
  } catch (err) {
      console.error(`Error processing Adobe rules:`, err);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
