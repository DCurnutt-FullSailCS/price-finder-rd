import { useState } from "react";
import consoleData from "./consoleData.json";

function App() {
  // User's search input
  const [query, setQuery] = useState("");

  // Combined results from BOTH the local JSON and the CheapShark API
  const [results, setResults] = useState([]);

  // Loading state while the online search is in progress
  const [loading, setLoading] = useState(false);

  // Error message for API failures
  const [error, setError] = useState(null);

  // Tracks whether a search has been run yet (controls "no results" message)
  const [searched, setSearched] = useState(false);

  // ---------------------------------------------------------
  // LOCAL JSON SEARCH
  // Returns the console entries whose name or alias matches the query.
  // ---------------------------------------------------------
  const searchLocal = (term) => {
    return consoleData.filter(item =>
      item.name.toLowerCase().includes(term) ||
      item.aliases.some(alias => alias.toLowerCase().includes(term))
    );
  };

  // ---------------------------------------------------------
  // CHEAPSHARK API SEARCH
  // Returns online game deals matching the query, or an empty
  // array if the request fails.
  // ---------------------------------------------------------
  const searchOnline = async (term) => {
    const response = await fetch(
      `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(term)}`
    );
    return await response.json();
  };

  // ---------------------------------------------------------
  // UNIFIED SEARCH
  // Runs the local console lookup and the online game lookup at the
  // same time, then merges both into a single results list so the
  // user sees everything from one search.
  // ---------------------------------------------------------
  const handleSearch = async () => {
    const term = query.trim().toLowerCase();
    if (!term) return; // ignore empty searches

    setLoading(true);
    setError(null);
    setResults([]);
    setSearched(true);

    // Local search is instant and can't fail.
    const localResults = searchLocal(term);

    // Online search can fail, so guard it. If it errors, we still
    // show the local results and report the online failure.
    let onlineResults = [];
    try {
      onlineResults = await searchOnline(term);
    } catch (err) {
      console.error("API Error:", err);
      setError("Online deals couldn't be loaded, showing local results only.");
    }

    // Merge: local console entries first, then online game deals.
    setResults([...localResults, ...onlineResults]);
    setLoading(false);
  };

  // Allow pressing Enter in the input to search.
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  return (
    <div style={{ padding: "20px" }}>
      <h1>Local Game &amp; Console Price Finder</h1>

      {/* Search Input */}
      <input
        type="text"
        placeholder="Search for a console or game..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{ padding: "8px", width: "250px", marginRight: "10px" }}
      />

      {/* Single unified search button */}
      <button onClick={handleSearch} style={{ padding: "8px 12px" }}>
        Search
      </button>

      {/* Loading Message */}
      {loading && (
        <p style={{ marginTop: "20px", fontStyle: "italic" }}>
          Searching for prices...
        </p>
      )}

      {/* Error Message (online failed, local still shown) */}
      {error && (
        <p style={{ color: "red", marginTop: "20px" }}>
          {error}
        </p>
      )}

      {/* No Results Message */}
      {!loading && searched && results.length === 0 && !error && (
        <p style={{ marginTop: "20px", fontStyle: "italic" }}>
          No results found.
        </p>
      )}

      {/* Results Header */}
      {results.length > 0 && (
        <h3 style={{ marginTop: "20px" }}>Results:</h3>
      )}

      {/* Results List */}
      <div style={{ marginTop: "10px" }}>
        {results.map((item, index) => (
          <div
            key={index}
            style={{
              marginBottom: "10px",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              maxWidth: "350px"
            }}
          >
            {/* Local JSON result (has a "retailer" field) */}
            {"retailer" in item ? (
              <>
                <strong>{item.name}</strong> — {item.retailer} — ${item.price}
              </>
            ) : (
              /* CheapShark API result (has "external" and "cheapest") */
              <>
                <strong>{item.external}</strong> — Cheapest: ${item.cheapest}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;