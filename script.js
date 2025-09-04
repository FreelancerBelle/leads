// Allowed countries list
const allowedCountries = [
  "AU","AT","BE","BG","CA","HR","CY","CZ","DK","EE","FI","FR","DE",
  "GB","GR","HU","IE","IT","LV","LT","NL","NZ","NO","PL","PT","RO",
  "SK","SI","ZA","ES","SE","CH","US"
];

// Store results
let filteredLeads = [];

// Add keyword to the baby pink search history box
function addKeywordToHistory(keyword) {
  if (!keyword) return;
  const historyList = document.getElementById("keywordHistory");
  const li = document.createElement("li");
  li.textContent = keyword;
  historyList.appendChild(li);
}

async function searchLeads() {
  const apiKey = document.getElementById("apiKey").value.trim();
  const keyword = document.getElementById("keyword").value.trim();

  if (!apiKey || !keyword) {
    alert("Please enter both API Key and Keyword!");
    return;
  }

  // Add keyword to baby pink box
  addKeywordToHistory(keyword);

  filteredLeads = [];
  document.getElementById("results").innerHTML = "<p>Loading...</p>";
  document.getElementById("downloadBtn").style.display = "none";

  try {
    let allSearchItems = [];
    let pageToken = "";
    let fetchCount = 0;

    // Pagination: fetch up to 500 channels
    do {
      const searchResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(keyword)}&key=${apiKey}&maxResults=50&pageToken=${pageToken}`
      );
      const searchData = await searchResponse.json();

      if (searchData.error) {
        console.error("API Error:", searchData.error);
        alert("Error fetching data: " + searchData.error.message);
        return;
      }

      if (searchData.items) {
        allSearchItems = allSearchItems.concat(searchData.items);
      }

      pageToken = searchData.nextPageToken || "";
      fetchCount++;
    } while (pageToken && fetchCount < 10); // max 500 channels

    if (allSearchItems.length === 0) {
      document.getElementById("results").innerHTML = "<p>No channels found.</p>";
      return;
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Process channels in batches of 50
    for (let i = 0; i < allSearchItems.length; i += 50) {
      const batchIds = allSearchItems.slice(i, i + 50).map(item => item.snippet.channelId).join(",");
      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${batchIds}&key=${apiKey}`
      );
      const channelData = await channelResponse.json();
      if (!channelData.items) continue;

      for (let ch of channelData.items) {
        try {
          const title = ch.snippet.title;
          const subs = parseInt(ch.statistics.subscriberCount || 0, 10);
          const country = ch.snippet.country || "Not Specified";
          const channelLink = `https://www.youtube.com/channel/${ch.id}`;

          // Get last uploaded video
          const uploadsPlaylist = ch.contentDetails.relatedPlaylists.uploads;
          if (!uploadsPlaylist) continue;

          const playlistResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=1&playlistId=${uploadsPlaylist}&key=${apiKey}`
          );
          const playlistData = await playlistResponse.json();

          if (!playlistData.items || playlistData.items.length === 0) continue;

          const lastVideoDate = new Date(playlistData.items[0].contentDetails.videoPublishedAt);

          // Filter by your qualifications
          if (subs >= 1000 && lastVideoDate >= sixMonthsAgo && (allowedCountries.includes(country) || country === "Not Specified")) {
            filteredLeads.push({ title, subs, country, channelLink });
          }
        } catch (err) {
          console.error("Error processing channel:", err);
        }
      }
    }

    renderResults();

  } catch (err) {
    console.error("Error fetching data:", err);
    alert("Something went wrong while fetching data. Check console for details.");
  }
}

// Render results in the right-side table
function renderResults() {
  const resultsDiv = document.getElementById("results");

  if (filteredLeads.length === 0) {
    resultsDiv.innerHTML = "<p>No qualified leads found.</p>";
    document.getElementById("downloadBtn").style.display = "none";
    return;
  }

  let html = `<table>
    <tr>
      <th>Channel Name</th>
      <th>Subscribers</th>
      <th>Country</th>
      <th>Channel Link</th>
    </tr>`;

  filteredLeads.forEach(lead => {
    html += `<tr>
      <td>${lead.title}</td>
      <td>${lead.subs}</td>
      <td>${lead.country}</td>
      <td><a href="${lead.channelLink}" target="_blank">${lead.channelLink}</a></td>
    </tr>`;
  });

  html += `</table>`;
  resultsDiv.innerHTML = html;

  // Show Download button
  document.getElementById("downloadBtn").style.display = "block";
}

// Download results as CSV
function downloadExcel() {
  if (filteredLeads.length === 0) return;

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Channel Name,Subscribers,Country,Channel Link\n";
  filteredLeads.forEach(lead => {
    csvContent += `"${lead.title}",${lead.subs},${lead.country},${lead.channelLink}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "youtube_leads.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
