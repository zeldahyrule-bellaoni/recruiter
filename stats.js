// recruit-ladies.js
module.exports = async function runStatsExtractor(page) {
  console.log("🚀 Starting Phase 1: Lady ID Extraction (No Club)");

  const startPage = 1;
  const endPage = 1;
  const tierId = 1;

  let allLadies = [];

  // Ensure logged-in session
  await page.goto('https://v3.g.ladypopular.com', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await page.waitForTimeout(4000);

  console.log(`🔍 Scanning pages ${startPage} → ${endPage}`);

  for (let currentPage = startPage; currentPage <= endPage; currentPage++) {
    console.log(`📄 Processing page ${currentPage}...`);

    try {
      const ladiesOnPage = await page.evaluate(async ({ currentPage, tierId }) => {
        const res = await fetch('/ajax/ranking/players.php', {
          method: 'POST',
          body: new URLSearchParams({
            action: 'getRanking',
            page: currentPage.toString(),
            tierId: tierId.toString()
          }),
          credentials: 'same-origin'
        });

        const data = await res.json();
        if (!data.html) return [];

        const container = document.createElement('div');
        container.innerHTML = data.html;

        const rows = container.querySelectorAll('tr');
        const results = [];

        rows.forEach(row => {
          const profileLink = row.querySelector('a[href*="profile.php?id="]');
          const guildCell = row.querySelector('.ranking-player-guild');

          if (!profileLink || !guildCell) return;

          // If guild cell contains a link → already in club
          if (guildCell.querySelector('a')) return;

          const idMatch = profileLink
            .getAttribute('href')
            .match(/id=(\d+)/);

          if (!idMatch) return;

          const nameEl = row.querySelector('.player-avatar-name');
          const name = nameEl ? nameEl.textContent.trim() : 'Unknown';

          results.push({
            ladyId: idMatch[1],
            name
          });
        });

        return results;
      }, { currentPage, tierId });

      console.log(`   🎯 Found ${ladiesOnPage.length} ladies without club`);
      allLadies.push(...ladiesOnPage);

    } catch (err) {
      console.log(`❌ Error on page ${currentPage}: ${err.message}`);
    }

    await page.waitForTimeout(2000);
  }

  console.log("✅ Phase 1 Complete");
  console.log(`👭 Total ladies without club: ${allLadies.length}`);
  console.log("📋 Sample output:");
  console.log(allLadies.slice(0, 5));
};
