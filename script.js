let leads = []; // store results here

// Allowed countries (ISO 2-letter codes you gave me)
const allowedCountries = [
  "AU","AT","BE","BG","CA","HR","CY","CZ","DK","EE",
  "FI","FR","DE","GB","GR","HU","IE","IT","LV","LT",
  "NL","NZ","NO","PL","PT","RO","SK","SI","ZA","ES",
  "SE","CH","US"
];

async function searchLeads() {
  const apiKey = document.getElementById("apiKey").value;
  const keyword = document.getElementById("keyword").value;
  const resultsDiv = document.getElementById("results");
  leads = [];

  if (!apiKey || !keyword) {
    alert("Please enter both API key and keyword!");
    return;
  }

  resultsDiv.innerHTML = `<p>Searching YouTube for <b>${keyword}</b>...</p>`;

  try {
    // Step 1: Search YouTube for channels
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(keyword)}&key=${apiKey}&maxResults=20`
    );
    const searchData = await searchResponse.json();

    let channelIds = searchData.items.map(item => item.snippet.channelId).join(",");

    if (!channelIds) {
      resultsDiv.innerHTML = "<p>No channels found for this keyword.</p>";
      return;
    }

    // Step 2: Get channel statistics & details
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelIds}&key=${apiKey}`
    );
    const channelData = await channelResponse.json();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Step 3: Filter and store leads
    for (let ch of channelData.items) {
      const subs = parseInt(ch.statistics.subscriberCount || 0);
      const uploadsPlaylist = ch.contentDetails.relatedPlaylists.uploads;

      // Fetch latest video date
      const playlistResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=1&playlistId=${uploadsPlaylist}&key=${apiKey}`
      );
      const playlistData = await playlistResponse.json();

      let lastUploadDate = playlistData.items.length > 0 ? new Date(playlistData.items[0].contentDetails.videoPublishedAt) : null;

      // Qualification check
      if (subs >= 1000 && lastUploadDate && lastUploadDate >= sixMonthsAgo) {
        let country = ch.snippet.country || "";

        if (country === "") {
          country = "Not specified"; // include even without country
          leads.push({
            name: ch.snippet.title,
            subscribers: subs,
            country: country,
            link: `https://www.youtube.com/channel/${ch.id}`
          });
        } else if (allowedCountries.includes(country)) {
          leads.push({
            name: ch.snippet.title,
            subscribers: subs,
            country: country,
            link: `https://www.youtube.com/channel/${ch.id}`
          });
        }
      }
    }

    // Step 4: Show results
    if (leads.length > 0) {
      let table = `<table>
        <tr><th>Channel Name</th><th>Subscribers</th><th>Country</th><th>Channel Link</th></tr>`;
      leads.forEach(lead => {
        table += `<tr>
          <td>${lead.name}</td>
          <td>${lead.subscribers}</td>
          <td>${lead.country}</td>
          <td>${lead.link}</td> <!-- show full link -->
        </tr>`;
      });
      table += `</table>`;
      resultsDiv.innerHTML = table;
      document.getElementById("downloadBtn").style.display = "inline-block";
    } else {
      resultsDiv.innerHTML = "<p>No qualified leads found.</p>";
      document.getElementById("downloadBtn").style.display = "none";
    }

  } catch (error) {
    resultsDiv.innerHTML = `<p style="color:red;">Error fetching data: ${error.message}</p>`;
  }
}

// Export to Excel (CSV format)
function downloadExcel() {
  if (leads.length === 0) return;

  let csvContent = "data:text/csv;charset=utf-8," 
    + ["Channel Name,Subscribers,Country,Channel Link"]
    + "\n"
    + leads.map(l => `${l.name},${l.subscribers},${l.country},${l.link}`).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "youtube_leads.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
