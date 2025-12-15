// recruit-ladies.js

module.exports = async function runStatsExtractor(page) {
  console.log("🏠 Starting Club Recruitment Script (Phase 1 + Phase 2)");

  // 🔧 MANUAL PAGE RANGE
  const startPage = 1;
  const endPage = 1;

  if (startPage < 1 || endPage < startPage) {
    console.log("❌ Invalid page range.");
    return;
  }

  // ✅ Lady Popular V3 endpoints
  const rankingAjaxUrl = 'https://v3.g.ladypopular.com/ajax/ranking/players.php';
  const inviteAjaxUrl  = 'https://v3.g.ladypopular.com/ajax/guilds.php';

  const inviteMessage =
    'Hello dear! 🌸 We’d be happy to welcome you to our club. ' +
    'We are friendly, flexible, and value every member equally. 💖';

  let totalLadiesFound = 0;
  let totalInvitesSent = 0;

  // Ensure logged-in session
  await page.goto('https://v3.g.ladypopular.com', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await page.waitForTimeout(5000);

  console.log(`🔍 Scanning ranking pages ${startPage} → ${endPage}`);

  for (let currentPage = startPage; currentPage <= endPage; currentPage++) {
    console.log(`📄 Processing page ${currentPage}`);

    let ladies = [];

    try {
      const response = await page.request.post(rankingAjaxUrl, {
        form: {
          type: 'getRanking',
          page: String(currentPage)
        }
      });

      if (!response.ok()) {
        console.log(`❌ Ranking HTTP error ${response.status()}`);
        continue;
      }

      const data = await response.json();

      if (!data.html) {
        console.log("❌ Ranking response missing HTML");
        continue;
      }

      // 🧠 Parse ranking HTML
      ladies = await page.evaluate(html => {
        const root = document.createElement('div');
        root.innerHTML = html;

        const rows = root.querySelectorAll('tbody tr');
        const results = [];

        rows.forEach(row => {
          const guildCell = row.querySelector('.ranking-player-guild');
          if (!guildCell || guildCell.children.length > 0) return;

          const link = row.querySelector('a[href*="profile.php?id="]');
          if (!link) return;

          const idMatch = link.href.match(/id=(\d+)/);
          if (!idMatch) return;

          const name =
            row.querySelector('.player-avatar-name')?.textContent.trim() ||
            'Unknown';

          const level =
            row.querySelector('.ranking-player-level')?.textContent.trim() ||
            '';

          results.push({
            ladyId: idMatch[1],
            name,
            level,
            profileUrl: link.href
          });
        });

        return results;
      }, data.html);

      totalLadiesFound += ladies.length;
      console.log(`🎯 Found ${ladies.length} ladies without a club`);

    } catch (err) {
      console.log(`❌ Error reading ranking page: ${err.message}`);
      continue;
    }

    // ==========================
    // 📩 PHASE 2 — SEND INVITES
    // ==========================
    for (const lady of ladies) {
      try {
        const inviteResponse = await page.request.post(inviteAjaxUrl, {
          form: {
            type: 'invite',
            player_id: lady.ladyId,
            message: inviteMessage
          }
        });

        const text = await inviteResponse.text();

        // Some LP endpoints return plain text, not JSON
        if (!text.startsWith('{')) {
          console.log(`❌ Invite failed for ${lady.name}: ${text.trim()}`);
          continue;
        }

        const result = JSON.parse(text);

        if (result.status === 1) {
          console.log(`✅ Invited ${lady.name} (Lv ${lady.level})`);
          totalInvitesSent++;
        } else {
          console.log(`❌ Invite rejected for ${lady.name}: ${result.message}`);
        }

        await page.waitForTimeout(2500); // cooldown

      } catch (err) {
        console.log(`❌ Network error inviting ${lady.name}: ${err.message}`);
      }
    }

    await page.waitForTimeout(3000);
  }

  console.log("\n🏁 Recruitment finished");
  console.log(`👭 Ladies found: ${totalLadiesFound}`);
  console.log(`📩 Invites sent: ${totalInvitesSent}`);
};
